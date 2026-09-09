/**
 * Concept2 Logbook API types and client interface.
 *
 * IMPORTANT: Endpoint paths, OAuth URLs, and response field names marked VERIFY
 * must be confirmed against Concept2's current developer documentation before
 * enabling live API mode. Mock fixtures are used for local development.
 *
 * Docs reference (verify current): https://log.concept2.com/developers
 */

export interface Concept2Tokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
}

export interface Concept2OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  /** VERIFY against Concept2 docs */
  authUrl: string;
  /** VERIFY against Concept2 docs */
  tokenUrl: string;
  /** VERIFY against Concept2 docs */
  apiBaseUrl: string;
}

/**
 * Normalised workout shape used inside ErgCoach.
 * Raw API payloads are preserved separately for auditing.
 */
export interface Concept2NormalizedWorkout {
  externalId: string;
  startedAt: Date;
  sport: 'rower' | 'bikeerg' | 'skierg' | 'other';
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSeconds500m: number | null;
  averageWatts: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averageStrokeRate: number | null;
  splits: Concept2NormalizedSplit[];
  raw: unknown;
}

export interface Concept2NormalizedSplit {
  index: number;
  durationSeconds: number;
  distanceMeters: number;
  paceSeconds500m: number | null;
  watts: number | null;
  heartRate: number | null;
  strokeRate: number | null;
}

export interface Concept2SyncResult {
  imported: Concept2NormalizedWorkout[];
  updated: Concept2NormalizedWorkout[];
  skippedDuplicateIds: string[];
  /** True when more Concept2 result pages remain beyond this fetch. */
  hasMorePages?: boolean;
}

export interface Concept2WebhookResult {
  accepted: boolean;
  eventType: string;
  externalWorkoutId?: string;
  note: string;
}

/**
 * Adapter interface — isolate Concept2 behind this contract so Garmin/Strava
 * can follow the same ingestion pattern later.
 */
export interface Concept2Client {
  getAuthorizationUrl(state: string): string;
  connect(authorizationCode: string): Promise<Concept2Tokens>;
  refreshToken(tokens: Concept2Tokens): Promise<Concept2Tokens>;
  getWorkouts(options?: {
    updatedAfter?: Date;
    page?: number;
    perPage?: number;
    maxPages?: number;
  }): Promise<{ workouts: Concept2NormalizedWorkout[]; hasMorePages: boolean }>;
  getWorkout(id: string): Promise<Concept2NormalizedWorkout | null>;
  syncWorkouts(options?: {
    updatedAfter?: Date;
    knownExternalIds?: Set<string>;
    maxPages?: number;
    perPage?: number;
  }): Promise<Concept2SyncResult>;
  handleWebhook(payload: unknown, headers?: Record<string, string>): Promise<Concept2WebhookResult>;
}
