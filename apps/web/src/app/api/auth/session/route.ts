import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';

/** Ensures DynamoDB User + AthleteProfile exist for the Cognito session. */
export async function POST() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Session provisioning failed' },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }
    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
  } catch (e) {
    console.error('[auth/session GET]', e);
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
