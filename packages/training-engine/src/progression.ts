export interface TrendPoint {
  date: Date;
  value: number;
}

export interface ProgressionTrend {
  direction: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  slopePerWeek: number | null;
  sampleCount: number;
  summary: string;
}

/**
 * Simple linear regression on values over time.
 * For pace metrics, pass lowerIsBetter=true so declining pace seconds = improving.
 */
export function detectProgressionTrend(
  points: TrendPoint[],
  opts: { lowerIsBetter?: boolean; label?: string } = {},
): ProgressionTrend {
  const sorted = [...points].filter((p) => Number.isFinite(p.value)).sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );

  if (sorted.length < 3) {
    return {
      direction: 'insufficient_data',
      slopePerWeek: null,
      sampleCount: sorted.length,
      summary: `Need at least 3 data points for ${opts.label ?? 'trend'} (have ${sorted.length})`,
    };
  }

  const t0 = sorted[0]!.date.getTime();
  const xs = sorted.map((p) => (p.date.getTime() - t0) / (7 * 24 * 3600 * 1000));
  const ys = sorted.map((p) => p.value);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((s, x, i) => s + x * ys[i]!, 0);
  const sumXX = xs.reduce((s, x) => s + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return {
      direction: 'stable',
      slopePerWeek: 0,
      sampleCount: n,
      summary: 'No measurable change',
    };
  }
  const slope = (n * sumXY - sumX * sumY) / denom;
  const lowerIsBetter = opts.lowerIsBetter ?? false;
  const improving = lowerIsBetter ? slope < -0.05 : slope > 0.05;
  const declining = lowerIsBetter ? slope > 0.05 : slope < -0.05;

  const direction = improving ? 'improving' : declining ? 'declining' : 'stable';
  const label = opts.label ?? 'metric';
  return {
    direction,
    slopePerWeek: slope,
    sampleCount: n,
    summary: `${label} is ${direction} (slope ${slope.toFixed(3)} / week across ${n} sessions)`,
  };
}
