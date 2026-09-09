import { NextResponse } from 'next/server';
import { getConcept2AuthUrl } from '@ergcoach/services';
import { randomBytes } from 'node:crypto';

export async function GET() {
  const state = randomBytes(16).toString('hex');
  const url = getConcept2AuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set('concept2_oauth_state', state, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return res;
}
