import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthProvider, getAthleteByUserId } from '@ergcoach/services';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ergcoach_session')?.value;
  if (!token) return null;
  return getAuthProvider().getUserFromSession(token);
}

/** Current signed-in user + athlete profile. No demo/seed fallback. */
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

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('ergcoach_session')?.value ?? null;
}
