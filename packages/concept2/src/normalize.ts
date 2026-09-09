import type { Concept2NormalizedSplit, Concept2NormalizedWorkout } from './types.js';

/**
 * Normalise a Concept2 Logbook result payload into our domain shape.
 *
 * Concept2 conventions (from official docs):
 * - `time` / split `time` / pace targets are tenths of a second
 * - `heart_rate` is an object: { average, min, max, ending, recovery }
 * - `distance` is metres
 */
export function normalizeConcept2Workout(raw: Record<string, unknown>): Concept2NormalizedWorkout {
  const id = String(raw['id'] ?? raw['result_id'] ?? raw['externalId'] ?? '');
  const dateStr = String(
    raw['date'] ?? raw['date_utc'] ?? raw['started'] ?? raw['datetime'] ?? new Date().toISOString(),
  );
  const distanceMeters = Number(raw['distance'] ?? raw['distanceMeters'] ?? 0);
  const timeSeconds = parseConcept2Time(raw['time'] ?? raw['duration'] ?? raw['durationSeconds']);
  const strokeRate = optionalNumber(raw['stroke_rate'] ?? raw['strokeRate'] ?? raw['averageStrokeRate']);
  const heartRate = parseHeartRate(raw['heart_rate'] ?? raw['heartRate'] ?? raw['averageHeartRate']);
  const maxHeartRate = optionalNumber(
    raw['max_heart_rate'] ??
      raw['maxHeartRate'] ??
      (isRecord(raw['heart_rate']) ? raw['heart_rate']['max'] : null),
  );
  const watts = optionalNumber(raw['watt'] ?? raw['watts'] ?? raw['averageWatts']);
  const paceRaw = raw['pace'] ?? raw['averagePaceSeconds500m'];
  const pace =
    paceRaw != null
      ? parseConcept2Pace(paceRaw)
      : distanceMeters > 0 && timeSeconds > 0
        ? (timeSeconds / distanceMeters) * 500
        : null;

  const typeRaw = String(raw['type'] ?? raw['sport'] ?? 'rower').toLowerCase();
  const sport =
    typeRaw.includes('bike')
      ? 'bikeerg'
      : typeRaw.includes('ski')
        ? 'skierg'
        : typeRaw.includes('row') || typeRaw === 'rower' || typeRaw === 'dynamic' || typeRaw === 'slides'
          ? 'rower'
          : 'other';

  const splitRaw = Array.isArray(raw['splits'])
    ? (raw['splits'] as Record<string, unknown>[])
    : Array.isArray(raw['split'])
      ? (raw['split'] as Record<string, unknown>[])
      : Array.isArray(raw['interval'])
        ? (raw['interval'] as Record<string, unknown>[])
        : [];

  const splits: Concept2NormalizedSplit[] = splitRaw.map((s, index) => {
    const splitDistance = Number(s['distance'] ?? s['distanceMeters'] ?? 500);
    const splitTime = parseConcept2Time(s['time'] ?? s['duration'] ?? s['durationSeconds']);
    const splitPace =
      s['pace'] != null || s['paceSeconds500m'] != null
        ? parseConcept2Pace(s['pace'] ?? s['paceSeconds500m'])
        : splitDistance > 0 && splitTime > 0
          ? (splitTime / splitDistance) * 500
          : null;
    return {
      index,
      durationSeconds: splitTime,
      distanceMeters: splitDistance,
      paceSeconds500m: splitPace,
      watts: optionalNumber(s['watt'] ?? s['watts']),
      heartRate: parseHeartRate(s['heart_rate'] ?? s['heartRate']),
      strokeRate: optionalNumber(s['stroke_rate'] ?? s['strokeRate']),
    };
  });

  return {
    externalId: id,
    startedAt: parseConcept2Date(dateStr),
    sport,
    durationSeconds: timeSeconds,
    distanceMeters,
    averagePaceSeconds500m: pace,
    averageWatts: watts,
    averageHeartRate: heartRate,
    maxHeartRate,
    averageStrokeRate: strokeRate,
    splits,
    raw,
  };
}

/** Concept2 encodes duration as tenths of a second integers. */
export function parseConcept2Time(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value / 10;
    return value;
  }
  if (typeof value === 'string') {
    if (value.includes(':')) {
      const parts = value.split(':').map(Number);
      if (parts.length === 3) {
        return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
      }
      if (parts.length === 2) {
        return parts[0]! * 60 + parts[1]!;
      }
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Number.isInteger(n) ? n / 10 : n;
  }
  return 0;
}

/** Pace values from Concept2 are also tenths of a second per 500m (rower/SkiErg). */
export function parseConcept2Pace(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value / 10 : value;
  }
  if (typeof value === 'string') {
    if (value.includes(':')) return parseConcept2Time(value);
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return Number.isInteger(n) ? n / 10 : n;
  }
  return null;
}

function parseConcept2Date(value: string): Date {
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const withZone =
    /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) || normalized.endsWith('Z')
      ? normalized
      : `${normalized}Z`;
  const d = new Date(withZone);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

function parseHeartRate(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' || typeof value === 'string') return optionalNumber(value);
  if (isRecord(value)) {
    return optionalNumber(value['average'] ?? value['avg'] ?? value['ending'] ?? value['max']);
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
