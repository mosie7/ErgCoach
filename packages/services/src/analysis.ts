import { prisma } from '@ergcoach/database';
import { analyzeWorkoutMetrics } from '@ergcoach/training-engine';
import { generateWorkoutAnalysis } from '@ergcoach/ai-coach';
import { compareEquivalentSessions } from '@ergcoach/training-engine';
import { calculateWeeklyVolume } from '@ergcoach/training-engine';

export async function runPostWorkoutAnalysis(workoutId: string) {
  const workout = await prisma.workout.findUniqueOrThrow({
    where: { id: workoutId },
    include: {
      splits: { orderBy: { index: 'asc' } },
      subjectiveFeedback: true,
      plannedWorkout: true,
      athlete: {
        include: {
          hrZones: { orderBy: { zoneIndex: 'asc' } },
          goals: { where: { status: 'active' }, take: 1 },
          workouts: {
            orderBy: { startedAt: 'desc' },
            take: 40,
            include: { splits: false },
          },
        },
      },
    },
  });

  const athlete = workout.athlete;
  const goal = athlete.goals[0] ?? null;
  const metrics = analyzeWorkoutMetrics({
    distanceMeters: workout.distanceMeters,
    durationSeconds: workout.durationSeconds,
    averagePaceSeconds500m: workout.averagePaceSeconds500m,
    averageWatts: workout.averageWatts,
    averageHeartRate: workout.averageHeartRate,
    maxHeartRate: workout.maxHeartRate,
    averageStrokeRate: workout.averageStrokeRate,
    splits: workout.splits,
    planned: workout.plannedWorkout,
    title: workout.title,
    plannedType: workout.plannedWorkout?.workoutType ?? workout.workoutType,
    lthr: athlete.lactateThresholdHeartRate,
    maxHr: athlete.maxHeartRate,
    hrZones: athlete.hrZones.map((z) => ({
      name: z.name,
      zoneIndex: z.zoneIndex,
      minBpm: z.minBpm,
      maxBpm: z.maxBpm,
    })),
  });

  await prisma.workout.update({
    where: { id: workout.id },
    data: {
      detectedClassification: metrics.detectedClassification,
      averagePaceSeconds500m: workout.averagePaceSeconds500m ?? metrics.averagePaceSeconds500m,
      averageWatts: workout.averageWatts ?? metrics.averageWatts,
    },
  });

  const comparable = compareEquivalentSessions(
    {
      id: workout.id,
      workoutType: metrics.detectedClassification,
      durationSeconds: workout.durationSeconds,
      distanceMeters: workout.distanceMeters,
      averageStrokeRate: workout.averageStrokeRate,
      averageHeartRate: workout.averageHeartRate,
      averagePaceSeconds500m: workout.averagePaceSeconds500m,
      intervalStructure: inferIntervalStructure(workout.title),
    },
    athlete.workouts.map((w) => ({
      id: w.id,
      workoutType: w.detectedClassification ?? w.workoutType,
      durationSeconds: w.durationSeconds,
      distanceMeters: w.distanceMeters,
      averageStrokeRate: w.averageStrokeRate,
      averageHeartRate: w.averageHeartRate,
      averagePaceSeconds500m: w.averagePaceSeconds500m,
      intervalStructure: inferIntervalStructure(w.title),
    })),
    5,
  );

  const comparableDetails = await prisma.workout.findMany({
    where: { id: { in: comparable.map((c) => c.workoutId) } },
    select: {
      id: true,
      title: true,
      startedAt: true,
      workoutType: true,
      distanceMeters: true,
      durationSeconds: true,
      averagePaceSeconds500m: true,
      averageHeartRate: true,
      averageStrokeRate: true,
    },
  });

  const week = calculateWeeklyVolume(
    athlete.workouts.map((w) => ({
      startedAt: w.startedAt,
      distanceMeters: w.distanceMeters,
      durationSeconds: w.durationSeconds,
      workoutType: w.workoutType,
    })),
    workout.startedAt,
  );

  const evidence = {
    athlete: {
      age: athlete.age,
      weightKg: athlete.weightKg,
      maxHeartRate: athlete.maxHeartRate,
      lactateThresholdHeartRate: athlete.lactateThresholdHeartRate,
      hrZoneMethod: athlete.hrZoneMethod,
    },
    goal: goal
      ? {
          sport: goal.sport,
          eventType: goal.eventType,
          targetDate: goal.targetDate,
          targetPaceSeconds500m: goal.targetPaceSeconds500m,
          targetTimeSeconds: goal.targetTimeSeconds,
        }
      : null,
    plannedWorkout: workout.plannedWorkout as unknown as Record<string, unknown> | null,
    workout: {
      id: workout.id,
      title: workout.title,
      startedAt: workout.startedAt,
      workoutType: workout.workoutType,
      distanceMeters: workout.distanceMeters,
      durationSeconds: workout.durationSeconds,
      averagePaceSeconds500m: workout.averagePaceSeconds500m,
      averageHeartRate: workout.averageHeartRate,
      maxHeartRate: workout.maxHeartRate,
      averageStrokeRate: workout.averageStrokeRate,
    },
    calculatedMetrics: metrics as unknown as Record<string, unknown>,
    comparableWorkouts: comparable.map((c) => ({
      ...c,
      workout: comparableDetails.find((d) => d.id === c.workoutId) ?? null,
    })) as unknown as Record<string, unknown>[],
    recentContext: {
      weeklyVolume: week,
      sessionsLast14Days: athlete.workouts.filter(
        (w) => w.startedAt >= new Date(workout.startedAt.getTime() - 14 * 86400000),
      ).length,
    },
    subjectiveFeedback: workout.subjectiveFeedback as unknown as Record<string, unknown> | null,
  };

  const { analysis, modelVersion } = await generateWorkoutAnalysis(evidence);

  return prisma.workoutAnalysis.upsert({
    where: { workoutId: workout.id },
    create: {
      workoutId: workout.id,
      calculatedMetrics: metrics as object,
      aiAnalysis: analysis as object,
      classification: metrics.detectedClassification,
      confidence: analysis.confidence,
      sessionVerdict: analysis.sessionVerdict,
      modelVersion,
    },
    update: {
      calculatedMetrics: metrics as object,
      aiAnalysis: analysis as object,
      classification: metrics.detectedClassification,
      confidence: analysis.confidence,
      sessionVerdict: analysis.sessionVerdict,
      modelVersion,
      generatedAt: new Date(),
    },
  });
}

function inferIntervalStructure(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = title.match(/(\d+)\s*[x×]\s*(\d+\s*min)/i);
  if (m) return `${m[1]}x${m[2]!.replace(/\s+/g, '')}`;
  return null;
}
