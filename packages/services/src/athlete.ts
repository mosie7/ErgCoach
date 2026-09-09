import { prisma } from '@ergcoach/database';
import {
  calculateHeartRateDrift,
  calculateRollingVolume,
  calculateWeeklyVolume,
  detectProgressionTrend,
  estimateMarathonReadiness,
} from '@ergcoach/training-engine';
import { formatPace } from '@ergcoach/shared';

export async function getAthleteProfile(athleteId: string) {
  return prisma.athleteProfile.findUniqueOrThrow({
    where: { id: athleteId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      hrZones: { orderBy: { zoneIndex: 'asc' } },
    },
  });
}

export async function getAthleteByUserId(userId: string) {
  return prisma.athleteProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, email: true, displayName: true } },
      hrZones: { orderBy: { zoneIndex: 'asc' } },
      goals: { where: { status: 'active' }, take: 1 },
    },
  });
}

export async function getActiveGoal(athleteId: string) {
  return prisma.goal.findFirst({
    where: { athleteId, status: 'active' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTrainingPlan(athleteId: string) {
  return prisma.trainingPlan.findFirst({
    where: { athleteId },
    orderBy: { startDate: 'desc' },
    include: {
      plannedWorkouts: { orderBy: { scheduledDate: 'asc' } },
      goal: true,
    },
  });
}

export async function getRecentWorkouts(athleteId: string, limit = 20) {
  return prisma.workout.findMany({
    where: { athleteId },
    orderBy: { startedAt: 'desc' },
    take: limit,
    include: {
      analysis: true,
      subjectiveFeedback: true,
    },
  });
}

export async function getWorkout(workoutId: string) {
  return prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      splits: { orderBy: { index: 'asc' } },
      subjectiveFeedback: true,
      analysis: true,
      plannedWorkout: true,
    },
  });
}

export async function getLatestWorkout(athleteId: string) {
  return prisma.workout.findFirst({
    where: { athleteId },
    orderBy: { startedAt: 'desc' },
    include: {
      splits: { orderBy: { index: 'asc' } },
      analysis: true,
      subjectiveFeedback: true,
    },
  });
}

export async function getDashboardData(athleteId: string) {
  const [athlete, goal, plan, workouts, readiness] = await Promise.all([
    getAthleteProfile(athleteId),
    getActiveGoal(athleteId),
    getTrainingPlan(athleteId),
    getRecentWorkouts(athleteId, 50),
    assessGoalReadiness(athleteId),
  ]);

  const volumeWorkouts = workouts.map((w) => ({
    startedAt: w.startedAt,
    distanceMeters: w.distanceMeters,
    durationSeconds: w.durationSeconds,
    workoutType: w.workoutType,
  }));

  const thisWeek = calculateWeeklyVolume(volumeWorkouts);
  const rolling28 = calculateRollingVolume(volumeWorkouts, 28);
  const trends = await getProgressTrends(athleteId);

  return {
    athlete,
    goal,
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          startDate: plan.startDate,
          endDate: plan.endDate,
        }
      : null,
    thisWeek,
    rolling28,
    recentWorkouts: workouts.slice(0, 8),
    readiness,
    trends,
    projection: readiness.estimatedPaceRangeSeconds500m
      ? {
          estimatedPaceRange: {
            low: readiness.estimatedPaceRangeSeconds500m.low,
            high: readiness.estimatedPaceRangeSeconds500m.high,
            lowFormatted: formatPace(readiness.estimatedPaceRangeSeconds500m.low),
            highFormatted: formatPace(readiness.estimatedPaceRangeSeconds500m.high),
          },
          targetPace: goal?.targetPaceSeconds500m ?? null,
          targetPaceFormatted: formatPace(goal?.targetPaceSeconds500m),
          confidence: readiness.confidence,
          primaryLimiter: readiness.primaryLimiter,
          evidenceNeeded: readiness.missingEvidence,
        }
      : null,
  };
}

export async function getProgressTrends(athleteId: string) {
  const workouts = await prisma.workout.findMany({
    where: { athleteId, sport: 'rower' },
    orderBy: { startedAt: 'asc' },
    include: { splits: { orderBy: { index: 'asc' } } },
  });

  const ut2 = workouts.filter((w) => w.workoutType === 'UT2' && w.averagePaceSeconds500m);
  const ut1 = workouts.filter((w) => w.workoutType === 'UT1' && w.averagePaceSeconds500m);
  const benchmarks = workouts.filter(
    (w) => w.workoutType === 'benchmark' && w.averagePaceSeconds500m,
  );
  const longRows = workouts.filter((w) => w.distanceMeters >= 16000 && w.averagePaceSeconds500m);

  return {
    ut2Efficiency: detectProgressionTrend(
      ut2.map((w) => ({ date: w.startedAt, value: w.averagePaceSeconds500m! })),
      { lowerIsBetter: true, label: 'UT2 pace' },
    ),
    ut1Efficiency: detectProgressionTrend(
      ut1.map((w) => ({ date: w.startedAt, value: w.averagePaceSeconds500m! })),
      { lowerIsBetter: true, label: 'UT1 pace' },
    ),
    benchmarkTrend: detectProgressionTrend(
      benchmarks.map((w) => ({ date: w.startedAt, value: w.averagePaceSeconds500m! })),
      { lowerIsBetter: true, label: '5k benchmark pace' },
    ),
    longRowDurability: detectProgressionTrend(
      longRows.map((w) => {
        const hrs = w.splits
          .map((s) => s.heartRate)
          .filter((h): h is number => h != null);
        return {
          date: w.startedAt,
          value: calculateHeartRateDrift(hrs) ?? 10,
        };
      }),
      { lowerIsBetter: true, label: 'long-row HR drift' },
    ),
  };
}

export async function assessGoalReadiness(athleteId: string) {
  const goal = await getActiveGoal(athleteId);
  const workouts = await prisma.workout.findMany({
    where: { athleteId },
    orderBy: { startedAt: 'asc' },
    include: { splits: { orderBy: { index: 'asc' } } },
  });
  const plan = await getTrainingPlan(athleteId);

  const targetPace = goal?.targetPaceSeconds500m ?? 120;
  const longRows = workouts.filter((w) => w.distanceMeters >= 16000);
  const ut1 = workouts.filter((w) => w.workoutType === 'UT1');
  const ut2 = workouts.filter((w) => w.workoutType === 'UT2');
  const benchmark = [...workouts].reverse().find((w) => w.workoutType === 'benchmark');

  const longRowHrDrifts = longRows.map((w) => {
    const hrs = w.splits.map((s) => s.heartRate).filter((h): h is number => h != null);
    return calculateHeartRateDrift(hrs);
  }).filter((d): d is number => d != null);

  const now = new Date();
  const day14 = new Date(now.getTime() - 14 * 86400000);
  const plannedLast14 =
    plan?.plannedWorkouts.filter((p) => p.scheduledDate >= day14 && p.scheduledDate <= now)
      .length ?? 0;
  const completedLast14 = workouts.filter((w) => w.startedAt >= day14).length;

  // Rough weeks with any volume
  const weekKeys = new Set(
    workouts.map((w) => {
      const d = new Date(w.startedAt);
      return `${d.getUTCFullYear()}-W${Math.ceil(d.getUTCDate() / 7)}-${d.getUTCMonth()}`;
    }),
  );

  return estimateMarathonReadiness({
    targetPaceSeconds500m: targetPace,
    longRowPaces: longRows
      .map((w) => w.averagePaceSeconds500m)
      .filter((p): p is number => p != null),
    longRowHrDrifts,
    ut1Paces: ut1.map((w) => w.averagePaceSeconds500m).filter((p): p is number => p != null),
    ut1AvgHrs: ut1.map((w) => w.averageHeartRate).filter((h): h is number => h != null),
    ut2Paces: ut2.map((w) => w.averagePaceSeconds500m).filter((p): p is number => p != null),
    ut2AvgHrs: ut2.map((w) => w.averageHeartRate).filter((h): h is number => h != null),
    benchmark5kPace: benchmark?.averagePaceSeconds500m ?? null,
    weeksWithConsistentVolume: weekKeys.size,
    plannedSessionsLast14Days: plannedLast14 || completedLast14,
    completedSessionsLast14Days: completedLast14,
    recentLongRowDistanceMax: longRows.reduce((m, w) => Math.max(m, w.distanceMeters), 0),
  });
}

export async function getComparableWorkouts(workoutId: string, limit = 5) {
  const workout = await getWorkout(workoutId);
  if (!workout) return [];
  const { findBlockAwareComparables } = await import('./training-context.js');
  return findBlockAwareComparables(workoutId, workout.athleteId, limit);
}
