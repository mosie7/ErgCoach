import { prisma } from '@ergcoach/database';
import {
  createConcept2Client,
  type Concept2OAuthConfig,
  type Concept2Tokens,
} from '@ergcoach/concept2';
import { getActiveTrainingBlock } from './blocks.js';
import { createManualWorkout } from './workouts.js';

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').trim().replace(/\/$/, '');
}

export function getConcept2RedirectUri(): string {
  return (
    process.env.CONCEPT2_REDIRECT_URI?.trim() ||
    `${appBaseUrl()}/api/concept2/callback`
  );
}

function getConcept2Config(): Concept2OAuthConfig {
  return {
    clientId: process.env.CONCEPT2_CLIENT_ID?.trim() ?? '',
    clientSecret: process.env.CONCEPT2_CLIENT_SECRET?.trim() ?? '',
    redirectUri: getConcept2RedirectUri(),
    authUrl:
      process.env.CONCEPT2_AUTH_URL?.trim() || 'https://log.concept2.com/oauth/authorize',
    tokenUrl:
      process.env.CONCEPT2_TOKEN_URL?.trim() || 'https://log.concept2.com/oauth/access_token',
    apiBaseUrl: process.env.CONCEPT2_API_BASE_URL?.trim() || 'https://log.concept2.com/api',
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
  return saveConcept2Tokens(userId, tokens, { mock: useMock, source: 'oauth' });
}

/**
 * Personal-use path from Concept2 docs:
 * Edit Profile → Applications → Concept2 Logbook API integration → long-lived token.
 * Bypasses OAuth app redirect registration.
 */
export async function connectConcept2WithAccessToken(userId: string, accessToken: string) {
  const token = accessToken.trim();
  if (!token || token.length < 20) {
    throw new Error('Paste a valid Concept2 access token');
  }

  const cfg = getConcept2Config();
  const res = await fetch(`${cfg.apiBaseUrl}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.c2logbook.v1+json',
    },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(
      `Concept2 rejected that token (${res.status})${detail ? `: ${detail.slice(0, 120)}` : ''}`,
    );
  }
  const body = (await res.json()) as { data?: { id?: number | string; username?: string } };
  const externalUserId =
    body.data?.id != null
      ? String(body.data.id)
      : body.data?.username
        ? String(body.data.username)
        : null;

  const tokens: Concept2Tokens = {
    accessToken: token,
    // Personal tokens are long-lived; skip refresh.
    expiresAt: new Date(Date.now() + 365 * 86400_000),
    scope: 'user:read,results:read',
    tokenType: 'Bearer',
  };

  return saveConcept2Tokens(userId, tokens, {
    mock: false,
    source: 'personal_token',
    externalUserId,
  });
}

async function saveConcept2Tokens(
  userId: string,
  tokens: Concept2Tokens,
  meta: { mock: boolean; source: string; externalUserId?: string | null },
) {
  const connection = await prisma.dataConnection.upsert({
    where: { userId_provider: { userId, provider: 'concept2' } },
    create: {
      userId,
      provider: 'concept2',
      accessTokenEnc: encodeToken(tokens),
      refreshTokenEnc: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
      externalUserId: meta.externalUserId ?? null,
      metadata: { mock: meta.mock, source: meta.source, backfillPage: 1 },
    },
    update: {
      accessTokenEnc: encodeToken(tokens),
      refreshTokenEnc: tokens.refreshToken ?? null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      scope: tokens.scope ?? null,
      externalUserId: meta.externalUserId ?? null,
      metadata: { mock: meta.mock, source: meta.source, backfillPage: 1 },
    },
  });

  try {
    await prisma.dataConnection.update({
      where: { id: String(connection.id) },
      data: { lastSyncAt: new Date(0) },
    });
  } catch (err) {
    console.error('[concept2] failed to reset sync cursor:', err);
  }

  return connection;
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
  options?: { full?: boolean; limit?: number },
) {
  // Amplify SSR ~30s timeout — keep each request small; client loops on hasMore.
  const limit = Math.min(Math.max(options?.limit ?? 10, 1), 20);

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

  const meta = {
    ...((connection?.metadata as Record<string, unknown> | null) ?? {}),
  };
  let backfillPage =
    typeof meta.backfillPage === 'number' && meta.backfillPage > 0
      ? Math.floor(meta.backfillPage)
      : null;
  if (options?.full) {
    backfillPage = 1;
  }

  // Full sync / reconnect / in-progress backfill ignores lastSyncAt.
  const lastSyncAt = connection?.lastSyncAt ? new Date(connection.lastSyncAt) : null;
  const hasUsableCursor =
    lastSyncAt != null &&
    !Number.isNaN(lastSyncAt.getTime()) &&
    lastSyncAt.getTime() > 0 &&
    known.size > 0 &&
    backfillPage == null;
  const usingBackfill = options?.full || !hasUsableCursor || backfillPage != null;
  const page = backfillPage ?? 1;

  const { workouts, hasMorePages } = await client.getWorkouts(
    usingBackfill
      ? { page, perPage: 50, maxPages: 1 }
      : { updatedAfter: lastSyncAt!, maxPages: 2, perPage: 50 },
  );

  const candidates = workouts.filter(
    (w) => !!w.externalId && !known.has(w.externalId),
  );
  const batch = candidates.slice(0, limit);
  const moreOnPage = candidates.length > limit;
  const skippedDuplicates = workouts.length - candidates.length;

  const activeBlock = await getActiveTrainingBlock(athleteId);
  const importErrors: string[] = [];
  let importedCount = 0;

  for (const w of batch) {
    try {
      const inBlock =
        activeBlock &&
        w.startedAt >= new Date(activeBlock.startDate) &&
        (!activeBlock.endDate || w.startedAt <= new Date(activeBlock.endDate));

      await createManualWorkout({
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
        splits: w.splits?.slice(0, 40),
        source: 'concept2',
        externalId: w.externalId,
        // Skip bulky raw payloads during bulk sync (keeps Dynamo writes under timeout).
        trainingBlockId: inBlock ? activeBlock!.id : null,
        skipBlockResolve: true,
        analyse: false,
      });
      importedCount += 1;
    } catch (err) {
      importErrors.push(
        `import:${w.externalId}:${err instanceof Error ? err.message : 'failed'}`,
      );
    }
  }

  let nextBackfillPage: number | null = null;
  let done = false;
  if (usingBackfill) {
    if (moreOnPage) {
      nextBackfillPage = page;
    } else if (hasMorePages) {
      nextBackfillPage = page + 1;
    } else {
      done = true;
    }
  } else {
    done = !moreOnPage && !hasMorePages;
  }

  if (connection) {
    await prisma.dataConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncAt: done ? new Date() : connection.lastSyncAt ?? new Date(0),
        metadata: {
          ...meta,
          backfillPage: nextBackfillPage,
        },
      },
    });
  }

  return {
    importedCount,
    fetchedCount: workouts.length,
    skippedDuplicates,
    hasMore: !done,
    backfillPage: nextBackfillPage,
    importErrors: importErrors.slice(0, 5),
    mode: shouldUseConcept2Mock() ? 'mock' : 'live',
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
