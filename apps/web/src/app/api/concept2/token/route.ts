import { NextResponse } from 'next/server';
import { connectConcept2WithAccessToken, ensureAppUser } from '@ergcoach/services';
import { getAmplifyServerUser } from '@/lib/amplify-server';
import '@/lib/amplify-data';

export async function POST(req: Request) {
  try {
    const cognito = await getAmplifyServerUser();
    if (!cognito?.sub) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    await ensureAppUser({
      sub: cognito.sub,
      email: cognito.email,
      displayName: cognito.displayName,
    });

    const body = await req.json().catch(() => ({}));
    const accessToken = String(body.accessToken ?? body.token ?? '').trim();
    if (!accessToken) {
      return NextResponse.json({ error: 'accessToken required' }, { status: 400 });
    }

    await connectConcept2WithAccessToken(cognito.sub, accessToken);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Token connect failed' },
      { status: 500 },
    );
  }
}
