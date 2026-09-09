import { normalizeConcept2Workout } from './normalize.js';
import type {
  Concept2Client,
  Concept2NormalizedWorkout,
  Concept2OAuthConfig,
  Concept2SyncResult,
  Concept2Tokens,
  Concept2WebhookResult,
} from './types.js';
import { mockWorkouts } from './fixtures.js';

const DEFAULT_SCOPE = 'user:read,results:read';

/**
 * Mock Concept2 client for local development without API credentials.
 */
export class MockConcept2Client implements Concept2Client {
  constructor(
    private readonly config: Concept2OAuthConfig,
    private tokens: Concept2Tokens | null = null,
  ) {}

  getAuthorizationUrl(state: string): string {
    const url = new URL(this.config.authUrl);
    url.searchParams.set('client_id', this.config.clientId || 'mock-client');
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DEFAULT_SCOPE);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async connect(authorizationCode: string): Promise<Concept2Tokens> {
    this.tokens = {
      accessToken: `mock-access-${authorizationCode || 'demo'}`,
      refreshToken: 'mock-refresh',
      expiresAt: new Date(Date.now() + 3600_000),
      scope: DEFAULT_SCOPE,
    };
    return this.tokens;
  }

  async refreshToken(tokens: Concept2Tokens): Promise<Concept2Tokens> {
    this.tokens = {
      ...tokens,
      accessToken: `mock-access-refreshed-${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600_000),
    };
    return this.tokens;
  }

  async getWorkouts(): Promise<Concept2NormalizedWorkout[]> {
    return mockWorkouts.map((w) => normalizeConcept2Workout(w));
  }

  async getWorkout(id: string): Promise<Concept2NormalizedWorkout | null> {
    const found = mockWorkouts.find((w) => String(w['id']) === id);
    return found ? normalizeConcept2Workout(found) : null;
  }

  async syncWorkouts(options?: {
    updatedAfter?: Date;
    knownExternalIds?: Set<string>;
  }): Promise<Concept2SyncResult> {
    const all = await this.getWorkouts();
    const imported: Concept2NormalizedWorkout[] = [];
    const skippedDuplicateIds: string[] = [];
    for (const w of all) {
      if (options?.knownExternalIds?.has(w.externalId)) {
        skippedDuplicateIds.push(w.externalId);
      } else {
        imported.push(w);
      }
    }
    return { imported, updated: [], skippedDuplicateIds };
  }

  async handleWebhook(payload: unknown): Promise<Concept2WebhookResult> {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      accepted: true,
      eventType: String(body['type'] ?? body['event'] ?? 'workout.updated'),
      externalWorkoutId: body['id'] != null ? String(body['id']) : undefined,
      note: 'Mock webhook accepted — wire to real Concept2 webhook verification later',
    };
  }
}

/**
 * Live Concept2 Logbook HTTP client.
 * Docs: https://log.concept2.com/developers/documentation/
 */
export class HttpConcept2Client implements Concept2Client {
  constructor(
    private readonly config: Concept2OAuthConfig,
    private tokens: Concept2Tokens | null = null,
  ) {}

  getAuthorizationUrl(state: string): string {
    const url = new URL(this.config.authUrl);
    url.searchParams.set('client_id', this.config.clientId);
    url.searchParams.set('redirect_uri', this.config.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', DEFAULT_SCOPE);
    url.searchParams.set('state', state);
    return url.toString();
  }

  async connect(authorizationCode: string): Promise<Concept2Tokens> {
    const res = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: this.config.redirectUri,
        scope: DEFAULT_SCOPE,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `Concept2 token exchange failed: ${res.status}${detail ? ` — ${detail.slice(0, 180)}` : ''}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    this.tokens = parseTokenResponse(data);
    return this.tokens;
  }

  async refreshToken(tokens: Concept2Tokens): Promise<Concept2Tokens> {
    if (!tokens.refreshToken) {
      throw new Error('No refresh token available');
    }
    const res = await fetch(this.config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: tokens.refreshToken,
        scope: tokens.scope ?? DEFAULT_SCOPE,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `Concept2 token refresh failed: ${res.status}${detail ? ` — ${detail.slice(0, 180)}` : ''}`,
      );
    }
    const data = (await res.json()) as Record<string, unknown>;
    this.tokens = {
      ...parseTokenResponse(data),
      refreshToken:
        data['refresh_token'] != null ? String(data['refresh_token']) : tokens.refreshToken,
      scope: data['scope'] != null ? String(data['scope']) : tokens.scope,
    };
    return this.tokens;
  }

  async getWorkouts(options?: {
    updatedAfter?: Date;
    page?: number;
    perPage?: number;
  }): Promise<Concept2NormalizedWorkout[]> {
    const perPage = options?.perPage ?? 50;
    let page = options?.page ?? 1;
    const all: Concept2NormalizedWorkout[] = [];
    let totalPages = 1;

    do {
      const url = new URL(`${this.config.apiBaseUrl}/users/me/results`);
      url.searchParams.set('page', String(page));
      url.searchParams.set('per_page', String(perPage));
      if (options?.updatedAfter) {
        // Concept2 expects GMT "YYYY-MM-DD HH:MM:SS", not ISO-8601.
        url.searchParams.set('updated_after', formatConcept2DateTime(options.updatedAfter));
      }
      const res = await this.authorizedGet(url);
      const data = (await res.json()) as Record<string, unknown>;
      const rows = Array.isArray(data['data'])
        ? (data['data'] as Record<string, unknown>[])
        : Array.isArray(data)
          ? (data as Record<string, unknown>[])
          : [];
      all.push(...rows.map((r) => normalizeConcept2Workout(r)));

      const meta = data['meta'] as { pagination?: { total_pages?: number } } | undefined;
      totalPages = Number(meta?.pagination?.total_pages ?? 1) || 1;
      page += 1;
    } while (page <= totalPages && options?.page == null);

    return all;
  }

  async getWorkout(id: string): Promise<Concept2NormalizedWorkout | null> {
    const url = new URL(`${this.config.apiBaseUrl}/users/me/results/${id}`);
    const res = await this.authorizedGet(url);
    if (res.status === 404) return null;
    const data = (await res.json()) as Record<string, unknown>;
    const row = (data['data'] as Record<string, unknown> | undefined) ?? data;
    return normalizeConcept2Workout(row);
  }

  async syncWorkouts(options?: {
    updatedAfter?: Date;
    knownExternalIds?: Set<string>;
  }): Promise<Concept2SyncResult> {
    const workouts = await this.getWorkouts({ updatedAfter: options?.updatedAfter });
    const imported: Concept2NormalizedWorkout[] = [];
    const skippedDuplicateIds: string[] = [];
    for (const w of workouts) {
      if (!w.externalId) continue;
      if (options?.knownExternalIds?.has(w.externalId)) {
        skippedDuplicateIds.push(w.externalId);
      } else {
        imported.push(w);
      }
    }
    return { imported, updated: [], skippedDuplicateIds };
  }

  async handleWebhook(payload: unknown): Promise<Concept2WebhookResult> {
    const body = (payload ?? {}) as Record<string, unknown>;
    return {
      accepted: true,
      eventType: String(body['type'] ?? 'unknown'),
      externalWorkoutId: body['id'] != null ? String(body['id']) : undefined,
      note: 'Webhook infrastructure stub — verify signature & event schema with Concept2',
    };
  }

  private async authorizedGet(url: URL): Promise<Response> {
    if (!this.tokens?.accessToken) {
      throw new Error('Concept2 client not authenticated — reconnect Concept2 in Settings');
    }
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.tokens.accessToken}`,
        Accept: 'application/vnd.c2logbook.v1+json',
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `Concept2 API error ${res.status} for ${url.pathname}${detail ? ` — ${detail.slice(0, 180)}` : ''}`,
      );
    }
    return res;
  }
}

export function createConcept2Client(
  config: Concept2OAuthConfig,
  options?: { useMock?: boolean; tokens?: Concept2Tokens | null },
): Concept2Client {
  if (options?.useMock ?? process.env.CONCEPT2_USE_MOCK === 'true') {
    return new MockConcept2Client(config, options?.tokens ?? null);
  }
  return new HttpConcept2Client(config, options?.tokens ?? null);
}

function parseTokenResponse(data: Record<string, unknown>): Concept2Tokens {
  return {
    accessToken: String(data['access_token']),
    refreshToken: data['refresh_token'] != null ? String(data['refresh_token']) : undefined,
    expiresAt: data['expires_in']
      ? new Date(Date.now() + Number(data['expires_in']) * 1000)
      : undefined,
    tokenType: data['token_type'] != null ? String(data['token_type']) : undefined,
    scope: data['scope'] != null ? String(data['scope']) : undefined,
  };
}

/** Format a Date as Concept2 GMT "YYYY-MM-DD HH:MM:SS". */
export function formatConcept2DateTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`;
}
