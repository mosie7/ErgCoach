import { prisma } from '@ergcoach/database';
import { generateWorkoutAnalysis } from '@ergcoach/ai-coach';
import { buildWorkoutAnalysisContext, ensureWorkoutBlockAssociation } from './ai-context.js';
import { updateCoachStateFromWorkoutAnalysis } from './coach-state.js';

export async function runPostWorkoutAnalysis(workoutId: string) {
  await ensureWorkoutBlockAssociation(workoutId);

  const { workout, metrics, evidence, userId, athleteId } =
    await buildWorkoutAnalysisContext(workoutId);

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      detectedClassification: metrics.detectedClassification,
      averagePaceSeconds500m: workout.averagePaceSeconds500m ?? metrics.averagePaceSeconds500m,
      averageWatts: workout.averageWatts ?? metrics.averageWatts,
    },
  });

  const { hasEntitlement } = await import('@ergcoach/billing');
  const canUseAi = await hasEntitlement(userId, 'ai_workout_analysis');

  if (!canUseAi) {
    return prisma.workoutAnalysis.upsert({
      where: { workoutId: workout.id },
      create: {
        workoutId: workout.id,
        calculatedMetrics: {
          ...(metrics as object),
          whyEvidence: evidence.whyEvidence,
          trainingBlock: evidence.trainingBlock,
        },
        aiAnalysis: {
          summary:
            'Deterministic metrics calculated in current training-block context. Upgrade to Pro Coach for AI interpretation.',
          sessionVerdict: 'unknown',
          whatWasAchieved: ['Objective metrics saved for this workout.'],
          executionAnalysis: [
            metrics.complianceScore != null
              ? `Compliance score ${metrics.complianceScore}% (calculated locally).`
              : 'No planned workout linked.',
          ],
          positiveSignals: [],
          concerns: ['AI coaching report locked — Pro subscription required.'],
          goalImpact: 'Metrics are available; AI goal commentary requires Pro.',
          progressAssessment: 'See Current Training Block on the dashboard for non-AI trends.',
          nextFocus: ['Upgrade to Pro Coach to unlock AI session reviews.'],
          confidence: 'low',
          evidence: ['ai_workout_analysis entitlement missing'],
        },
        classification: metrics.detectedClassification,
        confidence: 'low',
        sessionVerdict: 'unknown',
        modelVersion: 'metrics-only',
      },
      update: {
        calculatedMetrics: {
          ...(metrics as object),
          whyEvidence: evidence.whyEvidence,
          trainingBlock: evidence.trainingBlock,
        },
        classification: metrics.detectedClassification,
        generatedAt: new Date(),
      },
    });
  }

  const { analysis, modelVersion } = await generateWorkoutAnalysis(evidence);

  const saved = await prisma.workoutAnalysis.upsert({
    where: { workoutId: workout.id },
    create: {
      workoutId: workout.id,
      calculatedMetrics: {
        ...(metrics as object),
        whyEvidence: evidence.whyEvidence,
        trainingBlock: evidence.trainingBlock,
        currentWeek: evidence.currentWeek,
      },
      aiAnalysis: analysis as object,
      classification: metrics.detectedClassification,
      confidence: analysis.confidence,
      sessionVerdict: analysis.sessionVerdict,
      modelVersion,
    },
    update: {
      calculatedMetrics: {
        ...(metrics as object),
        whyEvidence: evidence.whyEvidence,
        trainingBlock: evidence.trainingBlock,
        currentWeek: evidence.currentWeek,
      },
      aiAnalysis: analysis as object,
      classification: metrics.detectedClassification,
      confidence: analysis.confidence,
      sessionVerdict: analysis.sessionVerdict,
      modelVersion,
      generatedAt: new Date(),
    },
  });

  await updateCoachStateFromWorkoutAnalysis({
    athleteId,
    workout: {
      id: workout.id,
      title: workout.title,
      workoutType: workout.workoutType,
      averagePaceSeconds500m: workout.averagePaceSeconds500m ?? metrics.averagePaceSeconds500m,
      averageHeartRate: workout.averageHeartRate,
      distanceMeters: workout.distanceMeters,
    },
    whyEvidence: (evidence.whyEvidence as Array<{
      tier: string;
      deltas?: {
        paceSecondsFaster?: number | null;
        hrDelta?: number | null;
        interpretation?: string;
      };
      previous?: { paceFormatted?: string | null; hr?: number | null } | null;
    }>) ?? [],
    metrics: {
      heartRateDriftPercent: metrics.heartRateDriftPercent,
      detectedClassification: metrics.detectedClassification,
    },
    blockName: evidence.trainingBlock
      ? (evidence.trainingBlock as { name?: string }).name
      : null,
    activeTrainingBlockId: workout.trainingBlockId,
  });

  return saved;
}
