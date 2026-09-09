import { NextResponse } from 'next/server';
import { getConcept2AuthUrl, shouldUseConcept2Mock } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';
import { randomBytes } from 'node:crypto';

export async function GET() {
  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'));
  }

  if (
    !shouldUseConcept2Mock() &&
    (!process.env.CONCEPT2_CLIENT_ID || !process.env.CONCEPT2_CLIENT_SECRET)
  ) {
    return NextResponse.json(
      {
        error:
          'Concept2 is not configured. Set CONCEPT2_CLIENT_ID and CONCEPT2_CLIENT_SECRET.',
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString('hex');
  const url = getConcept2AuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set('concept2_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  res.cookies.set('concept2_oauth_user', session.user.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
