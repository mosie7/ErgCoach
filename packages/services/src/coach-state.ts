import { prisma, Prisma } from '@ergcoach/database';
import { formatPace } from '@ergcoach/shared';

export interface CoachStatePatch {
  currentFitnessSummary?: string | null;
  strengths?: string[];
  currentLimiters?: string[];
  recentProgressSignals?: string[];
  currentConcerns?: string[];
  goalAssessment?: Record<string, unknown> | null;
  activeTrainingBlockId?: string | null;
}

function mergeUnique(existing: unknown, incoming: string[] | undefined, limit = 8): string[] {
  const base = Array.isArray(existing) ? existing.map(String) : [];
  if (!incoming?.length) return base.slice(0, limit);
  const merged = [...incoming, ...base.filter((x) => !incoming.includes(x))];
  return merged.slice(0, limit);
}

export async function getCoachState(athleteId: string) {
  return prisma.athleteCoachState.findUnique({ where: { athleteId } });
}

export async function upsertCoachState(athleteId: string, patch: CoachStatePatch) {
  const existing = await prisma.athleteCoachState.findUnique({ where: { athleteId } });

  const goalAssessment =
    patch.goalAssessment !== undefined
      ? patch.goalAssessment === null
        ? Prisma.JsonNull
        : (patch.goalAssessment as Prisma.InputJsonValue)
      : existing?.goalAssessment != null
        ? (existing.goalAssessment as Prisma.InputJsonValue)
        : undefined;

  const data = {
    activeTrainingBlockId:
      patch.activeTrainingBlockId !== undefined
        ? patch.activeTrainingBlockId
        : existing?.activeTrainingBlockId ?? null,
    currentFitnessSummary:
      patch.currentFitnessSummary !== undefined
        ? patch.currentFitnessSummary
        : existing?.currentFitnessSummary ?? null,
    strengths: mergeUnique(existing?.strengths, patch.strengths),
    currentLimiters: mergeUnique(existing?.currentLimiters, patch.currentLimiters),
    recentProgressSignals: mergeUnique(
      existing?.recentProgressSignals,
      patch.recentProgressSignals,
      10,
    ),
    currentConcerns: mergeUnique(existing?.currentConcerns, patch.currentConcerns),
    ...(goalAssessment !== undefined ? { goalAssessment } : {}),
    lastUpdatedAt: new Date(),
  };

  return prisma.athleteCoachState.upsert({
    where: { athleteId },
    create: { athleteId, ...data },
    update: data,
  });
}

/**
 * Derive coaching memory updates from a completed workout analysis.
 */
export async function updateCoachStateFromWorkoutAnalysis(input: {
  athleteId: string;
  workout: {
    id: string;
    title: string | null;
    workoutType: string;
    averagePaceSeconds500m: number | null;
    averageHeartRate: number | null;
    distanceMeters: number;
  };
  whyEvidence: Array<{
    tier: string;
    deltas?: {
      paceSecondsFaster?: number | null;
      hrDelta?: number | null;
      interpretation?: string;
    };
    previous?: { paceFormatted?: string | null; hr?: number | null } | null;
  }>;
  metrics: {
    heartRateDriftPercent?: number | null;
    detectedClassification?: string;
  };
  blockName?: string | null;
  activeTrainingBlockId?: string | null;
}) {
  const signals: string[] = [];
  const concerns: string[] = [];
  const strengths: string[] = [];
  const type = input.metrics.detectedClassification ?? input.workout.workoutType;

  const top = input.whyEvidence[0];
  if (top?.deltas?.interpretation === 'faster_pace_similar_hr') {
    signals.push(
      `${type}: ${formatPace(input.workout.averagePaceSeconds500m)} at ~${input.workout.averageHeartRate ?? '—'} bpm — faster than prior comparable at similar HR`,
    );
    strengths.push(`improving ${type} efficiency`);
  } else if (top?.deltas?.interpretation === 'faster_pace_lower_hr') {
    signals.push(
      `${type}: faster pace with lower HR vs prior comparable — strong aerobic efficiency signal`,
    );
    strengths.push(`improving ${type} efficiency`);
  }

  if (input.metrics.heartRateDriftPercent != null) {
    if (input.metrics.heartRateDriftPercent <= 4) {
      signals.push(`HR drift ${input.metrics.heartRateDriftPercent.toFixed(1)}% — controlled`);
    } else if (input.metrics.heartRateDriftPercent > 8) {
      concerns.push(
        `Elevated HR drift (${input.metrics.heartRateDriftPercent.toFixed(1)}%) on latest ${type}`,
      );
    }
  }

  if (input.workout.distanceMeters >= 20000) {
    strengths.push('completing substantial long rows');
  }

  return upsertCoachState(input.athleteId, {
    activeTrainingBlockId: input.activeTrainingBlockId,
    recentProgressSignals: signals,
    currentConcerns: concerns,
    strengths,
    currentFitnessSummary: input.blockName
      ? `Training in ${input.blockName}; latest ${type} ${formatPace(input.workout.averagePaceSeconds500m)}`
      : `Latest ${type} ${formatPace(input.workout.averagePaceSeconds500m)}`,
  });
}
