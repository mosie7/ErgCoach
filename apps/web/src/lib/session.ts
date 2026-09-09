import { cookies } from 'next/headers';
import { getAuthProvider, getAthleteByUserId } from '@ergcoach/services';

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get('ergcoach_session')?.value;
  if (!token) return null;
  return getAuthProvider().getUserFromSession(token);
}

export async function requireAthlete() {
  const user = await getSessionUser();
  if (!user) return null;
  const athlete = await getAthleteByUserId(user.id);
  if (!athlete) return null;
  return { user, athlete };
}

export async function getDemoAthleteId(): Promise<string | null> {
  const session = await requireAthlete();
  if (session) return session.athlete.id;
  // Fallback for local demo: first synthetic athlete
  const { prisma } = await import('@ergcoach/database');
  const athlete = await prisma.athleteProfile.findFirst({
    where: { isSyntheticSeed: true },
    orderBy: { createdAt: 'asc' },
  });
  return athlete?.id ?? null;
}
