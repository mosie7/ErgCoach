import { NextResponse } from 'next/server';
import { getAuthProvider } from '@ergcoach/services';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { email?: string; password?: string };
    if (!body.email || !body.password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }
    const { sessionToken } = await getAuthProvider().login(body.email, body.password);
    const res = NextResponse.json({ ok: true });
    res.cookies.set('ergcoach_session', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 3600,
      secure: process.env.NODE_ENV === 'production',
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Login failed' },
      { status: 401 },
    );
  }
}
