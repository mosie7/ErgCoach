import { prisma } from '@ergcoach/database';
import { generateWeeklyNarrative } from '@ergcoach/ai-coach';
import { calculateWeeklyVolume } from '@ergcoach/training-engine';
import { formatDistance, formatDuration } from '@ergcoach/shared';

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export async function generateWeeklyReview(athleteId: string, referenceDate = new Date()) {
  const weekStart = startOfUtcWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const [workouts, plan, goal] = await Promise.all([
    prisma.workout.findMany({
      where: {
        athleteId,
        startedAt: { gte: weekStart, lt: weekEnd },
      },
      include: { analysis: true, subjectiveFeedback: true },
      orderBy: { startedAt: 'asc' },
    }),
    prisma.trainingPlan.findFirst({
      where: { athleteId },
      include: {
        plannedWorkouts: {
          where: { scheduledDate: { gte: weekStart, lt: weekEnd } },
        },
      },
      orderBy: { startDate: 'desc' },
    }),
    prisma.goal.findFirst({ where: { athleteId, status: 'active' } }),
  ]);

  const volume = calculateWeeklyVolume(
    workouts.map((w) => ({
      startedAt: w.startedAt,
      distanceMeters: w.distanceMeters,
      durationSeconds: w.durationSeconds,
      workoutType: w.workoutType,
    })),
    referenceDate,
  );

  const plannedCount = plan?.plannedWorkouts.length ?? 0;
  const completedCount = workouts.length;
  const missed = Math.max(0, plannedCount - completedCount);

  const plannedMeters =
    plan?.plannedWorkouts.reduce((s, p) => s + (p.targetDistanceMeters ?? 0), 0) ?? 0;

  const strongest = [...workouts].sort((a, b) => {
    const sa = (a.analysis?.aiAnalysis as { sessionVerdict?: string } | null)?.sessionVerdict;
    const rank = (v?: string) =>
      v === 'excellent' ? 4 : v === 'successful' ? 3 : v === 'partial' ? 2 : 1;
    return rank(sa) - rank((b.analysis?.aiAnalysis as { sessionVerdict?: string } | null)?.sessionVerdict);
  })[workouts.length - 1];

  const positiveSignals = workouts.flatMap((w) => {
    const ai = w.analysis?.aiAnalysis as { positiveSignals?: string[] } | null;
    return ai?.positiveSignals ?? [];
  });
  const concerns = workouts.flatMap((w) => {
    const ai = w.analysis?.aiAnalysis as { concerns?: string[] } | null;
    return ai?.concerns ?? [];
  });

  const deterministicSummary = {
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
    sessionsCompleted: completedCount,
    sessionsMissed: missed,
    plannedMeters,
    actualMeters: volume.totalMeters,
    durationSeconds: volume.totalDurationSeconds,
    intensityBreakdown: volume.intensityBreakdown,
    strongestWorkout: strongest?.title ?? strongest?.id ?? 'n/a',
    biggestPositiveSignal: positiveSignals[0] ?? 'Steady training consistency',
    potentialConcern: concerns[0] ?? (missed > 0 ? `${missed} planned sessions missed` : 'None flagged'),
    progressTowardGoal: goal
      ? `Active goal ${goal.eventType} @ target pace ${goal.targetPaceSeconds500m}s/500m`
      : 'No active goal',
    recommendedEmphasis: [
      'Protect UT2 quality and long-row durability',
      missed > 0 ? 'Rebuild adherence before adding intensity' : 'Keep one quality UT1 or AT stimulus',
    ],
    humanReadable: {
      metres: formatDistance(volume.totalMeters),
      duration: formatDuration(volume.totalDurationSeconds),
    },
  };

  const { narrative, modelVersion } = await generateWeeklyNarrative(deterministicSummary);

  const saved = await prisma.weeklyReview.upsert({
    where: {
      athleteId_weekStart: { athleteId, weekStart },
    },
    create: {
      athleteId,
      weekStart,
      weekEnd,
      summary: { ...deterministicSummary, narrative, modelVersion } as object,
      aiNarrative: narrative.narrative,
    },
    update: {
      weekEnd,
      summary: { ...deterministicSummary, narrative, modelVersion } as object,
      aiNarrative: narrative.narrative,
    },
  });

  return saved;
}
