import { NextResponse } from 'next/server';
import { importWorkoutsFromCsv } from '@ergcoach/services';
import { getDemoAthleteId } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const athleteId = await getDemoAthleteId();
    if (!athleteId) {
      return NextResponse.json({ error: 'No athlete profile' }, { status: 400 });
    }
    const body = (await req.json()) as { csv?: string };
    if (!body.csv) {
      return NextResponse.json({ error: 'csv required' }, { status: 400 });
    }
    const created = await importWorkoutsFromCsv(athleteId, body.csv);
    return NextResponse.json({ count: created.length, ids: created.map((w) => w.id) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Import failed' },
      { status: 500 },
    );
  }
}
