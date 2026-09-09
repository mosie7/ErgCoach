import { NextResponse } from 'next/server';
import { syncConcept2Workouts } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSessionAthlete();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const result = await syncConcept2Workouts(session.user.id, session.athlete.id);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Sync failed' },
      { status: 500 },
    );
  }
}
