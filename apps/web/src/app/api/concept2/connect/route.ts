import { NextResponse } from 'next/server';
import {
  ensureAppUser,
  getConcept2AuthUrl,
  getConcept2RedirectUri,
  shouldUseConcept2Mock,
} from '@ergcoach/services';
import { getAmplifyServerUser } from '@/lib/amplify-server';
import '@/lib/amplify-data';
import { randomBytes } from 'node:crypto';

function originFrom(req: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return new URL(req.url).origin;
}

export async function GET(req: Request) {
  const origin = originFrom(req);

  try {
    const cognito = await getAmplifyServerUser();
    if (!cognito?.sub) {
      return NextResponse.redirect(new URL('/login?next=/settings', origin));
    }

    // Best-effort profile provisioning — never block OAuth start on DynamoDB issues.
    try {
      await ensureAppUser({
        sub: cognito.sub,
        email: cognito.email,
        displayName: cognito.displayName,
      });
    } catch (err) {
      console.error('[concept2/connect] ensureAppUser failed (continuing OAuth):', err);
    }

    if (
      !shouldUseConcept2Mock() &&
      (!process.env.CONCEPT2_CLIENT_ID?.trim() || !process.env.CONCEPT2_CLIENT_SECRET?.trim())
    ) {
      return NextResponse.redirect(
        new URL('/settings?concept2=error&reason=not_configured', origin),
      );
    }

    const redirectUri = getConcept2RedirectUri();
    const state = randomBytes(16).toString('hex');
    const url = getConcept2AuthUrl(state);
    console.info('[concept2/connect] starting OAuth', {
      redirectUri,
      clientIdPrefix: process.env.CONCEPT2_CLIENT_ID?.slice(0, 6),
    });

    const secure = origin.startsWith('https://');
    const res = NextResponse.redirect(url);
    res.cookies.set('concept2_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 600,
    });
    res.cookies.set('concept2_oauth_user', cognito.sub, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 600,
    });
    return res;
  } catch (err) {
    console.error('[concept2/connect] failed:', err);
    const reason = err instanceof Error ? err.message.slice(0, 120) : 'connect_failed';
    return NextResponse.redirect(
      new URL(`/settings?concept2=error&reason=${encodeURIComponent(reason)}`, origin),
    );
  }
}
