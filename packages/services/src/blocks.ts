import { prisma, type TrainingBlockType, type EventType } from '@ergcoach/database';

const EVENT_TO_BLOCK: Partial<Record<EventType, TrainingBlockType>> = {
  two_k: 'two_k',
  five_k: 'five_k',
  ten_k: 'ten_k',
  half_marathon: 'half_marathon',
  marathon: 'marathon',
  hundred_k: 'hundred_k',
  general_endurance: 'general',
  custom: 'custom',
};

export function eventTypeToBlockType(eventType: EventType | string): TrainingBlockType {
  return EVENT_TO_BLOCK[eventType as EventType] ?? 'custom';
}

export async function getActiveTrainingBlock(athleteId: string) {
  return prisma.trainingBlock.findFirst({
    where: { athleteId, status: 'active' },
    orderBy: { startDate: 'desc' },
    include: {
      goal: true,
      trainingPlan: true,
    },
  });
}

export async function getTrainingBlock(athleteId: string, blockId: string) {
  return prisma.trainingBlock.findFirst({
    where: { id: blockId, athleteId },
    include: {
      goal: true,
      trainingPlan: { include: { plannedWorkouts: { orderBy: { scheduledDate: 'asc' } } } },
    },
  });
}

export interface CreateTrainingBlockInput {
  athleteId: string;
  goalId?: string | null;
  trainingPlanId?: string | null;
  name: string;
  description?: string | null;
  blockType: TrainingBlockType;
  startDate: Date;
  endDate?: Date | null;
  targetEvent?: EventType | null;
  targetDistance?: number | null;
  targetTimeSeconds?: number | null;
  targetPaceSeconds500m?: number | null;
  /** Associate existing workouts in the date window */
  associateExistingWorkouts?: boolean;
}

export async function createTrainingBlock(input: CreateTrainingBlockInput) {
  return prisma.$transaction(async (tx) => {
    await tx.trainingBlock.updateMany({
      where: { athleteId: input.athleteId, status: 'active' },
      data: { status: 'archived' },
    });

    const block = await tx.trainingBlock.create({
      data: {
        athleteId: input.athleteId,
        goalId: input.goalId ?? null,
        trainingPlanId: input.trainingPlanId ?? null,
        name: input.name,
        description: input.description ?? null,
        blockType: input.blockType,
        startDate: input.startDate,
        endDate: input.endDate ?? null,
        status: 'active',
        targetEvent: input.targetEvent ?? null,
        targetDistance: input.targetDistance ?? null,
        targetTimeSeconds: input.targetTimeSeconds ?? null,
        targetPaceSeconds500m: input.targetPaceSeconds500m ?? null,
      },
    });

    await tx.athleteCoachState.upsert({
      where: { athleteId: input.athleteId },
      create: {
        athleteId: input.athleteId,
        activeTrainingBlockId: block.id,
        strengths: [],
        currentLimiters: [],
        recentProgressSignals: [],
        currentConcerns: [],
      },
      update: {
        activeTrainingBlockId: block.id,
        lastUpdatedAt: new Date(),
      },
    });

    if (input.associateExistingWorkouts !== false) {
      const where = {
        athleteId: input.athleteId,
        excludeFromAnalysis: false,
        blockAssignment: { not: 'manual' as const },
        startedAt: {
          gte: input.startDate,
          ...(input.endDate ? { lte: input.endDate } : {}),
        },
      };
      await tx.workout.updateMany({
        where,
        data: {
          trainingBlockId: block.id,
          blockAssignment: 'auto',
        },
      });
    }

    return block;
  });
}

/** Resolve which active block a workout date belongs to (athlete-scoped). */
export async function resolveBlockForWorkoutDate(athleteId: string, startedAt: Date) {
  return prisma.trainingBlock.findFirst({
    where: {
      athleteId,
      status: 'active',
      startDate: { lte: startedAt },
      OR: [{ endDate: null }, { endDate: { gte: startedAt } }],
    },
    orderBy: { startDate: 'desc' },
  });
}

export async function assignWorkoutToBlock(
  athleteId: string,
  workoutId: string,
  trainingBlockId: string | null,
) {
  const workout = await prisma.workout.findFirst({
    where: { id: workoutId, athleteId },
  });
  if (!workout) throw new Error('Workout not found');

  if (trainingBlockId) {
    const block = await prisma.trainingBlock.findFirst({
      where: { id: trainingBlockId, athleteId },
    });
    if (!block) throw new Error('Training block not found');
  }

  return prisma.workout.update({
    where: { id: workoutId },
    data: {
      trainingBlockId,
      blockAssignment: trainingBlockId ? 'manual' : 'none',
    },
  });
}

export async function setWorkoutExcludedFromAnalysis(
  athleteId: string,
  workoutId: string,
  exclude: boolean,
) {
  const workout = await prisma.workout.findFirst({ where: { id: workoutId, athleteId } });
  if (!workout) throw new Error('Workout not found');
  return prisma.workout.update({
    where: { id: workoutId },
    data: { excludeFromAnalysis: exclude },
  });
}

export function computeBlockWeek(
  startDate: Date,
  referenceDate: Date = new Date(),
  totalWeeks?: number | null,
): { currentWeek: number; totalWeeks: number | null; progressPercent: number | null } {
  const ms = referenceDate.getTime() - startDate.getTime();
  const week = Math.max(1, Math.floor(ms / (7 * 86400000)) + 1);
  const total = totalWeeks ?? null;
  const progressPercent =
    total != null && total > 0 ? Math.min(100, Math.round((week / total) * 100)) : null;
  return { currentWeek: week, totalWeeks: total, progressPercent };
}
