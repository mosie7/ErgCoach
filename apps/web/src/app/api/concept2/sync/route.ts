import { NextResponse } from 'next/server';
import { syncConcept2Workouts } from '@ergcoach/services';
import { getDemoAthleteId, getSessionUser } from '@/lib/session';
import { prisma } from '@ergcoach/database';

export async function POST() {
  try {
    const athleteId = await getDemoAthleteId();
    if (!athleteId) {
      return NextResponse.json({ error: 'No athlete profile' }, { status: 400 });
    }
    let user = await getSessionUser();
    if (!user) {
      const athlete = await prisma.athleteProfile.findUnique({ where: { id: athleteId } });
      user = athlete
        ? await prisma.user.findUnique({ where: { id: athlete.userId } })
        : null;
    }
    if (!user) {
      return NextResponse.json({ error: 'No user' }, { status: 401 });
    }
    const result = await syncConcept2Workouts(user.id, athleteId);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 },
    );
  }
}
