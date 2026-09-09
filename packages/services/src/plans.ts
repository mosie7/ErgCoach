import { prisma } from '@ergcoach/database';
import {
  EVENT_DISTANCE_METERS,
  type ProgramEventType,
} from '@ergcoach/shared';
import {
  generateProgramPlan,
  getTrainingProgram,
  TRAINING_PROGRAMS,
} from '@ergcoach/training-engine';

export { TRAINING_PROGRAMS, getTrainingProgram };

const PROGRAM_EVENT_TYPES = new Set<string>(Object.keys(EVENT_DISTANCE_METERS));

export function isProgramEventType(value: string): value is ProgramEventType {
  return PROGRAM_EVENT_TYPES.has(value);
}

export interface StartTrainingProgramInput {
  athleteId: string;
  eventType: ProgramEventType;
  targetDate?: string | Date | null;
  targetPaceSeconds500m?: number | null;
  targetTimeSeconds?: number | null;
  weeks?: number;
  startDate?: Date;
}

export async function startTrainingProgram(input: StartTrainingProgramInput) {
  const programMeta = getTrainingProgram(input.eventType);
  if (!programMeta.available) {
    throw new Error(
      `No public Concept2 plan for ${programMeta.shortLabel} yet. Choose 2k, 5k, half marathon, or marathon.`,
    );
  }

  const generated = generateProgramPlan({
    eventType: input.eventType,
    startDate: input.startDate,
    targetPaceSeconds500m: input.targetPaceSeconds500m,
    weeks: input.weeks,
  });

  const program = generated.program;
  const targetDistance = program.distanceMeters;
  const targetPace = input.targetPaceSeconds500m ?? null;
  // Goal target time uses race pace only when paceReference is race; for 5k-referenced
  // endurance plans, leave targetTime unset unless explicitly provided.
  const targetTime =
    input.targetTimeSeconds != null
      ? Number(input.targetTimeSeconds)
      : targetPace != null && program.paceReference === 'race'
        ? Math.round((targetDistance / 500) * targetPace)
        : null;

  const notes = [
    `Started ${generated.name}`,
    program.source?.attribution,
    ...(program.source?.adaptations ?? []),
  ]
    .filter(Boolean)
    .join(' ');

  return prisma.$transaction(async (tx) => {
    await tx.goal.updateMany({
      where: { athleteId: input.athleteId, status: 'active' },
      data: { status: 'abandoned' },
    });

    const goal = await tx.goal.create({
      data: {
        athleteId: input.athleteId,
        sport: 'rower',
        eventType: input.eventType,
        targetDate: input.targetDate ? new Date(input.targetDate) : null,
        targetDistance,
        targetPaceSeconds500m: targetPace,
        targetTimeSeconds: targetTime,
        status: 'active',
        notes,
      },
    });

    const plan = await tx.trainingPlan.create({
      data: {
        athleteId: input.athleteId,
        goalId: goal.id,
        name: generated.name,
        startDate: generated.startDate,
        endDate: generated.endDate,
        notes: [
          program.summary,
          program.source?.url ? `Source: ${program.source.url}` : null,
          ...(program.source?.adaptations ?? []),
        ]
          .filter(Boolean)
          .join('\n'),
        plannedWorkouts: {
          create: generated.sessions.map((session) => ({
            scheduledDate: session.scheduledDate,
            workoutType: session.workoutType,
            title: session.title,
            targetDurationSeconds: session.targetDurationSeconds,
            targetDistanceMeters: session.targetDistanceMeters,
            targetPaceMinSeconds500m: session.targetPaceMinSeconds500m,
            targetPaceMaxSeconds500m: session.targetPaceMaxSeconds500m,
            targetSpmMin: session.targetSpmMin,
            targetSpmMax: session.targetSpmMax,
            instructions: session.instructions,
          })),
        },
      },
      include: {
        plannedWorkouts: { orderBy: { scheduledDate: 'asc' } },
        goal: true,
      },
    });

    return { goal, plan, program };
  });
}

export async function listUpcomingPlannedWorkouts(athleteId: string, limit = 12) {
  const plan = await prisma.trainingPlan.findFirst({
    where: { athleteId },
    orderBy: { startDate: 'desc' },
    include: {
      plannedWorkouts: {
        where: { scheduledDate: { gte: new Date(new Date().toDateString()) } },
        orderBy: { scheduledDate: 'asc' },
        take: limit,
      },
      goal: true,
    },
  });
  return plan;
}
