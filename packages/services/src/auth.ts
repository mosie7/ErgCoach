import { prisma, type User } from '@ergcoach/database';

/**
 * App identity helpers. Authentication itself is Amazon Cognito via Amplify Auth
 * in the Next.js app (`signIn` / `signUp` / cookie session).
 * `User.id` is always the Cognito `sub`.
 */
export async function ensureAppUser(input: {
  sub: string;
  email: string;
  displayName?: string;
}): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { id: input.sub } });
  if (existing) return existing;

  const displayName =
    input.displayName?.trim() || input.email.split('@')[0] || 'Athlete';

  try {
    return await prisma.user.create({
      data: {
        id: input.sub,
        email: input.email.toLowerCase(),
        displayName,
        authProvider: 'cognito',
        externalAuthId: input.sub,
        athleteProfile: {
          create: {
            preferredUnits: 'metric',
            hrZoneMethod: 'lthr',
          },
        },
        subscription: {
          create: {
            plan: 'free',
            status: 'inactive',
          },
        },
      },
    });
  } catch (err) {
    const raced = await prisma.user.findUnique({ where: { id: input.sub } });
    if (raced) return raced;
    const detail = err instanceof Error ? err.message : 'unknown error';
    throw new Error(`Could not provision user profile: ${detail}`);
  }
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
