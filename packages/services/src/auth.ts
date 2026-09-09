import { createHash, randomBytes } from 'node:crypto';
import { prisma, type User } from '@ergcoach/database';

/**
 * Auth abstraction — local SHA-256 for MVP.
 * Swap implementation for Cognito/Auth0/Clerk without changing callers.
 */
export interface AuthProvider {
  register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<User>;
  login(email: string, password: string): Promise<{ user: User; sessionToken: string }>;
  logout(sessionToken: string): Promise<void>;
  getUserFromSession(sessionToken: string): Promise<User | null>;
}

function hashPassword(password: string): string {
  return createHash('sha256').update(`ergcoach:${password}`).digest('hex');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export class LocalAuthProvider implements AuthProvider {
  async register(input: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<User> {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) {
      throw new Error('An account with this email already exists');
    }
    if (input.password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    return prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        displayName: input.displayName.trim(),
        passwordHash: hashPassword(input.password),
        authProvider: 'local',
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
  }

  async login(email: string, password: string): Promise<{ user: User; sessionToken: string }> {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user?.passwordHash || user.passwordHash !== hashPassword(password)) {
      throw new Error('Invalid email or password');
    }
    const sessionToken = randomBytes(32).toString('hex');
    await prisma.authSession.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        expiresAt: new Date(Date.now() + 30 * 24 * 3600_000),
      },
    });
    return { user, sessionToken };
  }

  async logout(sessionToken: string): Promise<void> {
    await prisma.authSession.deleteMany({ where: { tokenHash: hashToken(sessionToken) } });
  }

  async getUserFromSession(sessionToken: string): Promise<User | null> {
    const session = await prisma.authSession.findUnique({
      where: { tokenHash: hashToken(sessionToken) },
      include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.authSession.delete({ where: { id: session.id } });
      }
      return null;
    }
    return session.user;
  }
}

let authSingleton: AuthProvider | null = null;

export function getAuthProvider(): AuthProvider {
  if (!authSingleton) {
    authSingleton = new LocalAuthProvider();
  }
  return authSingleton;
}

export async function registerAndLogin(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ user: User; sessionToken: string }> {
  const auth = getAuthProvider();
  await auth.register(input);
  return auth.login(input.email, input.password);
}
