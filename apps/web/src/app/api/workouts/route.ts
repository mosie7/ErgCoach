import { NextResponse } from 'next/server';
import { createManualWorkout } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';
import type { WorkoutClassification } from '@ergcoach/database';

export async function POST(req: Request) {
  try {
    const session = await getSessionAthlete();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const body = await req.json();
    const workout = await createManualWorkout({
      athleteId: session.athlete.id,
      startedAt: new Date(body.startedAt),
      workoutType: body.workoutType as WorkoutClassification,
      title: body.title,
      durationSeconds: Number(body.durationSeconds),
      distanceMeters: Number(body.distanceMeters),
      averagePaceSeconds500m: body.averagePaceSeconds500m,
      averageHeartRate: body.averageHeartRate,
      maxHeartRate: body.maxHeartRate,
      averageStrokeRate: body.averageStrokeRate,
      feedback: {
        rpe: body.rpe,
        notes: body.notes,
      },
      analyse: true,
    });
    return NextResponse.json(workout);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to create workout' },
      { status: 500 },
    );
  }
}
