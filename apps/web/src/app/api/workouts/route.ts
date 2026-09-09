import { NextResponse } from 'next/server';
import { createManualWorkout } from '@ergcoach/services';
import { getDemoAthleteId } from '@/lib/session';
import type { WorkoutClassification } from '@ergcoach/database';

export async function POST(req: Request) {
  try {
    const athleteId = await getDemoAthleteId();
    if (!athleteId) {
      return NextResponse.json({ error: 'No athlete profile. Seed the database.' }, { status: 400 });
    }
    const body = await req.json();
    const workout = await createManualWorkout({
      athleteId,
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
