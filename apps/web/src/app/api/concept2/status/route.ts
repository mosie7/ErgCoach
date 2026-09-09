import { NextResponse } from 'next/server';
import { prisma } from '@ergcoach/database';
import { getSessionAthlete } from '@/lib/session';

export async function GET() {
  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const connection = await prisma.dataConnection.findUnique({
    where: {
      userId_provider: { userId: session.user.id, provider: 'concept2' },
    },
  });

  const workoutCount = await prisma.workout.count({
    where: { athleteId: session.athlete.id, source: 'concept2' },
  });

  const configured =
    Boolean(process.env.CONCEPT2_CLIENT_ID) && Boolean(process.env.CONCEPT2_CLIENT_SECRET);
  const useMock = process.env.CONCEPT2_USE_MOCK === 'true';

  return NextResponse.json({
    connected: Boolean(connection?.accessTokenEnc),
    lastSyncAt: connection?.lastSyncAt ?? null,
    externalUserId: connection?.externalUserId ?? null,
    workoutCount,
    configured,
    useMock,
    mode: useMock ? 'mock' : configured ? 'live' : 'unconfigured',
  });
}
