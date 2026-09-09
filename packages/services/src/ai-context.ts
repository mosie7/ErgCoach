import { prisma } from '@ergcoach/database';
import { calculateWeeklyVolume } from '@ergcoach/training-engine';
import { formatPace } from '@ergcoach/shared';
import { getCurrentTrainingContext, findBlockAwareComparables, inferIntervalStructure } from './training-context.js';
import { getActiveTrainingBlock } from './blocks.js';
import { analyzeWorkoutMetrics } from '@ergcoach/training-engine';

function summariseTypeSeries(
  workouts: Array<{
    startedAt: Date;
    averagePaceSeconds500m: number | null;
    averageHeartRate: number | null;
    detectedClassification: string | null;
    workoutType: string;
  }>,
  type: string,
) {
  const rows = workouts
    .filter((w) => (w.detectedClassification ?? w.workoutType) === type)
    .filter((w) => w.averagePaceSeconds500m != null)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

  if (rows.length === 0) {
    return { sessions: 0 };
  }

  const mid = Math.floor(rows.length / 2) || 1;
  const first = rows.slice(0, mid);
  const last = rows.slice(mid);
  const avg = (xs: typeof rows, key: 'averagePaceSeconds500m' | 'averageHeartRate') => {
    const vals = xs.map((x) => x[key]).filter((v): v is number => v != null);
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  };

  return {
    sessions: rows.length,
    averagePaceFirstHalf: avg(first, 'averagePaceSeconds500m'),
    averagePaceSecondHalf: avg(last, 'averagePaceSeconds500m'),
    averageHrFirstHalf: avg(first, 'averageHeartRate'),
    averageHrSecondHalf: avg(last, 'averageHeartRate'),
    averagePaceFirstHalfFormatted: formatPace(avg(first, 'averagePaceSeconds500m')),
    averagePaceSecondHalfFormatted: formatPace(avg(last, 'averagePaceSeconds500m')),
  };
}

/**
 * Compact evidence package for post-workout AI analysis.
 * Prefers current-block comparables + summaries — not raw lifetime dumps.
 */
export async function buildWorkoutAnalysisContext(workoutId: string) {
  const workout = await prisma.workout.findUnique({
    where: { id: workoutId },
    include: {
      splits: { orderBy: { index: 'asc' } },
      subjectiveFeedback: true,
      plannedWorkout: true,
      trainingBlock: true,
      athlete: {
        include: {
          hrZones: { orderBy: { zoneIndex: 'asc' } },
          goals: { where: { status: 'active' }, take: 1 },
          user: { select: { id: true, displayName: true } },
        },
      },
    },
  });
  if (!workout) {
    throw new Error(`Workout not found for analysis: ${workoutId}`);
  }

  const athleteId = workout.athleteId;
  const context = await getCurrentTrainingContext(athleteId);
  const comparables = await findBlockAwareComparables(workoutId, athleteId, 5);

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
    lthr: workout.athlete.lactateThresholdHeartRate,
    maxHr: workout.athlete.maxHeartRate,
    hrZones: workout.athlete.hrZones.map((z) => ({
      name: z.name,
      zoneIndex: z.zoneIndex,
      minBpm: z.minBpm,
      maxBpm: z.maxBpm,
    })),
  });

  const blockWorkouts = context.currentBlockWorkouts;
  const week = calculateWeeklyVolume(
    blockWorkouts.map((w) => ({
      startedAt: w.startedAt,
      distanceMeters: w.distanceMeters,
      durationSeconds: w.durationSeconds,
      workoutType: w.detectedClassification ?? w.workoutType,
    })),
    workout.startedAt,
  );

  const comparisonEvidence = comparables.slice(0, 3).map((c) => {
    const prev = c.workout;
    const paceDelta =
      workout.averagePaceSeconds500m != null && prev?.averagePaceSeconds500m != null
        ? Number((prev.averagePaceSeconds500m - workout.averagePaceSeconds500m).toFixed(1))
        : null;
    const hrDelta =
      workout.averageHeartRate != null && prev?.averageHeartRate != null
        ? Number((workout.averageHeartRate - prev.averageHeartRate).toFixed(1))
        : null;
    return {
      tier: c.tier,
      similarityScore: c.similarityScore,
      reasons: c.reasons,
      previous: prev
        ? {
            id: prev.id,
            title: prev.title,
            startedAt: prev.startedAt,
            pace: prev.averagePaceSeconds500m,
            paceFormatted: formatPace(prev.averagePaceSeconds500m),
            hr: prev.averageHeartRate,
            distanceMeters: prev.distanceMeters,
          }
        : null,
      deltas: {
        paceSecondsFaster: paceDelta,
        hrDelta,
        interpretation:
          paceDelta != null && paceDelta > 0 && (hrDelta == null || Math.abs(hrDelta) <= 3)
            ? 'faster_pace_similar_hr'
            : paceDelta != null && paceDelta > 0 && hrDelta != null && hrDelta < 0
              ? 'faster_pace_lower_hr'
              : 'see_numbers',
      },
    };
  });

  return {
    athleteId,
    userId: workout.athlete.userId,
    workout,
    metrics,
    evidence: {
      athlete: {
        age: workout.athlete.age,
        weightKg: workout.athlete.weightKg,
        maxHeartRate: workout.athlete.maxHeartRate,
        lactateThresholdHeartRate: workout.athlete.lactateThresholdHeartRate,
        hrZoneMethod: workout.athlete.hrZoneMethod,
      },
      goal: context.activeGoal
        ? {
            sport: context.activeGoal.sport,
            eventType: context.activeGoal.eventType,
            targetDate: context.activeGoal.targetDate,
            targetPaceSeconds500m: context.activeGoal.targetPaceSeconds500m,
            targetTimeSeconds: context.activeGoal.targetTimeSeconds,
          }
        : null,
      trainingBlock: context.activeTrainingBlock,
      currentWeek: context.currentWeek,
      totalWeeks: context.totalWeeks,
      coachMemory: context.coachState,
      plannedWorkout: workout.plannedWorkout as unknown as Record<string, unknown> | null,
      workout: {
        id: workout.id,
        title: workout.title,
        startedAt: workout.startedAt,
        workoutType: workout.workoutType,
        detectedClassification: metrics.detectedClassification,
        distanceMeters: workout.distanceMeters,
        durationSeconds: workout.durationSeconds,
        averagePaceSeconds500m: workout.averagePaceSeconds500m ?? metrics.averagePaceSeconds500m,
        averagePaceFormatted: formatPace(
          workout.averagePaceSeconds500m ?? metrics.averagePaceSeconds500m,
        ),
        averageHeartRate: workout.averageHeartRate,
        maxHeartRate: workout.maxHeartRate,
        averageStrokeRate: workout.averageStrokeRate,
        trainingBlockId: workout.trainingBlockId,
        intervalStructure: inferIntervalStructure(workout.title),
      },
      calculatedMetrics: metrics as unknown as Record<string, unknown>,
      comparableWorkouts: comparisonEvidence as unknown as Record<string, unknown>[],
      whyEvidence: comparisonEvidence,
      blockTypeSummaries: {
        UT2: summariseTypeSeries(blockWorkouts, 'UT2'),
        UT1: summariseTypeSeries(blockWorkouts, 'UT1'),
        AT: summariseTypeSeries(blockWorkouts, 'AT'),
      },
      recentContext: {
        weeklyVolume: week,
        blockSessionCount: context.blockSessionCount,
        sessionsLast14Days: blockWorkouts.filter(
          (w) => w.startedAt >= new Date(workout.startedAt.getTime() - 14 * 86400000),
        ).length,
        trends: context.currentTrends,
      },
      subjectiveFeedback: workout.subjectiveFeedback as unknown as Record<string, unknown> | null,
      guidance: {
        priority: 'Compare primarily against same-type sessions in the CURRENT training block.',
        avoid: 'Do not treat lifetime random history as equal peers unless marked as PB/benchmark.',
        tone: 'Evidence-based. No generic motivation. Label facts vs inferences vs uncertainty.',
      },
    },
  };
}

export async function buildCoachChatContext(athleteId: string, question: string) {
  const q = question.toLowerCase();
  const context = await getCurrentTrainingContext(athleteId);
  const toolsUsed: string[] = [];
  const evidence: Record<string, unknown> = {
    trainingBlock: context.activeTrainingBlock,
    currentWeek: context.currentWeek,
    totalWeeks: context.totalWeeks,
    coachMemory: context.coachState,
  };

  const wantsGoal =
    /goal|marathon|target|2:00|pace realistic|capable|hold .* for|ready|readiness/.test(q);
  const wantsProgress = /progress|trend|how am i|improving|limiter|holding me back/.test(q);
  const wantsToday = /today|latest|this session|was .* (good|ut1|ut2)|how was/.test(q);
  const wantsPlan = /plan|this week|concentrate|focus|what should/.test(q);
  const wantsPb = /best|pb|personal best|ever|lifetime|all[- ]time/.test(q);
  const wantsProfile = /profile|who am i|weight|max hr|lthr/.test(q);

  if (wantsProfile) {
    toolsUsed.push('get_athlete_profile');
    evidence.athlete = context.athlete;
  }

  if (wantsGoal) {
    toolsUsed.push('get_active_goal', 'assess_goal_readiness', 'block_long_rows');
    evidence.goal = context.activeGoal;
    evidence.readiness = context.readiness;
    evidence.longRows = context.currentBlockWorkouts
      .filter((w) => w.distanceMeters >= 15000)
      .slice(-6);
    evidence.blockTrends = context.currentTrends;
    evidence.blockSummaries = {
      UT2: summariseTypeSeries(context.currentBlockWorkouts, 'UT2'),
      UT1: summariseTypeSeries(context.currentBlockWorkouts, 'UT1'),
    };
  }

  if (wantsProgress) {
    toolsUsed.push('current_block_trends', 'block_summaries');
    evidence.blockTrends = context.currentTrends;
    evidence.thisWeek = context.thisWeek;
    evidence.rolling28 = context.rolling28;
    evidence.blockSummaries = {
      UT2: summariseTypeSeries(context.currentBlockWorkouts, 'UT2'),
      UT1: summariseTypeSeries(context.currentBlockWorkouts, 'UT1'),
    };
    evidence.recentBlockWorkouts = context.currentBlockWorkouts.slice(-8);
  }

  if (wantsToday) {
    toolsUsed.push('get_latest_workout', 'block_comparables');
    const latest = context.recentWorkouts[0] ?? null;
    evidence.latestWorkout = latest;
    if (latest) {
      evidence.comparables = await findBlockAwareComparables(latest.id, athleteId, 4);
    }
  }

  if (wantsPlan) {
    toolsUsed.push('get_training_plan');
    evidence.plan = context.trainingPlan;
    evidence.thisWeek = context.thisWeek;
  }

  if (wantsPb) {
    toolsUsed.push('lifetime_benchmarks');
    evidence.benchmarkPerformances = context.benchmarkPerformances;
  }

  if (toolsUsed.length === 0) {
    toolsUsed.push('current_training_context');
    evidence.thisWeek = context.thisWeek;
    evidence.blockSessionCount = context.blockSessionCount;
    evidence.blockTrends = context.currentTrends;
    evidence.readiness = context.readiness;
  }

  evidence.guidance = {
    scope: context.activeTrainingBlock
      ? `Athlete is in training block "${context.activeTrainingBlock.name}" (week ${context.currentWeek ?? '?'}${context.totalWeeks ? ` of ${context.totalWeeks}` : ''}).`
      : 'No active training block — use recent workouts carefully and ask about current goal.',
    preferCurrentBlock: true,
  };

  return { toolsUsed, evidence, context };
}

export async function buildGoalProgressContext(athleteId: string) {
  const context = await getCurrentTrainingContext(athleteId);
  return {
    activeGoal: context.activeGoal,
    activeTrainingBlock: context.activeTrainingBlock,
    currentWeek: context.currentWeek,
    totalWeeks: context.totalWeeks,
    readiness: context.readiness,
    trends: context.currentTrends,
    blockSummaries: {
      UT2: summariseTypeSeries(context.currentBlockWorkouts, 'UT2'),
      UT1: summariseTypeSeries(context.currentBlockWorkouts, 'UT1'),
    },
    longRows: context.currentBlockWorkouts.filter((w) => w.distanceMeters >= 15000).slice(-6),
    coachMemory: context.coachState,
    thisWeek: context.thisWeek,
  };
}

export async function ensureWorkoutBlockAssociation(workoutId: string) {
  const workout = await prisma.workout.findUnique({ where: { id: workoutId } });
  if (!workout) return null;
  if (workout.blockAssignment === 'manual') return workout.trainingBlockId;
  if (workout.excludeFromAnalysis) return null;

  const block = await getActiveTrainingBlock(workout.athleteId);
  if (!block) return null;
  if (workout.startedAt < block.startDate) return null;
  if (block.endDate && workout.startedAt > block.endDate) return null;

  if (workout.trainingBlockId !== block.id) {
    await prisma.workout.update({
      where: { id: workoutId },
      data: { trainingBlockId: block.id, blockAssignment: 'auto' },
    });
  }
  return block.id;
}
