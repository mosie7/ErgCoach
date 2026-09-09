import { NextResponse } from 'next/server';
import { disconnectConcept2 } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';

export async function POST() {
  try {
    const session = await getSessionAthlete();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    await disconnectConcept2(session.user.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Disconnect failed' },
      { status: 500 },
    );
  }
}
