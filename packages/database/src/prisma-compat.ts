import { randomUUID } from 'node:crypto';
import { getDataClient, type AmplifyModelClient } from './client.js';
import type {
  AthleteProfile,
  Goal,
  HeartRateZone,
  PlannedWorkout,
  SubjectiveFeedback,
  TrainingBlock,
  TrainingPlan,
  User,
  Workout,
  WorkoutAnalysis,
  WorkoutSplit,
} from './types.js';

/** Prisma.JsonNull sentinel for coach-state upserts */
export namespace Prisma {
  export type InputJsonValue =
    | string
    | number
    | boolean
    | null
    | InputJsonObject
    | InputJsonArray
    | typeof JsonNull;
  export interface InputJsonObject {
    [key: string]: InputJsonValue;
  }
  export type InputJsonArray = InputJsonValue[];
  export const JsonNull: unique symbol = Symbol.for('ergcoach.prisma.JsonNull');
}

type WhereValue =
  | string
  | number
  | boolean
  | Date
  | null
  | { in?: readonly (string | number)[]; not?: unknown; gte?: Date; lte?: Date; lt?: Date; gt?: Date; contains?: string; mode?: string }
  | undefined;

type WhereClause = Record<string, WhereValue | WhereClause[]> & {
  OR?: WhereClause[];
  AND?: WhereClause[];
};

type OrderBy = Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;

type IncludeSpec = boolean | Record<string, unknown>;

interface FindArgs {
  where?: WhereClause;
  include?: Record<string, IncludeSpec>;
  select?: Record<string, boolean | Record<string, unknown>>;
  orderBy?: OrderBy;
  take?: number;
  skip?: number;
}

interface UpsertArgs<TCreate, TUpdate> {
  where: WhereClause;
  create: TCreate;
  update: TUpdate;
}

// Local-auth stubs (Cognito replaces in production)
const localPasswordHashes = new Map<string, string>();
const authSessions = new Map<
  string,
  { id: string; userId: string; tokenHash: string; expiresAt: Date; createdAt: Date }
>();

const DATE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'dateOfBirth',
  'targetDate',
  'startDate',
  'endDate',
  'startedAt',
  'weekStart',
  'weekEnd',
  'lastUpdatedAt',
  'tokenExpiresAt',
  'lastSyncAt',
  'processedAt',
  'currentPeriodEnd',
  'trialEndsAt',
  'generatedAt',
  'scheduledDate',
  'periodStart',
  'periodEnd',
  'expiresAt',
]);

const JSON_FIELDS = new Set([
  'rawData',
  'metadata',
  'payload',
  'summary',
  'toolCalls',
  'splits',
  'strokes',
  'subjectiveFeedback',
  'analysis',
  'plannedWorkouts',
  'hrZones',
  'strengths',
  'currentLimiters',
  'recentProgressSignals',
  'currentConcerns',
  'goalAssessment',
  'calculatedMetrics',
  'aiAnalysis',
]);

function isJsonNull(value: unknown): value is typeof Prisma.JsonNull {
  return value === Prisma.JsonNull;
}

function parseJsonField(value: unknown): unknown {
  if (value == null || isJsonNull(value)) return value === Prisma.JsonNull ? null : value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  }
  return value;
}

function serializeJsonField(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (isJsonNull(value)) return null;
  if (value === null) return null;
  // AppSync AWSJSON inputs must be JSON strings, not raw objects/arrays.
  if (typeof value === 'string') {
    try {
      JSON.parse(value);
      return value;
    } catch {
      return JSON.stringify(value);
    }
  }
  return JSON.stringify(value);
}

function coerceDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function serializeDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function coerceRecord<T extends Record<string, unknown>>(row: T | null | undefined): T | null {
  if (!row) return null;
  const out = { ...row } as Record<string, unknown>;
  for (const key of Object.keys(out)) {
    if (DATE_FIELDS.has(key)) {
      out[key] = coerceDate(out[key]);
    } else if (JSON_FIELDS.has(key)) {
      out[key] = parseJsonField(out[key]);
    }
  }
  return out as T;
}

function serializeRecord(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (isJsonNull(value)) {
      out[key] = null;
      continue;
    }
    if (DATE_FIELDS.has(key)) {
      out[key] = serializeDate(value);
    } else if (JSON_FIELDS.has(key)) {
      out[key] = serializeJsonField(value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function compareValues(a: unknown, b: unknown): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b));
}

function matchField(record: Record<string, unknown>, key: string, expected: WhereValue): boolean {
  const actual = record[key];
  if (expected == null || typeof expected !== 'object' || expected instanceof Date) {
    if (expected instanceof Date) return coerceDate(actual)?.getTime() === expected.getTime();
    return actual === expected;
  }
  if ('in' in expected && expected.in) {
    return expected.in.some((v) => v === actual);
  }
  if ('not' in expected) {
    const n = expected.not;
    if (n && typeof n === 'object' && n !== null && !Array.isArray(n)) return true;
    return actual !== n;
  }
  if ('gte' in expected && expected.gte != null) {
    if (compareValues(actual, expected.gte) < 0) return false;
  }
  if ('gt' in expected && expected.gt != null) {
    if (compareValues(actual, expected.gt) <= 0) return false;
  }
  if ('lte' in expected && expected.lte != null) {
    if (compareValues(actual, expected.lte) > 0) return false;
  }
  if ('lt' in expected && expected.lt != null) {
    if (compareValues(actual, expected.lt) >= 0) return false;
  }
  if ('contains' in expected && expected.contains != null) {
    const hay = String(actual ?? '');
    const needle = expected.contains;
    return expected.mode === 'insensitive'
      ? hay.toLowerCase().includes(needle.toLowerCase())
      : hay.includes(needle);
  }
  return true;
}

function matchesWhere(record: Record<string, unknown>, where?: WhereClause): boolean {
  if (!where) return true;
  if (where.OR?.length) {
    return where.OR.some((clause) => matchesWhere(record, clause));
  }
  if (where.AND?.length) {
    return where.AND.every((clause) => matchesWhere(record, clause));
  }
  for (const [key, value] of Object.entries(where)) {
    if (key === 'OR' || key === 'AND') continue;
    if (key.includes('_')) {
      // composite unique keys handled by callers
      continue;
    }
    if (!matchField(record, key, value as WhereValue)) return false;
  }
  return true;
}

function applyOrderBy<T>(rows: T[], orderBy?: OrderBy, fieldAccess?: (row: T, field: string) => unknown): T[] {
  if (!orderBy) return rows;
  const clauses = Array.isArray(orderBy) ? orderBy : [orderBy];
  const read = fieldAccess ?? ((row, field) => (row as Record<string, unknown>)[field]);
  return [...rows].sort((a, b) => {
    for (const clause of clauses) {
      const [field, dir] = Object.entries(clause)[0] ?? [];
      if (!field) continue;
      const cmp = compareValues(read(a, field), read(b, field));
      if (cmp !== 0) return dir === 'desc' ? -cmp : cmp;
    }
    return 0;
  });
}

function applySelect<T extends Record<string, unknown>>(
  row: T,
  select?: Record<string, boolean | Record<string, unknown>>,
): Partial<T> {
  if (!select) return row;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(select)) {
    if (val === true) out[key] = row[key];
  }
  return out as Partial<T>;
}

function notFound(model: string): never {
  throw new Error(`No ${model} found`);
}

function getModel(amplifyName: string): AmplifyModelClient {
  const models = getDataClient().models;
  const model = models[amplifyName];
  if (!model) {
    throw new Error(`Amplify model not found: ${amplifyName}`);
  }
  return model;
}

async function listAll(
  model: AmplifyModelClient,
  filter?: Record<string, unknown>,
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let nextToken: string | undefined;
  do {
    const res = await model.list({ filter, nextToken });
    if (res.errors?.length) {
      throw new Error(res.errors.map((e: { message: string }) => e.message).join('; '));
    }
    items.push(...((res.data ?? []) as Record<string, unknown>[]));
    nextToken = res.nextToken ?? undefined;
  } while (nextToken);
  return items;
}

function isAuthzError(message: string): boolean {
  return /not authorized|unauthorized|access denied/i.test(message);
}

async function getById(model: AmplifyModelClient, id: string): Promise<Record<string, unknown> | null> {
  const res = await model.get({ id });
  if (res.errors?.length) {
    const message = res.errors.map((e: { message: string }) => e.message).join('; ');
    // Missing/unauthorized rows should look like "not found" so callers can provision.
    if (isAuthzError(message) || /not found|cannot return null/i.test(message)) {
      return null;
    }
    throw new Error(message);
  }
  return coerceRecord(res.data as Record<string, unknown> | null);
}

function hydrateSplits(workoutId: string, raw: unknown): WorkoutSplit[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((s, index) => {
      const split = s as Record<string, unknown>;
      return {
        id: String(split.id ?? `${workoutId}-split-${index}`),
        workoutId,
        index: Number(split.index ?? index),
        durationSeconds: Number(split.durationSeconds ?? 0),
        distanceMeters: Number(split.distanceMeters ?? 0),
        paceSeconds500m: split.paceSeconds500m != null ? Number(split.paceSeconds500m) : null,
        watts: split.watts != null ? Number(split.watts) : null,
        heartRate: split.heartRate != null ? Number(split.heartRate) : null,
        strokeRate: split.strokeRate != null ? Number(split.strokeRate) : null,
      };
    })
    .sort((a, b) => a.index - b.index);
}

function hydrateSubjectiveFeedback(workoutId: string, raw: unknown): SubjectiveFeedback | null {
  const parsed = parseJsonField(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  const fb = parsed as Record<string, unknown>;
  return {
    id: String(fb.id ?? `${workoutId}-feedback`),
    workoutId,
    rpe: fb.rpe != null ? Number(fb.rpe) : null,
    fatigue: fb.fatigue != null ? Number(fb.fatigue) : null,
    soreness: fb.soreness != null ? Number(fb.soreness) : null,
    sleepQuality: fb.sleepQuality != null ? Number(fb.sleepQuality) : null,
    notes: fb.notes != null ? String(fb.notes) : null,
    createdAt: coerceDate(fb.createdAt) ?? new Date(),
    updatedAt: coerceDate(fb.updatedAt) ?? new Date(),
  };
}

function hydrateAnalysis(workoutId: string, raw: unknown): WorkoutAnalysis | null {
  const parsed = parseJsonField(raw);
  if (!parsed || typeof parsed !== 'object') return null;
  const a = parsed as Record<string, unknown>;
  return {
    id: String(a.id ?? `${workoutId}-analysis`),
    workoutId,
    calculatedMetrics: a.calculatedMetrics ?? {},
    aiAnalysis: a.aiAnalysis ?? null,
    classification: (a.classification as WorkoutAnalysis['classification']) ?? null,
    confidence: (a.confidence as WorkoutAnalysis['confidence']) ?? null,
    sessionVerdict: (a.sessionVerdict as WorkoutAnalysis['sessionVerdict']) ?? null,
    generatedAt: coerceDate(a.generatedAt) ?? new Date(),
    modelVersion: a.modelVersion != null ? String(a.modelVersion) : null,
    createdAt: coerceDate(a.createdAt) ?? new Date(),
    updatedAt: coerceDate(a.updatedAt) ?? new Date(),
  };
}

function hydratePlannedWorkouts(planId: string, raw: unknown): PlannedWorkout[] {
  const arr = Array.isArray(parseJsonField(raw)) ? (parseJsonField(raw) as unknown[]) : [];
  return arr.map((item) => {
    const p = item as Record<string, unknown>;
    return {
      id: String(p.id ?? randomUUID()),
      trainingPlanId: String(p.trainingPlanId ?? planId),
      scheduledDate: coerceDate(p.scheduledDate) ?? new Date(),
      workoutType: p.workoutType as PlannedWorkout['workoutType'],
      title: String(p.title ?? ''),
      targetDurationSeconds: p.targetDurationSeconds != null ? Number(p.targetDurationSeconds) : null,
      targetDistanceMeters: p.targetDistanceMeters != null ? Number(p.targetDistanceMeters) : null,
      targetPaceMinSeconds500m:
        p.targetPaceMinSeconds500m != null ? Number(p.targetPaceMinSeconds500m) : null,
      targetPaceMaxSeconds500m:
        p.targetPaceMaxSeconds500m != null ? Number(p.targetPaceMaxSeconds500m) : null,
      targetHrMin: p.targetHrMin != null ? Number(p.targetHrMin) : null,
      targetHrMax: p.targetHrMax != null ? Number(p.targetHrMax) : null,
      targetSpmMin: p.targetSpmMin != null ? Number(p.targetSpmMin) : null,
      targetSpmMax: p.targetSpmMax != null ? Number(p.targetSpmMax) : null,
      instructions: p.instructions != null ? String(p.instructions) : null,
      createdAt: coerceDate(p.createdAt) ?? new Date(),
      updatedAt: coerceDate(p.updatedAt) ?? new Date(),
    };
  });
}

function hydrateHrZones(athleteId: string, raw: unknown): HeartRateZone[] {
  const arr = Array.isArray(parseJsonField(raw)) ? (parseJsonField(raw) as unknown[]) : [];
  return arr
    .map((item, index) => {
      const z = item as Record<string, unknown>;
      return {
        id: String(z.id ?? `${athleteId}-zone-${index}`),
        athleteId,
        name: String(z.name ?? `Zone ${index + 1}`),
        zoneIndex: Number(z.zoneIndex ?? index),
        minBpm: Number(z.minBpm ?? 0),
        maxBpm: Number(z.maxBpm ?? 0),
        method: z.method as HeartRateZone['method'],
        createdAt: coerceDate(z.createdAt) ?? new Date(),
        updatedAt: coerceDate(z.updatedAt) ?? new Date(),
      };
    })
    .sort((a, b) => a.zoneIndex - b.zoneIndex);
}

async function findPlannedWorkoutById(
  plannedWorkoutId: string,
  athleteId?: string,
): Promise<PlannedWorkout | null> {
  const filter = athleteId ? { athleteId: { eq: athleteId } } : undefined;
  const plans = await listAll(getModel('TrainingPlan'), filter);
  for (const plan of plans) {
    const planned = hydratePlannedWorkouts(String(plan.id), plan.plannedWorkouts);
    const match = planned.find((p) => p.id === plannedWorkoutId);
    if (match) return match;
  }
  return null;
}

async function hydrateWorkout(row: Record<string, unknown>, include?: Record<string, IncludeSpec>) {
  const workout = { ...row } as Workout & Record<string, unknown>;
  const id = String(workout.id);
  workout.splits = hydrateSplits(id, workout.splits);
  workout.subjectiveFeedback = hydrateSubjectiveFeedback(id, workout.subjectiveFeedback);
  workout.analysis = hydrateAnalysis(id, workout.analysis);
  delete workout.strokes;

  if (!include) return workout;

  if (include.splits) {
    const spec = include.splits as { orderBy?: OrderBy };
    workout.splits = applyOrderBy(workout.splits ?? [], spec.orderBy);
  }
  if (include.subjectiveFeedback) workout.subjectiveFeedback = workout.subjectiveFeedback ?? null;
  if (include.analysis) workout.analysis = workout.analysis ?? null;

  if (include.plannedWorkout && workout.plannedWorkoutId) {
    workout.plannedWorkout =
      (await findPlannedWorkoutById(String(workout.plannedWorkoutId), String(workout.athleteId))) ?? null;
  }
  if (include.trainingBlock && workout.trainingBlockId) {
    const block = await getById(getModel('TrainingBlock'), String(workout.trainingBlockId));
    workout.trainingBlock = block as TrainingBlock | null;
  }
  if (include.athlete) {
    const athlete = await getById(getModel('AthleteProfile'), String(workout.athleteId));
    if (athlete) {
      workout.athlete = (await hydrateAthlete(athlete, include.athlete as Record<string, IncludeSpec>)) as AthleteProfile;
    }
  }
  return workout;
}

async function hydrateAthlete(row: Record<string, unknown>, include?: Record<string, IncludeSpec>) {
  const hrZones = hydrateHrZones(String(row.id), row.hrZones);
  const athlete = { ...row, hrZones } as AthleteProfile & Record<string, unknown>;

  if (!include) return athlete;

  if (include.hrZones) {
    const spec = include.hrZones as { orderBy?: OrderBy };
    athlete.hrZones = applyOrderBy(hrZones, spec.orderBy);
  }
  if (include.user) {
    const user = await getById(getModel('User'), String(athlete.userId));
    if (user) {
      const select = (include.user as { select?: Record<string, boolean> }).select;
      const withHash = attachLocalPassword(user);
      athlete.user = applySelect(withHash, select) as unknown as User;
    }
  }
  if (include.goals) {
    const spec = include.goals as { where?: WhereClause; take?: number; orderBy?: OrderBy };
    athlete.goals = (await goalDelegate.findMany({
      where: { athleteId: athlete.id, ...spec.where },
      orderBy: spec.orderBy,
      take: spec.take,
    })) as unknown as Goal[];
  }
  return athlete;
}

async function hydrateTrainingPlan(row: Record<string, unknown>, include?: Record<string, IncludeSpec>) {
  const plan = { ...row } as TrainingPlan & Record<string, unknown>;
  const plannedWorkouts = hydratePlannedWorkouts(String(plan.id), plan.plannedWorkouts);
  plan.plannedWorkouts = plannedWorkouts;
  if (!include) return plan;

  if (include.plannedWorkouts) {
    const spec = include.plannedWorkouts as { where?: WhereClause; orderBy?: OrderBy; take?: number };
    let filtered = plannedWorkouts.filter((p) =>
      matchesWhere(p as unknown as Record<string, unknown>, spec.where),
    );
    filtered = applyOrderBy(filtered, spec.orderBy);
    if (spec.take != null) filtered = filtered.slice(0, spec.take);
    plan.plannedWorkouts = filtered;
  }
  if (include.goal && plan.goalId) {
    plan.goal =
      ((await goalDelegate.findUnique({ where: { id: String(plan.goalId) } })) as unknown as Goal | null) ??
      null;
  }
  return plan;
}

function attachLocalPassword(user: Record<string, unknown>): Record<string, unknown> {
  const id = String(user.id);
  const passwordHash = localPasswordHashes.get(id) ?? null;
  return { ...user, passwordHash };
}

function buildNestedWorkoutJson(data: Record<string, unknown>, workoutId: string) {
  const out = { ...data };
  const splitsCreate = (data.splits as { create?: Record<string, unknown>[] } | undefined)?.create;
  if (splitsCreate?.length) {
    out.splits = splitsCreate.map((s, index) => ({
      id: randomUUID(),
      workoutId,
      index: s.index ?? index,
      ...s,
    }));
  }
  delete out.splits;

  const feedbackCreate = (data.subjectiveFeedback as { create?: Record<string, unknown> } | undefined)?.create;
  if (feedbackCreate) {
    const now = new Date().toISOString();
    out.subjectiveFeedback = {
      id: randomUUID(),
      workoutId,
      ...feedbackCreate,
      createdAt: now,
      updatedAt: now,
    };
  }
  delete out.subjectiveFeedback;
  return out;
}

function createDelegate(modelName: string, amplifyName: string) {
  const model = () => getModel(amplifyName);

  return {
    async findUnique(args: FindArgs): Promise<Record<string, unknown> | null> {
      const where = args.where ?? {};
      let row: Record<string, unknown> | null = null;

      if (where.id != null) {
        row = await getById(model(), String(where.id));
      } else if (where.userId != null && amplifyName === 'AthleteProfile') {
        const rows = await listAll(model(), { userId: { eq: String(where.userId) } });
        row = coerceRecord(rows[0] ?? null);
      } else if (where.userId != null && amplifyName === 'BillingSubscription') {
        const rows = await listAll(model(), { userId: { eq: String(where.userId) } });
        row = coerceRecord(rows[0] ?? null);
      } else if (where.email != null && amplifyName === 'User') {
        const rows = await listAll(model(), { email: { eq: String(where.email) } });
        row = coerceRecord(rows[0] ?? null);
        if (row) row = attachLocalPassword(row);
      } else if (where.athleteId != null && amplifyName === 'AthleteCoachState') {
        const rows = await listAll(model(), { athleteId: { eq: String(where.athleteId) } });
        row = coerceRecord(rows[0] ?? null);
      } else if (where.userId_provider && amplifyName === 'DataConnection') {
        const composite = where.userId_provider as { userId: string; provider: string };
        const rows = await listAll(model(), {
          userId: { eq: composite.userId },
          provider: { eq: composite.provider },
        });
        row = coerceRecord(rows[0] ?? null);
      } else if (where.athleteId_weekStart && amplifyName === 'WeeklyReview') {
        const composite = where.athleteId_weekStart as { athleteId: string; weekStart: Date };
        const rows = await listAll(model(), { athleteId: { eq: composite.athleteId } });
        row =
          coerceRecord(
            rows.find(
              (r) =>
                coerceDate(r.weekStart)?.getTime() === composite.weekStart.getTime(),
            ) ?? null,
          ) ?? null;
      } else if (where.tokenHash != null && amplifyName === 'AuthSession') {
        const session = [...authSessions.values()].find((s) => s.tokenHash === where.tokenHash);
        row = session ? { ...session } : null;
      } else if (where.workoutId != null) {
        // virtual models delegate to workout
        return null;
      }

      if (!row) return null;
      if (args.select) return applySelect(row, args.select);
      if (amplifyName === 'User') row = attachLocalPassword(row);
      if (amplifyName === 'Workout' && args.include) {
        return hydrateWorkout(row, args.include) as unknown as Record<string, unknown>;
      }
      if (amplifyName === 'AthleteProfile' && args.include) {
        return hydrateAthlete(row, args.include) as unknown as Record<string, unknown>;
      }
      if (amplifyName === 'TrainingPlan' && args.include) {
        return hydrateTrainingPlan(row, args.include) as unknown as Record<string, unknown>;
      }
      if (amplifyName === 'TrainingBlock' && args.include) {
        return hydrateTrainingBlock(row, args.include) as unknown as Record<string, unknown>;
      }
      if (amplifyName === 'User' && args.include?.subscription) {
        const sub: Record<string, unknown> | null = await subscriptionDelegate.findUnique({
          where: { userId: String(row.id) },
        });
        return { ...row, subscription: sub };
      }
      return row;
    },

    async findUniqueOrThrow(args: FindArgs): Promise<Record<string, unknown>> {
      const row = await this.findUnique(args);
      if (!row) notFound(modelName);
      return row;
    },

    async findFirst(args: FindArgs = {}) {
      const rows = await this.findMany(args);
      return rows[0] ?? null;
    },

    async findMany(args: FindArgs = {}) {
      const where = args.where ?? {};
      let filter: Record<string, unknown> | undefined;
      if (where.athleteId != null && typeof where.athleteId === 'string') {
        filter = { athleteId: { eq: where.athleteId } };
      } else if (where.userId != null && typeof where.userId === 'string') {
        filter = { userId: { eq: where.userId } };
      } else if (where.status != null && typeof where.status === 'string') {
        filter = { status: { eq: where.status } };
      }

      let rows = (await listAll(model(), filter)).map((r) => coerceRecord(r)!);
      rows = rows.filter((r) => matchesWhere(r, where));
      rows = applyOrderBy(rows, args.orderBy);
      if (args.skip) rows = rows.slice(args.skip);
      if (args.take != null) rows = rows.slice(0, args.take);

      if (args.select) {
        return rows.map((r) => applySelect(r, args.select));
      }

      if (amplifyName === 'Workout' && args.include) {
        return Promise.all(rows.map((r) => hydrateWorkout(r, args.include)));
      }
      if (amplifyName === 'AthleteProfile' && args.include) {
        return Promise.all(rows.map((r) => hydrateAthlete(r, args.include)));
      }
      if (amplifyName === 'TrainingPlan' && args.include) {
        return Promise.all(rows.map((r) => hydrateTrainingPlan(r, args.include)));
      }
      if (amplifyName === 'TrainingBlock' && args.include) {
        return Promise.all(rows.map((r) => hydrateTrainingBlock(r, args.include)));
      }
      if (amplifyName === 'User') {
        rows = rows.map((r) => attachLocalPassword(r));
      }
      return rows;
    },

    async create(args: { data: Record<string, unknown>; include?: Record<string, IncludeSpec> }) {
      const data = { ...args.data };
      if (!data.id) data.id = randomUUID();

      if (amplifyName === 'User') {
        if (data.passwordHash) {
          localPasswordHashes.set(String(data.id), String(data.passwordHash));
        }
        delete data.passwordHash;
        const athleteCreate = (data.athleteProfile as { create?: Record<string, unknown> } | undefined)?.create;
        const subscriptionCreate = (data.subscription as { create?: Record<string, unknown> } | undefined)?.create;
        delete data.athleteProfile;
        delete data.subscription;

        const serialized = serializeRecord(data);
        const res = await model().create(serialized);
        if (res.errors?.length) throw new Error(res.errors.map((e: { message: string }) => e.message).join('; '));
        const user = coerceRecord(res.data as Record<string, unknown>)!;

        if (athleteCreate) {
          await getModel('AthleteProfile').create(
            serializeRecord({ id: randomUUID(), userId: user.id, ...athleteCreate }),
          );
        }
        if (subscriptionCreate) {
          await getModel('BillingSubscription').create(
            serializeRecord({ id: randomUUID(), userId: user.id, ...subscriptionCreate }),
          );
        }
        return attachLocalPassword(user);
      }

      if (amplifyName === 'TrainingPlan') {
        const plannedCreate = (data.plannedWorkouts as { create?: Record<string, unknown>[] } | undefined)?.create;
        if (plannedCreate?.length) {
          const planId = String(data.id);
          data.plannedWorkouts = plannedCreate.map((p) => ({
            id: randomUUID(),
            trainingPlanId: planId,
            ...p,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        } else {
          delete data.plannedWorkouts;
        }
      }

      if (amplifyName === 'Workout') {
        const workoutId = String(data.id);
        Object.assign(data, buildNestedWorkoutJson(data, workoutId));
      }

      const serialized = serializeRecord(data);
      const res = await model().create(serialized);
      if (res.errors?.length) throw new Error(res.errors.map((e: { message: string }) => e.message).join('; '));
      let row = coerceRecord(res.data as Record<string, unknown>)!;
      if (amplifyName === 'Workout' && args.include) row = await hydrateWorkout(row, args.include);
      if (amplifyName === 'TrainingPlan' && args.include) row = await hydrateTrainingPlan(row, args.include);
      return row;
    },

    async update(args: { where: WhereClause; data: Record<string, unknown>; include?: Record<string, IncludeSpec> }) {
      const existing = await this.findUnique({ where: args.where });
      if (!existing) notFound(modelName);
      const id = String((existing as Record<string, unknown>).id);
      const serialized = serializeRecord(args.data);
      const res = await model().update({ id, ...serialized });
      if (res.errors?.length) throw new Error(res.errors.map((e: { message: string }) => e.message).join('; '));
      let row = coerceRecord(res.data as Record<string, unknown>)!;
      if (amplifyName === 'Workout' && args.include) row = await hydrateWorkout(row, args.include);
      return row;
    },

    async updateMany(args: { where: WhereClause; data: Record<string, unknown> }) {
      const matches = await this.findMany({ where: args.where });
      let count = 0;
      for (const row of matches) {
        await this.update({ where: { id: String((row as Record<string, unknown>).id) }, data: args.data });
        count++;
      }
      return { count };
    },

    async upsert(args: UpsertArgs<Record<string, unknown>, Record<string, unknown>>) {
      const existing = await this.findUnique({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: { ...args.create, ...flattenWhere(args.where) } });
    },

    async count(args: { where?: WhereClause } = {}) {
      const rows = await this.findMany({ where: args.where });
      return rows.length;
    },

    async delete(args: { where: WhereClause }) {
      const existing = await this.findUnique({ where: args.where });
      if (!existing) notFound(modelName);
      const id = String((existing as Record<string, unknown>).id);
      await model().delete({ id });
      return existing;
    },

    async deleteMany(args: { where: WhereClause }) {
      const matches = await this.findMany({ where: args.where });
      for (const row of matches) {
        await model().delete({ id: String((row as Record<string, unknown>).id) });
      }
      return { count: matches.length };
    },

    async createMany(args: { data: Record<string, unknown>[] }) {
      for (const item of args.data) {
        await this.create({ data: item });
      }
      return { count: args.data.length };
    },
  };
}

function flattenWhere(where: WhereClause): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(where)) {
    if (key.includes('_')) {
      Object.assign(out, value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

async function hydrateTrainingBlock(row: Record<string, unknown>, include?: Record<string, IncludeSpec>) {
  const block = { ...row } as unknown as TrainingBlock;
  if (!include) return block;
  if (include.goal && block.goalId) {
    block.goal = (await goalDelegate.findUnique({
      where: { id: String(block.goalId) },
    })) as unknown as Goal | null;
  }
  if (include.trainingPlan && block.trainingPlanId) {
    const plan = await getById(getModel('TrainingPlan'), String(block.trainingPlanId));
    if (plan) {
      block.trainingPlan = (await hydrateTrainingPlan(
        plan,
        typeof include.trainingPlan === 'object'
          ? (include.trainingPlan as Record<string, IncludeSpec>)
          : undefined,
      )) as TrainingPlan;
    }
  }
  return block;
}

const userDelegate = createDelegate('User', 'User');
const subscriptionDelegate = createDelegate('subscription', 'BillingSubscription');
const athleteProfileDelegate = createDelegate('AthleteProfile', 'AthleteProfile');
const goalDelegate = createDelegate('Goal', 'Goal');
const trainingPlanDelegate = createDelegate('TrainingPlan', 'TrainingPlan');
const trainingBlockDelegate = createDelegate('TrainingBlock', 'TrainingBlock');
const workoutDelegate = createDelegate('Workout', 'Workout');
const athleteCoachStateDelegate = createDelegate('AthleteCoachState', 'AthleteCoachState');
const weeklyReviewDelegate = createDelegate('WeeklyReview', 'WeeklyReview');
const dataConnectionDelegate = createDelegate('DataConnection', 'DataConnection');
const webhookEventDelegate = createDelegate('WebhookEvent', 'WebhookEvent');
const chatMessageDelegate = createDelegate('ChatMessage', 'ChatMessage');

const authSessionDelegate = {
  async create(args: { data: { userId: string; tokenHash: string; expiresAt: Date } }) {
    const session = {
      id: randomUUID(),
      ...args.data,
      createdAt: new Date(),
    };
    authSessions.set(session.id, session);
    return session;
  },
  async findUnique(args: { where: { tokenHash: string }; include?: { user?: boolean } }) {
    const session = [...authSessions.values()].find((s) => s.tokenHash === args.where.tokenHash);
    if (!session) return null;
    if (args.include?.user) {
      const user = await userDelegate.findUnique({ where: { id: session.userId } });
      return { ...session, user };
    }
    return session;
  },
  async deleteMany(args: { where: { tokenHash: string } }) {
    for (const [id, s] of authSessions.entries()) {
      if (s.tokenHash === args.where.tokenHash) authSessions.delete(id);
    }
    return { count: 1 };
  },
  async delete(args: { where: { id: string } }) {
    authSessions.delete(args.where.id);
    return { id: args.where.id };
  },
};

const subjectiveFeedbackDelegate = {
  async upsert(args: UpsertArgs<Record<string, unknown>, Record<string, unknown>>) {
    const workoutId = String(args.where.workoutId ?? args.create.workoutId);
    const workout = await workoutDelegate.findUnique({ where: { id: workoutId } });
    if (!workout) notFound('Workout');
    const existing = hydrateSubjectiveFeedback(workoutId, workout.subjectiveFeedback);
    const now = new Date().toISOString();
    const pick = (key: keyof SubjectiveFeedback) => {
      if (key in args.update) return args.update[key as string] ?? null;
      if (key in args.create) return args.create[key as string] ?? null;
      return existing?.[key] ?? null;
    };
    const merged = {
      id: existing?.id ?? randomUUID(),
      workoutId,
      rpe: pick('rpe'),
      fatigue: pick('fatigue'),
      soreness: pick('soreness'),
      sleepQuality: pick('sleepQuality'),
      notes: pick('notes'),
      createdAt: existing?.createdAt.toISOString() ?? now,
      updatedAt: now,
    };
    await workoutDelegate.update({
      where: { id: workoutId },
      data: { subjectiveFeedback: merged },
    });
    return hydrateSubjectiveFeedback(workoutId, merged)!;
  },
};

const workoutAnalysisDelegate = {
  async upsert(args: UpsertArgs<Record<string, unknown>, Record<string, unknown>>) {
    const workoutId = String(args.where.workoutId ?? args.create.workoutId);
    const workout = await workoutDelegate.findUnique({ where: { id: workoutId } });
    if (!workout) notFound('Workout');
    const existing = hydrateAnalysis(workoutId, workout.analysis);
    const now = new Date().toISOString();
    const merged = {
      id: existing?.id ?? randomUUID(),
      workoutId,
      calculatedMetrics: args.update.calculatedMetrics ?? args.create.calculatedMetrics ?? existing?.calculatedMetrics ?? {},
      aiAnalysis: args.update.aiAnalysis ?? args.create.aiAnalysis ?? existing?.aiAnalysis ?? null,
      classification: args.update.classification ?? args.create.classification ?? existing?.classification ?? null,
      confidence: args.update.confidence ?? args.create.confidence ?? existing?.confidence ?? null,
      sessionVerdict: args.update.sessionVerdict ?? args.create.sessionVerdict ?? existing?.sessionVerdict ?? null,
      modelVersion: args.update.modelVersion ?? args.create.modelVersion ?? existing?.modelVersion ?? null,
      generatedAt: args.update.generatedAt ?? args.create.generatedAt ?? existing?.generatedAt ?? now,
      createdAt: existing?.createdAt.toISOString() ?? now,
      updatedAt: now,
    };
    await workoutDelegate.update({
      where: { id: workoutId },
      data: { analysis: merged },
    });
    return hydrateAnalysis(workoutId, merged)!;
  },
};

const prismaModels = {
  user: userDelegate,
  subscription: subscriptionDelegate,
  athleteProfile: athleteProfileDelegate,
  goal: goalDelegate,
  trainingPlan: trainingPlanDelegate,
  trainingBlock: trainingBlockDelegate,
  workout: workoutDelegate,
  athleteCoachState: athleteCoachStateDelegate,
  weeklyReview: weeklyReviewDelegate,
  dataConnection: dataConnectionDelegate,
  webhookEvent: webhookEventDelegate,
  chatMessage: chatMessageDelegate,
  authSession: authSessionDelegate,
  subjectiveFeedback: subjectiveFeedbackDelegate,
  workoutAnalysis: workoutAnalysisDelegate,
};

export type PrismaCompatClient = any;

/**
 * Prisma-shaped facade over Amplify Data.
 * Typed loosely (`any`) so existing service call sites keep compiling while
 * nested JSON models replace relational includes.
 */
export const prisma: PrismaCompatClient = {
  ...prismaModels,
  async $transaction<T>(fn: (tx: typeof prismaModels) => Promise<T>): Promise<T> {
    return fn(prismaModels);
  },
  async $disconnect() {
    // Amplify Data client has no persistent connection pool
  },
  async $queryRaw() {
    return [{ '?column?': 1 }];
  },
};
