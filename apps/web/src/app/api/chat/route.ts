import { NextResponse } from 'next/server';
import { coachChat, getChatHistory, EntitlementError } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSessionAthlete();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const messages = await getChatHistory(session.athlete.id);
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionAthlete();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }
    const body = (await req.json()) as { question?: string };
    if (!body.question?.trim()) {
      return NextResponse.json({ error: 'Question required' }, { status: 400 });
    }
    const result = await coachChat(session.athlete.id, body.question.trim());
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof EntitlementError) {
      return NextResponse.json(
        {
          error: e.message,
          code: e.code,
          entitlement: e.entitlement,
          upgradeUrl: e.upgradeUrl,
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Chat failed' },
      { status: 500 },
    );
  }
}
