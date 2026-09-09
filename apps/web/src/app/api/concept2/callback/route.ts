import { NextResponse } from 'next/server';
import { completeConcept2OAuth, shouldUseConcept2Mock } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookieStore = await cookies();
  const expected = cookieStore.get('concept2_oauth_state')?.value;
  const oauthUserId = cookieStore.get('concept2_oauth_user')?.value;

  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (!shouldUseConcept2Mock() && (!state || !expected || state !== expected)) {
    return NextResponse.json({ error: 'Invalid OAuth state' }, { status: 400 });
  }

  if (oauthUserId && oauthUserId !== session.user.id) {
    return NextResponse.json({ error: 'OAuth session mismatch' }, { status: 403 });
  }

  await completeConcept2OAuth(session.user.id, code ?? 'missing-code');

  const res = NextResponse.redirect(new URL('/settings?concept2=connected', req.url));
  res.cookies.set('concept2_oauth_state', '', { path: '/', maxAge: 0 });
  res.cookies.set('concept2_oauth_user', '', { path: '/', maxAge: 0 });
  return res;
}
