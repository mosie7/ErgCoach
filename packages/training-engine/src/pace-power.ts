import { CONCEPT2_PACE_POWER_CONSTANT } from '@ergcoach/shared';

/** Average pace in seconds per 500m from distance and duration. */
export function calculatePace(
  distanceMeters: number,
  durationSeconds: number,
): number | null {
  if (distanceMeters <= 0 || durationSeconds <= 0) return null;
  return (durationSeconds / distanceMeters) * 500;
}

/** Concept2 power from pace: watts = 2.8 / (pace/500)^3 */
export function paceToWatts(paceSeconds500m: number): number | null {
  if (!Number.isFinite(paceSeconds500m) || paceSeconds500m <= 0) return null;
  return CONCEPT2_PACE_POWER_CONSTANT / Math.pow(paceSeconds500m / 500, 3);
}

/** Pace from watts using the inverse Concept2 relationship. */
export function wattsToPace(watts: number): number | null {
  if (!Number.isFinite(watts) || watts <= 0) return null;
  return Math.pow(CONCEPT2_PACE_POWER_CONSTANT / watts, 1 / 3) * 500;
}

export function calculatePaceVariance(paceValues: number[]): number | null {
  const valid = paceValues.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length < 2) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const variance =
    valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (valid.length - 1);
  return Math.sqrt(variance);
}

/**
 * Heart-rate drift: percent change from first half average to second half average.
 * Positive = HR rose over the session (common aerobic drift).
 */
export function calculateHeartRateDrift(heartRates: number[]): number | null {
  return calculateHalfDrift(heartRates);
}

/** Pace drift: positive means second half was slower (higher seconds/500m). */
export function calculatePaceDrift(paces: number[]): number | null {
  return calculateHalfDrift(paces);
}

/** Power drift: positive means second half produced more watts. */
export function calculatePowerDrift(watts: number[]): number | null {
  return calculateHalfDrift(watts);
}

function calculateHalfDrift(values: number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length < 4) return null;
  const mid = Math.floor(valid.length / 2);
  const first = valid.slice(0, mid);
  const second = valid.slice(mid);
  const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
  const avgSecond = second.reduce((a, b) => a + b, 0) / second.length;
  if (avgFirst === 0) return null;
  return ((avgSecond - avgFirst) / avgFirst) * 100;
}

/**
 * Split consistency score 0–100. Higher = more consistent.
 * Based on coefficient of variation of pace.
 */
export function calculateSplitConsistency(paces: number[]): number | null {
  const variance = calculatePaceVariance(paces);
  const valid = paces.filter((v) => Number.isFinite(v) && v > 0);
  if (variance == null || valid.length < 2) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const cv = variance / mean;
  return Math.max(0, Math.min(100, 100 - cv * 1000));
}

export function calculateStrokeRateConsistency(strokeRates: number[]): number | null {
  const valid = strokeRates.filter((v) => Number.isFinite(v) && v > 0);
  if (valid.length < 2) return null;
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const sd = Math.sqrt(
    valid.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (valid.length - 1),
  );
  const cv = sd / mean;
  return Math.max(0, Math.min(100, 100 - cv * 500));
}
