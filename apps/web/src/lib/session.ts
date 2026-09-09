import { redirect } from 'next/navigation';
import { ensureAppUser, getAthleteByUserId } from '@ergcoach/services';
import { getAmplifyServerUser } from './amplify-server';
import './amplify-data';

export async function getSessionUser() {
  try {
    const cognito = await getAmplifyServerUser();
    if (!cognito) return null;
    return await ensureAppUser({
      sub: cognito.sub,
      email: cognito.email,
      displayName: cognito.displayName,
    });
  } catch (error) {
    console.error('[session] getSessionUser failed', error);
    return null;
  }
}

/** Current signed-in Cognito user + athlete profile. */
export async function getSessionAthlete() {
  try {
    const user = await getSessionUser();
    if (!user) return null;
    const athlete = await getAthleteByUserId(user.id);
    if (!athlete) return null;
    return { user, athlete };
  } catch (error) {
    console.error('[session] getSessionAthlete failed', error);
    return null;
  }
}

export async function requireSessionAthlete() {
  const session = await getSessionAthlete();
  if (!session) {
    redirect('/login');
  }
  return session;
}

/** Cognito subject for the current session (replaces ergcoach_session cookie). */
export async function getSessionToken(): Promise<string | null> {
  const cognito = await getAmplifyServerUser();
  return cognito?.sub ?? null;
}
