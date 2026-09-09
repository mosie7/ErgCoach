import { NextResponse } from 'next/server';

/**
 * Cookie clearing helper. Prefer client `signOut()` from aws-amplify/auth
 * (LogoutButton). This clears any legacy ergcoach_session cookie.
 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set('ergcoach_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
