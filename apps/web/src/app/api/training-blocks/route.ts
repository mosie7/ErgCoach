import { NextResponse } from 'next/server';
import {
  assignWorkoutToBlock,
  createTrainingBlock,
  eventTypeToBlockType,
  getActiveTrainingBlock,
  setWorkoutExcludedFromAnalysis,
} from '@ergcoach/services';
import type { EventType, TrainingBlockType } from '@ergcoach/database';
import { getSessionAthlete } from '@/lib/session';

export async function GET() {
  const session = await getSessionAthlete();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const block = await getActiveTrainingBlock(session.athlete.id);
  return NextResponse.json({ block });
}

export async function POST(req: Request) {
  const session = await getSessionAthlete();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? 'create');

  if (action === 'assign_workout') {
    const workout = await assignWorkoutToBlock(
      session.athlete.id,
      String(body.workoutId),
      body.trainingBlockId ?? null,
    );
    return NextResponse.json({ ok: true, workout });
  }

  if (action === 'exclude_workout') {
    const workout = await setWorkoutExcludedFromAnalysis(
      session.athlete.id,
      String(body.workoutId),
      Boolean(body.exclude),
    );
    return NextResponse.json({ ok: true, workout });
  }

  const weeksAgo = body.weeksAgo != null ? Number(body.weeksAgo) : null;
  const startDate = body.startDate
    ? new Date(body.startDate)
    : weeksAgo != null
      ? new Date(Date.now() - weeksAgo * 7 * 86400000)
      : new Date();

  const eventType = (body.targetEvent ?? body.blockType ?? 'marathon') as EventType;
  const blockType = (body.blockType ?? eventTypeToBlockType(eventType)) as TrainingBlockType;

  const block = await createTrainingBlock({
    athleteId: session.athlete.id,
    name: String(body.name ?? `${new Date().getFullYear()} ${String(blockType).replace('_', ' ')} Build`),
    description: body.description ?? null,
    blockType,
    startDate,
    endDate: body.endDate ? new Date(body.endDate) : null,
    targetEvent: eventType,
    targetDistance: body.targetDistance != null ? Number(body.targetDistance) : null,
    targetTimeSeconds: body.targetTimeSeconds != null ? Number(body.targetTimeSeconds) : null,
    targetPaceSeconds500m:
      body.targetPaceSeconds500m != null ? Number(body.targetPaceSeconds500m) : null,
    goalId: body.goalId ?? null,
    trainingPlanId: body.trainingPlanId ?? null,
    associateExistingWorkouts: body.associateExistingWorkouts !== false,
  });

  return NextResponse.json({ ok: true, block });
}
