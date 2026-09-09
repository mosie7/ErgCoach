import { NextResponse } from 'next/server';
import { getAuthProvider } from '@ergcoach/services';
import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ergcoach_session')?.value;
  if (token) {
    await getAuthProvider().logout(token);
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set('ergcoach_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
