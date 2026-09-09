import { prisma } from '@ergcoach/database';
import {
  createConcept2Client,
  type Concept2OAuthConfig,
  type Concept2Tokens,
} from '@ergcoach/concept2';
import { createManualWorkout } from './workouts.js';

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

function getConcept2Config(): Concept2OAuthConfig {
  return {
    clientId: process.env.CONCEPT2_CLIENT_ID ?? '',
    clientSecret: process.env.CONCEPT2_CLIENT_SECRET ?? '',
    redirectUri:
      process.env.CONCEPT2_REDIRECT_URI ?? `${appBaseUrl()}/api/concept2/callback`,
    authUrl: process.env.CONCEPT2_AUTH_URL ?? 'https://log.concept2.com/oauth/authorize',
    tokenUrl: process.env.CONCEPT2_TOKEN_URL ?? 'https://log.concept2.com/oauth/access_token',
    apiBaseUrl: process.env.CONCEPT2_API_BASE_URL ?? 'https://log.concept2.com/api',
  };
}

/** Live when credentials exist unless CONCEPT2_USE_MOCK=true. */
export function shouldUseConcept2Mock(): boolean {
  if (process.env.CONCEPT2_USE_MOCK === 'true') return true;
  if (process.env.CONCEPT2_USE_MOCK === 'false') return false;
  const cfg = getConcept2Config();
  return !cfg.clientId || !cfg.clientSecret;
}

function encodeToken(tokens: Concept2Tokens): string {
  // MVP encoding — replace with KMS/envelope encryption in hardened production
  return Buffer.from(
    JSON.stringify({
      ...tokens,
      expiresAt: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
    }),
  ).toString('base64url');
}

function decodeToken(enc: string | null | undefined): Concept2Tokens | null {
  if (!enc) return null;
  try {
    const parsed = JSON.parse(Buffer.from(enc, 'base64url').toString('utf8')) as Record<
      string,
      unknown
    >;
    const expiresRaw = parsed['expiresAt'];
    const expiresAt =
      expiresRaw instanceof Date
        ? expiresRaw
        : typeof expiresRaw === 'string' || typeof expiresRaw === 'number'
          ? new Date(expiresRaw)
          : undefined;
    return {
      accessToken: String(parsed['accessToken'] ?? ''),
      refreshToken:
        parsed['refreshToken'] != null ? String(parsed['refreshToken']) : undefined,
      expiresAt:
        expiresAt && !Number.isNaN(expiresAt.getTime()) ? expiresAt : undefined,
      tokenType: parsed['tokenType'] != null ? String(parsed['tokenType']) : undefined,
      scope: parsed['scope'] != null ? String(parsed['scope']) : undefined,
    };
  } catch {
    return null;
  }
}

export function getConcept2AuthUrl(state: string): string {
  const client = createConcept2Client(getConcept2Config(), {
    useMock: shouldUseConcept2Mock(),
  });
  return client.getAuthorizationUrl(state);
}

export async function completeConcept2OAuth(userId: string, code: string) {
  const useMock = shouldUseConcept2Mock();
  const client = createConcept2Client(getConcept2Config(), { useMock });
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
      metadata: { mock: useMock },
    },
    update: {
      accessTokenEnc: encodeToken(tokens),
      refreshTokenEnc: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
      metadata: { mock: useMock },
      // Clear stale sync cursor so the next sync pulls full history after reconnect.
      lastSyncAt: null,
    },
  });
}

export async function disconnectConcept2(userId: string) {
  await prisma.dataConnection.deleteMany({
    where: { userId, provider: 'concept2' },
  });
}

export async function getConcept2Connection(userId: string) {
  return prisma.dataConnection.findUnique({
    where: { userId_provider: { userId, provider: 'concept2' } },
  });
}

export async function syncConcept2Workouts(
  userId: string,
  athleteId: string,
  options?: { full?: boolean },
) {
  const connection = await prisma.dataConnection.findUnique({
    where: { userId_provider: { userId, provider: 'concept2' } },
  });
  if (!connection?.accessTokenEnc && !shouldUseConcept2Mock()) {
    throw new Error('Concept2 is not connected for this account');
  }

  let tokens = decodeToken(connection?.accessTokenEnc);
  if (!shouldUseConcept2Mock() && (!tokens || !tokens.accessToken)) {
    throw new Error('Concept2 tokens are missing or corrupt — reconnect Concept2 in Settings');
  }

  const client = createConcept2Client(getConcept2Config(), {
    useMock: shouldUseConcept2Mock(),
    tokens,
  });

  // Refresh token if expired / about to expire
  if (
    !shouldUseConcept2Mock() &&
    tokens?.refreshToken &&
    tokens.expiresAt &&
    tokens.expiresAt.getTime() < Date.now() + 60_000
  ) {
    const refreshed = await client.refreshToken(tokens);
    tokens = refreshed;
    await prisma.dataConnection.update({
      where: { id: connection!.id },
      data: {
        accessTokenEnc: encodeToken(refreshed),
        refreshTokenEnc: refreshed.refreshToken ?? tokens.refreshToken,
        tokenExpiresAt: refreshed.expiresAt ?? null,
      },
    });
  }

  const existing = await prisma.workout.findMany({
    where: { athleteId, source: 'concept2' },
    select: { externalId: true },
  });
  const known = new Set<string>(
    existing
      .map((e: { externalId?: string | null }) => e.externalId)
      .filter((id): id is string => !!id),
  );

  // Full sync (reconnect / explicit) ignores lastSyncAt so historical workouts return.
  // Also ignore a stale cursor when nothing has ever been imported successfully.
  const updatedAfter =
    options?.full || !connection?.lastSyncAt || known.size === 0
      ? undefined
      : connection.lastSyncAt;

  const result = await client.syncWorkouts({
    updatedAfter,
    knownExternalIds: known,
  });

  const imported: Awaited<ReturnType<typeof createManualWorkout>>[] = [];
  const importErrors: string[] = [];

  for (const w of result.imported) {
    try {
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
        // Analysis can be slow / flaky — don't block the whole import batch.
        analyse: false,
      });
      imported.push(created);
      // Best-effort analysis after successful create
      try {
        const { runPostWorkoutAnalysis } = await import('./analysis.js');
        await runPostWorkoutAnalysis(created.id);
      } catch (err) {
        importErrors.push(
          `analysis:${w.externalId}:${err instanceof Error ? err.message : 'failed'}`,
        );
      }
    } catch (err) {
      importErrors.push(
        `import:${w.externalId}:${err instanceof Error ? err.message : 'failed'}`,
      );
    }
  }

  if (connection) {
    await prisma.dataConnection.update({
      where: { id: connection.id },
      data: { lastSyncAt: new Date() },
    });
  }

  return {
    importedCount: imported.length,
    fetchedCount: result.imported.length + result.skippedDuplicateIds.length,
    skippedDuplicates: result.skippedDuplicateIds.length,
    importErrors: importErrors.slice(0, 5),
    mode: shouldUseConcept2Mock() ? 'mock' : 'live',
    workouts: imported,
  };
}

export async function handleConcept2Webhook(payload: unknown, headers?: Record<string, string>) {
  const client = createConcept2Client(getConcept2Config(), {
    useMock: shouldUseConcept2Mock(),
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
