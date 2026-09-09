import { prisma } from '@ergcoach/database';
import {
  createConcept2Client,
  type Concept2OAuthConfig,
  type Concept2Tokens,
} from '@ergcoach/concept2';
import { createManualWorkout } from './workouts.js';

function getConcept2Config(): Concept2OAuthConfig {
  return {
    clientId: process.env.CONCEPT2_CLIENT_ID ?? '',
    clientSecret: process.env.CONCEPT2_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.CONCEPT2_REDIRECT_URI ?? 'http://localhost:3000/api/concept2/callback',
    authUrl: process.env.CONCEPT2_AUTH_URL ?? 'https://log.concept2.com/oauth/authorize',
    tokenUrl: process.env.CONCEPT2_TOKEN_URL ?? 'https://log.concept2.com/oauth/access_token',
    apiBaseUrl: process.env.CONCEPT2_API_BASE_URL ?? 'https://log.concept2.com/api',
  };
}

function encodeToken(tokens: Concept2Tokens): string {
  // Local-dev encoding only — replace with KMS/envelope encryption in production
  return Buffer.from(JSON.stringify(tokens)).toString('base64url');
}

function decodeToken(enc: string | null | undefined): Concept2Tokens | null {
  if (!enc) return null;
  try {
    return JSON.parse(Buffer.from(enc, 'base64url').toString('utf8')) as Concept2Tokens;
  } catch {
    return null;
  }
}

export function getConcept2AuthUrl(state: string): string {
  const client = createConcept2Client(getConcept2Config(), {
    useMock: process.env.CONCEPT2_USE_MOCK !== 'false',
  });
  return client.getAuthorizationUrl(state);
}

export async function completeConcept2OAuth(userId: string, code: string) {
  const client = createConcept2Client(getConcept2Config(), {
    useMock: process.env.CONCEPT2_USE_MOCK !== 'false',
  });
  const tokens = await client.connect(code);
  return prisma.dataConnection.upsert({
    where: { userId_provider: { userId, provider: 'concept2' } },
    create: {
      userId,
      provider: 'concept2',
      accessTokenEnc: encodeToken(tokens),
      refreshTokenEnc: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
      metadata: { mock: process.env.CONCEPT2_USE_MOCK !== 'false' },
    },
    update: {
      accessTokenEnc: encodeToken(tokens),
      refreshTokenEnc: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
    },
  });
}

export async function syncConcept2Workouts(userId: string, athleteId: string) {
  const connection = await prisma.dataConnection.findUnique({
    where: { userId_provider: { userId, provider: 'concept2' } },
  });
  const tokens = decodeToken(connection?.accessTokenEnc);
  const client = createConcept2Client(getConcept2Config(), {
    useMock: process.env.CONCEPT2_USE_MOCK !== 'false' || !tokens,
    tokens,
  });

  const existing = await prisma.workout.findMany({
    where: { athleteId, source: 'concept2' },
    select: { externalId: true },
  });
  const known = new Set(existing.map((e) => e.externalId).filter((id): id is string => !!id));

  const result = await client.syncWorkouts({
    updatedAfter: connection?.lastSyncAt ?? undefined,
    knownExternalIds: known,
  });

  const imported = [];
  for (const w of result.imported) {
    const created = await createManualWorkout({
      athleteId,
      startedAt: w.startedAt,
      workoutType: 'unknown',
      title: `Concept2 ${w.sport} ${Math.round(w.distanceMeters)}m`,
      durationSeconds: w.durationSeconds,
      distanceMeters: w.distanceMeters,
      averagePaceSeconds500m: w.averagePaceSeconds500m,
      averageWatts: w.averageWatts,
      averageHeartRate: w.averageHeartRate,
      maxHeartRate: w.maxHeartRate,
      averageStrokeRate: w.averageStrokeRate,
      splits: w.splits,
      source: 'concept2',
      externalId: w.externalId,
      rawData: w.raw,
      analyse: true,
    });
    imported.push(created);
  }

  if (connection) {
    await prisma.dataConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return {
    importedCount: imported.length,
    skippedDuplicates: result.skippedDuplicateIds.length,
    workouts: imported,
  };
}

export async function handleConcept2Webhook(payload: unknown, headers?: Record<string, string>) {
  const client = createConcept2Client(getConcept2Config(), {
    useMock: process.env.CONCEPT2_USE_MOCK !== 'false',
  });
  const result = await client.handleWebhook(payload, headers);
  await prisma.webhookEvent.create({
    data: {
      provider: 'concept2',
      eventType: result.eventType,
      payload: (payload as object) ?? {},
      status: result.accepted ? 'accepted' : 'rejected',
    },
  });
  return result;
}
