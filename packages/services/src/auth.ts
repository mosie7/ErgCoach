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
  const displayName =
    input.displayName?.trim() || input.email.split('@')[0] || 'Athlete';

  let user = await prisma.user.findUnique({ where: { id: input.sub } });

  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: input.sub,
          email: input.email.toLowerCase(),
          displayName,
          authProvider: 'cognito',
          externalAuthId: input.sub,
        },
      });
    } catch (err) {
      user = await prisma.user.findUnique({ where: { id: input.sub } });
      if (!user) {
        const detail = err instanceof Error ? err.message : 'unknown error';
        throw new Error(`Could not provision user profile: ${detail}`);
      }
    }
  }

  const athlete = await prisma.athleteProfile.findUnique({ where: { userId: input.sub } });
  if (!athlete) {
    try {
      await prisma.athleteProfile.create({
        data: {
          userId: input.sub,
          preferredUnits: 'metric',
          hrZoneMethod: 'lthr',
        },
      });
    } catch {
      // Race with post-confirmation — ignore if another writer won.
    }
  }

  const subscription = await prisma.subscription.findUnique({ where: { userId: input.sub } });
  if (!subscription) {
    try {
      await prisma.subscription.create({
        data: {
          userId: input.sub,
          plan: 'free',
          status: 'inactive',
        },
      });
    } catch {
      // Race with post-confirmation — ignore if another writer won.
    }
  }

  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
