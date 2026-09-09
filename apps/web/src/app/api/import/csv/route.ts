import { NextResponse } from 'next/server';
import { importWorkoutsFromCsv } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const session = await getSessionAthlete();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const body = (await req.json()) as { csv?: string };
    if (!body.csv) {
      return NextResponse.json({ error: 'csv required' }, { status: 400 });
    }
    const created = await importWorkoutsFromCsv(session.athlete.id, body.csv);
    return NextResponse.json({ count: created.length, ids: created.map((w) => w.id) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 },
    );
  }
}
