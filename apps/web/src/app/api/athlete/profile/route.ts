import { NextResponse } from 'next/server';
import { prisma } from '@ergcoach/database';
import { getSessionAthlete } from '@/lib/session';

export async function PATCH(req: Request) {
  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const athlete = await prisma.athleteProfile.update({
    where: { id: session.athlete.id },
    data: {
      age: body.age != null ? Number(body.age) : undefined,
      sex: body.sex ?? undefined,
      weightKg: body.weightKg != null ? Number(body.weightKg) : undefined,
      maxHeartRate: body.maxHeartRate != null ? Number(body.maxHeartRate) : undefined,
      restingHeartRate:
        body.restingHeartRate != null ? Number(body.restingHeartRate) : undefined,
      lactateThresholdHeartRate:
        body.lactateThresholdHeartRate != null
          ? Number(body.lactateThresholdHeartRate)
          : undefined,
      preferredUnits: body.preferredUnits ?? undefined,
      hrZoneMethod: body.hrZoneMethod ?? undefined,
      notes: body.notes ?? undefined,
    },
  });

  // Upsert active marathon goal if provided
  if (body.goal) {
    const existing = await prisma.goal.findFirst({
      where: { athleteId: athlete.id, status: 'active' },
    });
    const goalData = {
      sport: body.goal.sport ?? 'rower',
      eventType: body.goal.eventType ?? 'marathon',
      targetDate: body.goal.targetDate ? new Date(body.goal.targetDate) : null,
      targetDistance: body.goal.targetDistance != null ? Number(body.goal.targetDistance) : 42195,
      targetTimeSeconds:
        body.goal.targetTimeSeconds != null ? Number(body.goal.targetTimeSeconds) : null,
      targetPaceSeconds500m:
        body.goal.targetPaceSeconds500m != null
          ? Number(body.goal.targetPaceSeconds500m)
          : null,
      notes: body.goal.notes ?? null,
      status: 'active' as const,
    };
    if (existing) {
      await prisma.goal.update({ where: { id: existing.id }, data: goalData });
    } else {
      await prisma.goal.create({
        data: { athleteId: athlete.id, ...goalData },
      });
    }
  }

  return NextResponse.json({ ok: true, athleteId: athlete.id });
}
