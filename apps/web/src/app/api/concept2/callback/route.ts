import { NextResponse } from 'next/server';
import {
  completeConcept2OAuth,
  ensureAppUser,
  shouldUseConcept2Mock,
} from '@ergcoach/services';
import { getAmplifyServerUser } from '@/lib/amplify-server';
import '@/lib/amplify-data';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const origin = (process.env.NEXT_PUBLIC_APP_URL ?? reqUrl.origin).trim().replace(/\/$/, '');
  const code = reqUrl.searchParams.get('code');
  const state = reqUrl.searchParams.get('state');
  const oauthError = reqUrl.searchParams.get('error');
  const cookieStore = await cookies();
  const expected = cookieStore.get('concept2_oauth_state')?.value;
  const oauthUserId = cookieStore.get('concept2_oauth_user')?.value;

  const clear = (res: NextResponse) => {
    res.cookies.set('concept2_oauth_state', '', { path: '/', maxAge: 0 });
    res.cookies.set('concept2_oauth_user', '', { path: '/', maxAge: 0 });
    return res;
  };

  if (oauthError) {
    return clear(
      NextResponse.redirect(
        new URL(`/settings?concept2=error&reason=${encodeURIComponent(oauthError)}`, origin),
      ),
    );
  }

  const cognito = await getAmplifyServerUser();
  if (!cognito?.sub) {
    return clear(NextResponse.redirect(new URL('/login?next=/settings', origin)));
  }

  if (!shouldUseConcept2Mock() && (!state || !expected || state !== expected)) {
    return clear(
      NextResponse.redirect(new URL('/settings?concept2=error&reason=invalid_state', origin)),
    );
  }

  if (oauthUserId && oauthUserId !== cognito.sub) {
    return clear(
      NextResponse.redirect(new URL('/settings?concept2=error&reason=session_mismatch', origin)),
    );
  }

  if (!code && !shouldUseConcept2Mock()) {
    return clear(
      NextResponse.redirect(new URL('/settings?concept2=error&reason=missing_code', origin)),
    );
  }

  try {
    await ensureAppUser({
      sub: cognito.sub,
      email: cognito.email,
      displayName: cognito.displayName,
    });
  } catch (err) {
    console.error('[concept2/callback] ensureAppUser failed:', err);
    return clear(
      NextResponse.redirect(
        new URL(
          `/settings?concept2=error&reason=${encodeURIComponent('profile_provision_failed')}`,
          origin,
        ),
      ),
    );
  }

  try {
    await completeConcept2OAuth(cognito.sub, code ?? 'missing-code');
  } catch (err) {
    console.error('[concept2/callback] token/save failed:', err);
    const reason = err instanceof Error ? err.message.slice(0, 120) : 'token_exchange_failed';
    return clear(
      NextResponse.redirect(
        new URL(`/settings?concept2=error&reason=${encodeURIComponent(reason)}`, origin),
      ),
    );
  }

  return clear(NextResponse.redirect(new URL('/settings?concept2=connected', origin)));
}
