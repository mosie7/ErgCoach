import { NextResponse } from 'next/server';
import { registerAndLogin } from '@ergcoach/services';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    if (!body.email || !body.password || !body.displayName?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 },
      );
    }
    const { sessionToken, user } = await registerAndLogin({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });
    const res = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, displayName: user.displayName },
    });
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
      { error: e instanceof Error ? e.message : 'Registration failed' },
      { status: 400 },
    );
  }
}
