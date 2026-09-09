import type { Concept2NormalizedSplit, Concept2NormalizedWorkout } from './types.js';

/**
 * Normalise a Concept2-like payload into our domain shape.
 *
 * Field mappings below follow commonly documented Logbook result properties
 * but are marked for verification against the live API schema.
 */
export function normalizeConcept2Workout(raw: Record<string, unknown>): Concept2NormalizedWorkout {
  // VERIFY field names against Concept2 API documentation
  const id = String(raw['id'] ?? raw['result_id'] ?? raw['externalId'] ?? '');
  const dateStr = String(raw['date'] ?? raw['started'] ?? raw['datetime'] ?? new Date().toISOString());
  const distanceMeters = Number(raw['distance'] ?? raw['distanceMeters'] ?? 0);
  const timeSeconds = parseConcept2Time(raw['time'] ?? raw['duration'] ?? raw['durationSeconds']);
  const strokeRate = optionalNumber(raw['stroke_rate'] ?? raw['strokeRate'] ?? raw['averageStrokeRate']);
  const heartRate = optionalNumber(raw['heart_rate'] ?? raw['heartRate'] ?? raw['averageHeartRate']);
  const maxHeartRate = optionalNumber(raw['max_heart_rate'] ?? raw['maxHeartRate']);
  const watts = optionalNumber(raw['watt'] ?? raw['watts'] ?? raw['averageWatts']);
  const pace = optionalNumber(raw['pace'] ?? raw['averagePaceSeconds500m'])
    ?? (distanceMeters > 0 && timeSeconds > 0 ? (timeSeconds / distanceMeters) * 500 : null);

  const typeRaw = String(raw['type'] ?? raw['sport'] ?? 'rower').toLowerCase();
  const sport =
    typeRaw.includes('bike') ? 'bikeerg' : typeRaw.includes('ski') ? 'skierg' : typeRaw.includes('row') || typeRaw === 'rower' ? 'rower' : 'other';

  const splitRaw = Array.isArray(raw['splits'])
    ? (raw['splits'] as Record<string, unknown>[])
    : Array.isArray(raw['stroke_data'])
      ? []
      : [];

  const splits: Concept2NormalizedSplit[] = splitRaw.map((s, index) => {
    const splitDistance = Number(s['distance'] ?? s['distanceMeters'] ?? 500);
    const splitTime = parseConcept2Time(s['time'] ?? s['duration'] ?? s['durationSeconds']);
    const splitPace =
      optionalNumber(s['pace'] ?? s['paceSeconds500m']) ??
      (splitDistance > 0 && splitTime > 0 ? (splitTime / splitDistance) * 500 : null);
    return {
      index,
      durationSeconds: splitTime,
      distanceMeters: splitDistance,
      paceSeconds500m: splitPace,
      watts: optionalNumber(s['watt'] ?? s['watts']),
      heartRate: optionalNumber(s['heart_rate'] ?? s['heartRate']),
      strokeRate: optionalNumber(s['stroke_rate'] ?? s['strokeRate']),
    };
  });

  return {
    externalId: id,
    startedAt: new Date(dateStr),
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

/** Concept2 often encodes time as tenths of a second integer — VERIFY. */
export function parseConcept2Time(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') {
    // Heuristic: large integers are often tenths of a second
    if (Number.isInteger(value) && value > 10000) {
      return value / 10;
    }
    return value;
  }
  if (typeof value === 'string') {
    if (value.includes(':')) {
      const parts = value.split(':').map(Number);
      if (parts.length === 3) {
        return (parts[0]! * 3600) + (parts[1]! * 60) + parts[2]!;
      }
      if (parts.length === 2) {
        return parts[0]! * 60 + parts[1]!;
      }
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function optionalNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
