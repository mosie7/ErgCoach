import { NextResponse } from 'next/server';
import { getConcept2AuthUrl, shouldUseConcept2Mock } from '@ergcoach/services';
import { getSessionAthlete } from '@/lib/session';
import { randomBytes } from 'node:crypto';

function originFrom(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (configured) return configured;
  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const origin = originFrom(req);
  const session = await getSessionAthlete();
  if (!session) {
    return NextResponse.redirect(new URL('/login', origin));
  }

  if (
    !shouldUseConcept2Mock() &&
    (!process.env.CONCEPT2_CLIENT_ID || !process.env.CONCEPT2_CLIENT_SECRET)
  ) {
    return NextResponse.redirect(
      new URL('/settings?concept2=error&reason=not_configured', origin),
    );
  }

  const state = randomBytes(16).toString('hex');
  const url = getConcept2AuthUrl(state);
  const secure = origin.startsWith('https://');
  const res = NextResponse.redirect(url);
  res.cookies.set('concept2_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 600,
  });
  res.cookies.set('concept2_oauth_user', session.user.id, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: 600,
  });
  return res;
}
