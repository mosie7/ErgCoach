import { redirect } from 'next/navigation';
import { ensureAppUser, getAthleteByUserId } from '@ergcoach/services';
import { getAmplifyServerUser } from './amplify-server';
import './amplify-data';

export async function getSessionUser() {
  const cognito = await getAmplifyServerUser();
  if (!cognito) return null;
  return ensureAppUser({
    sub: cognito.sub,
    email: cognito.email,
    displayName: cognito.displayName,
  });
}

/** Current signed-in Cognito user + athlete profile. */
export async function getSessionAthlete() {
  const user = await getSessionUser();
  if (!user) return null;
  const athlete = await getAthleteByUserId(user.id);
  if (!athlete) return null;
  return { user, athlete };
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
