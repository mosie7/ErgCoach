import { prisma } from '@ergcoach/database';
import {
  calculateWeeklyVolume,
  calculateRollingVolume,
  compareEquivalentSessions,
  detectProgressionTrend,
  estimateMarathonReadiness,
} from '@ergcoach/training-engine';
import { formatPace } from '@ergcoach/shared';
import {
  computeBlockWeek,
  getActiveTrainingBlock,
} from './blocks.js';
import { getAthleteProfile, getActiveGoal, getTrainingPlan } from './athlete.js';

function inferIntervalStructure(title: string | null | undefined): string | null {
  if (!title) return null;
  const m = title.match(/(\d+)\s*[x×]\s*(\d+\s*min)/i);
  if (m) return `${m[1]}x${m[2]!.replace(/\s+/g, '')}`;
  return null;
}

export { inferIntervalStructure };

/**
 * Structured current training context — never dumps lifetime history.
 */
export async function getCurrentTrainingContext(athleteId: string) {
  const [athlete, activeGoal, activeBlock, plan, coachState] = await Promise.all([
    getAthleteProfile(athleteId),
    getActiveGoal(athleteId),
    getActiveTrainingBlock(athleteId),
    getTrainingPlan(athleteId),
    prisma.athleteCoachState.findUnique({ where: { athleteId } }),
  ]);

  const blockWorkouts = activeBlock
    ? await prisma.workout.findMany({
        where: {
          athleteId,
          trainingBlockId: activeBlock.id,
          excludeFromAnalysis: false,
        },
        orderBy: { startedAt: 'asc' },
        select: {
          id: true,
          startedAt: true,
          title: true,
          workoutType: true,
          detectedClassification: true,
          distanceMeters: true,
          durationSeconds: true,
          averagePaceSeconds500m: true,
          averageHeartRate: true,
          averageStrokeRate: true,
          trainingBlockId: true,
        },
      })
    : [];

  const recentWorkouts = await prisma.workout.findMany({
    where: { athleteId, excludeFromAnalysis: false },
    orderBy: { startedAt: 'desc' },
    take: 12,
    select: {
      id: true,
      startedAt: true,
      title: true,
      workoutType: true,
      detectedClassification: true,
      distanceMeters: true,
      durationSeconds: true,
      averagePaceSeconds500m: true,
      averageHeartRate: true,
      averageStrokeRate: true,
      trainingBlockId: true,
    },
  });

  // Lifetime PBs / benchmarks only (relevant historical)
  const benchmarks = await prisma.workout.findMany({
    where: {
      athleteId,
      excludeFromAnalysis: false,
      OR: [
        { workoutType: { in: ['benchmark', 'race'] } },
        { detectedClassification: { in: ['benchmark', 'race'] } },
        { title: { contains: '2k', mode: 'insensitive' } },
        { title: { contains: '2000', mode: 'insensitive' } },
        { title: { contains: '5k', mode: 'insensitive' } },
        { title: { contains: '5000', mode: 'insensitive' } },
      ],
    },
    orderBy: { averagePaceSeconds500m: 'asc' },
    take: 8,
    select: {
      id: true,
      startedAt: true,
      title: true,
      distanceMeters: true,
      durationSeconds: true,
      averagePaceSeconds500m: true,
      workoutType: true,
      detectedClassification: true,
    },
  });

  const volumeSource = (activeBlock ? blockWorkouts : recentWorkouts).map((w) => ({
    startedAt: w.startedAt,
    distanceMeters: w.distanceMeters,
    durationSeconds: w.durationSeconds,
    workoutType: w.detectedClassification ?? w.workoutType,
  }));

  const thisWeek = calculateWeeklyVolume(volumeSource);
  const rolling28 = calculateRollingVolume(volumeSource, 28);

  const plannedCount = plan?.plannedWorkouts?.length ?? null;
  const totalWeeks =
    plan && plan.startDate && plan.endDate
      ? Math.max(
          1,
          Math.round((plan.endDate.getTime() - plan.startDate.getTime()) / (7 * 86400000)),
        )
      : activeBlock?.endDate
        ? Math.max(
            1,
            Math.round(
              (activeBlock.endDate.getTime() - activeBlock.startDate.getTime()) / (7 * 86400000),
            ),
          )
        : null;

  const weekInfo = activeBlock
    ? computeBlockWeek(activeBlock.startDate, new Date(), totalWeeks)
    : { currentWeek: null, totalWeeks: null, progressPercent: null };

  const typeTrends = buildTypeTrends(blockWorkouts);

  let readiness = null;
  const targetPace =
    activeBlock?.targetPaceSeconds500m ?? activeGoal?.targetPaceSeconds500m ?? null;
  if (targetPace != null) {
    const typed = (t: string) =>
      blockWorkouts.filter((w) => (w.detectedClassification ?? w.workoutType) === t);
    const longRows = blockWorkouts.filter((w) => w.distanceMeters >= 15000);
    const ut1 = typed('UT1');
    const ut2 = typed('UT2');
    readiness = estimateMarathonReadiness({
      targetPaceSeconds500m: targetPace,
      longRowPaces: longRows
        .map((w) => w.averagePaceSeconds500m)
        .filter((p): p is number => p != null),
      longRowHrDrifts: [],
      ut1Paces: ut1.map((w) => w.averagePaceSeconds500m).filter((p): p is number => p != null),
      ut1AvgHrs: ut1.map((w) => w.averageHeartRate).filter((p): p is number => p != null),
      ut2Paces: ut2.map((w) => w.averagePaceSeconds500m).filter((p): p is number => p != null),
      ut2AvgHrs: ut2.map((w) => w.averageHeartRate).filter((p): p is number => p != null),
      benchmark5kPace: null,
      weeksWithConsistentVolume: Math.min(8, Math.ceil(blockWorkouts.length / 4)),
      plannedSessionsLast14Days: plan?.plannedWorkouts?.length
        ? Math.min(8, plan.plannedWorkouts.length)
        : 0,
      completedSessionsLast14Days: blockWorkouts.filter(
        (w) => w.startedAt >= new Date(Date.now() - 14 * 86400000),
      ).length,
      recentLongRowDistanceMax: longRows.reduce((m, w) => Math.max(m, w.distanceMeters), 0),
    });
  }

  return {
    athlete: {
      id: athlete.id,
      age: athlete.age,
      sex: athlete.sex,
      weightKg: athlete.weightKg,
      maxHeartRate: athlete.maxHeartRate,
      lactateThresholdHeartRate: athlete.lactateThresholdHeartRate,
      displayName: athlete.user.displayName,
    },
    activeGoal,
    activeTrainingBlock: activeBlock
      ? {
          id: activeBlock.id,
          name: activeBlock.name,
          blockType: activeBlock.blockType,
          startDate: activeBlock.startDate,
          endDate: activeBlock.endDate,
          status: activeBlock.status,
          targetEvent: activeBlock.targetEvent,
          targetDistance: activeBlock.targetDistance,
          targetTimeSeconds: activeBlock.targetTimeSeconds,
          targetPaceSeconds500m: activeBlock.targetPaceSeconds500m,
          targetPaceFormatted: formatPace(activeBlock.targetPaceSeconds500m),
          goalId: activeBlock.goalId,
          trainingPlanId: activeBlock.trainingPlanId,
        }
      : null,
    trainingPlan: plan
      ? {
          id: plan.id,
          name: plan.name,
          startDate: plan.startDate,
          endDate: plan.endDate,
          plannedSessionCount: plannedCount,
        }
      : null,
    currentWeek: weekInfo.currentWeek,
    totalWeeks: weekInfo.totalWeeks,
    progressPercent: weekInfo.progressPercent,
    blockStartDate: activeBlock?.startDate ?? null,
    blockEndDate: activeBlock?.endDate ?? null,
    targetEvent: activeBlock?.targetEvent ?? activeGoal?.eventType ?? null,
    targetPace: activeBlock?.targetPaceSeconds500m ?? activeGoal?.targetPaceSeconds500m ?? null,
    targetTime: activeBlock?.targetTimeSeconds ?? activeGoal?.targetTimeSeconds ?? null,
    currentBlockWorkouts: blockWorkouts,
    blockSessionCount: blockWorkouts.length,
    recentWorkouts,
    relevantHistoricalWorkouts: benchmarks,
    benchmarkPerformances: benchmarks,
    currentTrends: typeTrends,
    thisWeek,
    rolling28,
    readiness,
    coachState: coachState
      ? {
          strengths: asStringArray(coachState.strengths),
          currentLimiters: asStringArray(coachState.currentLimiters),
          recentProgressSignals: asStringArray(coachState.recentProgressSignals),
          currentConcerns: asStringArray(coachState.currentConcerns),
          goalAssessment: coachState.goalAssessment,
          currentFitnessSummary: coachState.currentFitnessSummary,
          lastUpdatedAt: coachState.lastUpdatedAt,
        }
      : null,
  };
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  return [];
}

function buildTypeTrends(
  workouts: Array<{
    startedAt: Date;
    detectedClassification: string | null;
    workoutType: string;
    averagePaceSeconds500m: number | null;
    averageHeartRate: number | null;
    distanceMeters: number;
  }>,
) {
  const byType = (type: string) =>
    workouts
      .filter((w) => (w.detectedClassification ?? w.workoutType) === type)
      .filter((w) => w.averagePaceSeconds500m != null)
      .map((w) => ({
        date: w.startedAt,
        value: w.averagePaceSeconds500m as number,
      }));

  const ut2 = detectProgressionTrend(byType('UT2'), { lowerIsBetter: true });
  const ut1 = detectProgressionTrend(byType('UT1'), { lowerIsBetter: true });
  const longRow = detectProgressionTrend(
    workouts
      .filter((w) => w.distanceMeters >= 15000 && w.averagePaceSeconds500m != null)
      .map((w) => ({ date: w.startedAt, value: w.averagePaceSeconds500m as number })),
    { lowerIsBetter: true },
  );

  return {
    ut2Efficiency: ut2,
    ut1Efficiency: ut1,
    longRowDurability: longRow,
  };
}

/**
 * Find comparable workouts with current-block priority.
 */
export async function findBlockAwareComparables(workoutId: string, athleteId: string, limit = 5) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
  });
  if (!workout) return [];

  const activeBlock = await getActiveTrainingBlock(athleteId);
  const blockId = workout.trainingBlockId ?? activeBlock?.id ?? null;

  const history = await prisma.workout.findMany({
    where: {
      athleteId,
      id: { not: workoutId },
      excludeFromAnalysis: false,
    },
    orderBy: { startedAt: 'desc' },
    take: 120,
    select: {
      id: true,
      startedAt: true,
      title: true,
      workoutType: true,
      detectedClassification: true,
      distanceMeters: true,
      durationSeconds: true,
      averagePaceSeconds500m: true,
      averageHeartRate: true,
      averageStrokeRate: true,
      trainingBlockId: true,
      excludeFromAnalysis: true,
    },
  });

  const sameGoalBlocks = activeBlock
    ? await prisma.trainingBlock.findMany({
        where: {
          athleteId,
          blockType: activeBlock.blockType,
          id: { not: activeBlock.id },
        },
        select: { id: true },
      })
    : [];
  const sameGoalIds = new Set(sameGoalBlocks.map((b) => b.id));

  const scored = compareEquivalentSessions(
    {
      id: workout.id,
      workoutType: workout.detectedClassification ?? workout.workoutType,
      durationSeconds: workout.durationSeconds,
      distanceMeters: workout.distanceMeters,
      averageStrokeRate: workout.averageStrokeRate,
      averageHeartRate: workout.averageHeartRate,
      averagePaceSeconds500m: workout.averagePaceSeconds500m,
      intervalStructure: inferIntervalStructure(workout.title),
      trainingBlockId: blockId,
      startedAt: workout.startedAt,
    },
    history.map((w) => ({
      id: w.id,
      workoutType: w.detectedClassification ?? w.workoutType,
      durationSeconds: w.durationSeconds,
      distanceMeters: w.distanceMeters,
      averageStrokeRate: w.averageStrokeRate,
      averageHeartRate: w.averageHeartRate,
      averagePaceSeconds500m: w.averagePaceSeconds500m,
      intervalStructure: inferIntervalStructure(w.title),
      trainingBlockId: w.trainingBlockId,
      sameGoalType: w.trainingBlockId ? sameGoalIds.has(w.trainingBlockId) : false,
      startedAt: w.startedAt,
      excludeFromAnalysis: w.excludeFromAnalysis,
    })),
    { currentBlockId: blockId, limit },
  );

  const details = await prisma.workout.findMany({
    where: { id: { in: scored.map((s) => s.workoutId) }, athleteId },
    select: {
      id: true,
      title: true,
      startedAt: true,
      workoutType: true,
      detectedClassification: true,
      distanceMeters: true,
      durationSeconds: true,
      averagePaceSeconds500m: true,
      averageHeartRate: true,
      averageStrokeRate: true,
      trainingBlockId: true,
    },
  });

  return scored.map((s) => ({
    ...s,
    workout: details.find((d) => d.id === s.workoutId) ?? null,
  }));
}
