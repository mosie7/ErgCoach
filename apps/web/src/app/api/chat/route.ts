import { NextResponse } from 'next/server';
import { coachChat, getChatHistory, EntitlementError } from '@ergcoach/services';
import { getDemoAthleteId } from '@/lib/session';

export async function GET() {
  const athleteId = await getDemoAthleteId();
  if (!athleteId) return NextResponse.json({ messages: [] });
  const messages = await getChatHistory(athleteId);
  return NextResponse.json({ messages });
}

export async function POST(req: Request) {
  try {
    const athleteId = await getDemoAthleteId();
    if (!athleteId) {
      return NextResponse.json({ error: 'No athlete profile' }, { status: 400 });
    }
    const body = (await req.json()) as { question?: string };
    if (!body.question?.trim()) {
      return NextResponse.json({ error: 'Question required' }, { status: 400 });
    }
    const result = await coachChat(athleteId, body.question.trim());
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
