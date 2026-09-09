import { NextResponse } from 'next/server';
import { TRAINING_PROGRAMS, isProgramEventType, startTrainingProgram } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';

export async function GET() {
  return NextResponse.json({
    programs: TRAINING_PROGRAMS.map((p) => ({
      eventType: p.eventType,
      slug: p.slug,
      name: p.name,
      shortLabel: p.shortLabel,
      distanceMeters: p.distanceMeters,
      durationWeeks: p.durationWeeks,
      sessionsPerWeek: p.sessionsPerWeek,
      focus: p.focus,
      summary: p.summary,
    })),
  });
}

export async function POST(req: Request) {
  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const eventType = String(body.eventType ?? '');
  if (!isProgramEventType(eventType)) {
    return NextResponse.json(
      { error: 'Choose a program: 2k, 5k, 10k, half marathon, marathon, or 100k.' },
      { status: 400 },
    );
  }

  const paceMin = body.paceMin != null ? Number(body.paceMin) : null;
  const paceSec = body.paceSec != null ? Number(body.paceSec) : null;
  const targetPaceSeconds500m =
    body.targetPaceSeconds500m != null
      ? Number(body.targetPaceSeconds500m)
      : paceMin != null
        ? paceMin * 60 + (paceSec ?? 0)
        : null;

  const result = await startTrainingProgram({
    athleteId: session.athlete.id,
    eventType,
    targetDate: body.targetDate ?? null,
    targetPaceSeconds500m,
    weeks: body.weeks != null ? Number(body.weeks) : undefined,
  });

  return NextResponse.json({
    ok: true,
    goalId: result.goal.id,
    planId: result.plan.id,
    planName: result.plan.name,
    sessionCount: result.plan.plannedWorkouts.length,
  });
}
