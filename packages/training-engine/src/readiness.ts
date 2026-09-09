import type { ConfidenceLevel, MarathonReadinessResult } from '@ergcoach/shared';
import { clamp } from '@ergcoach/shared';

export interface ReadinessEvidenceInput {
  targetPaceSeconds500m: number;
  longRowPaces: number[]; // recent long rows pace s/500m
  longRowHrDrifts: number[];
  ut1Paces: number[];
  ut1AvgHrs: number[];
  ut2Paces: number[];
  ut2AvgHrs: number[];
  benchmark5kPace?: number | null;
  weeksWithConsistentVolume: number;
  plannedSessionsLast14Days: number;
  completedSessionsLast14Days: number;
  recentLongRowDistanceMax: number;
}

/**
 * Explainable marathon-readiness heuristic — NOT a physiological model.
 * Returns evidence lists and moderate confidence at best in MVP.
 */
export function estimateMarathonReadiness(
  input: ReadinessEvidenceInput,
): MarathonReadinessResult {
  const positiveEvidence: string[] = [];
  const limitingEvidence: string[] = [];
  const missingEvidence: string[] = [];
  let score = 50;

  if (input.longRowPaces.length === 0) {
    missingEvidence.push('No long-row performances (≥16 km) recorded yet');
  } else {
    const bestLong = Math.min(...input.longRowPaces);
    const gap = bestLong - input.targetPaceSeconds500m;
    if (gap <= 6) {
      score += 12;
      positiveEvidence.push(
        `Best long-row pace ${bestLong.toFixed(1)}s/500m is within 6s of target ${input.targetPaceSeconds500m}`,
      );
    } else if (gap <= 10) {
      score += 4;
      positiveEvidence.push(
        `Long-row pace ${bestLong.toFixed(1)}s/500m is approaching target (gap ${gap.toFixed(1)}s)`,
      );
    } else {
      score -= 8;
      limitingEvidence.push(
        `Long-row pace ${bestLong.toFixed(1)}s/500m is ${gap.toFixed(1)}s slower than marathon target`,
      );
    }
  }

  if (input.recentLongRowDistanceMax < 18000) {
    missingEvidence.push('Need a longer steady row (≥18–24 km) for durability evidence');
    score -= 5;
  } else if (input.recentLongRowDistanceMax >= 20000) {
    score += 8;
    positiveEvidence.push(
      `Completed a ${Math.round(input.recentLongRowDistanceMax / 1000)} km long row — durability stimulus present`,
    );
  }

  if (input.longRowHrDrifts.length > 0) {
    const latestDrift = input.longRowHrDrifts[input.longRowHrDrifts.length - 1]!;
    if (latestDrift <= 5) {
      score += 8;
      positiveEvidence.push(`Recent long-row HR drift ${latestDrift.toFixed(1)}% is well controlled`);
    } else if (latestDrift <= 8) {
      score += 2;
      positiveEvidence.push(`Long-row HR drift ${latestDrift.toFixed(1)}% is acceptable`);
    } else {
      score -= 6;
      limitingEvidence.push(
        `Long-row HR drift ${latestDrift.toFixed(1)}% suggests aerobic durability is still a limiter`,
      );
    }
    if (input.longRowHrDrifts.length >= 2) {
      const prev = input.longRowHrDrifts[input.longRowHrDrifts.length - 2]!;
      if (latestDrift < prev - 0.5) {
        score += 5;
        positiveEvidence.push(
          `HR drift improved from ${prev.toFixed(1)}% to ${latestDrift.toFixed(1)}% on long rows`,
        );
      }
    }
  } else {
    missingEvidence.push('Heart-rate drift on long rows not yet measurable');
  }

  if (input.ut1Paces.length >= 2 && input.ut1AvgHrs.length >= 2) {
    const paceImproved =
      input.ut1Paces[input.ut1Paces.length - 1]! < input.ut1Paces[0]! - 0.3;
    const hrStableOrLower =
      input.ut1AvgHrs[input.ut1AvgHrs.length - 1]! <= input.ut1AvgHrs[0]! + 1;
    if (paceImproved && hrStableOrLower) {
      score += 10;
      positiveEvidence.push('UT1 pace improved at similar or lower HR — aerobic efficiency signal');
    } else if (paceImproved) {
      score += 4;
      positiveEvidence.push('UT1 pace improved; confirm it is not just higher effort');
    } else {
      limitingEvidence.push('UT1 sessions not yet showing clear efficiency progression');
    }
  } else {
    missingEvidence.push('Need more UT1 sessions (e.g. 2x20 / 2x30) for threshold-aerobic trend');
  }

  if (input.ut2Paces.length >= 2 && input.ut2AvgHrs.length >= 2) {
    const latestPace = input.ut2Paces[input.ut2Paces.length - 1]!;
    const earlyPace = input.ut2Paces[0]!;
    const latestHr = input.ut2AvgHrs[input.ut2AvgHrs.length - 1]!;
    const earlyHr = input.ut2AvgHrs[0]!;
    if (latestPace < earlyPace && latestHr <= earlyHr + 1) {
      score += 8;
      positiveEvidence.push('UT2 efficiency improving (faster pace at similar HR)');
    }
  } else {
    missingEvidence.push('More UT2 steady rows needed for aerobic base trend');
  }

  if (input.benchmark5kPace == null) {
    missingEvidence.push('No recent 5k benchmark to anchor high-end capacity');
  } else {
    // Very rough: marathon pace often ~12–18s/500m slower than 5k for recreational;
    // if 5k is much slower than target+12, flag limiter.
    const impliedGap = input.benchmark5kPace + 14 - input.targetPaceSeconds500m;
    if (impliedGap <= 2) {
      score += 6;
      positiveEvidence.push(
        `5k benchmark ${input.benchmark5kPace.toFixed(1)}s/500m is broadly compatible with target marathon pace (rough heuristic)`,
      );
    } else if (impliedGap > 6) {
      score -= 6;
      limitingEvidence.push(
        `5k benchmark ${input.benchmark5kPace.toFixed(1)}s/500m suggests target ${input.targetPaceSeconds500m}s/500m may be ambitious (rough heuristic only)`,
      );
    }
  }

  if (input.weeksWithConsistentVolume >= 4) {
    score += 6;
    positiveEvidence.push(
      `${input.weeksWithConsistentVolume} weeks of consistent volume supports marathon preparation`,
    );
  } else {
    limitingEvidence.push('Volume consistency still building (<4 solid weeks)');
  }

  if (input.plannedSessionsLast14Days > 0) {
    const adherence =
      input.completedSessionsLast14Days / input.plannedSessionsLast14Days;
    if (adherence >= 0.85) {
      score += 5;
      positiveEvidence.push(
        `Training adherence ${Math.round(adherence * 100)}% over last 14 days`,
      );
    } else if (adherence < 0.6) {
      score -= 8;
      limitingEvidence.push(
        `Only ${Math.round(adherence * 100)}% of planned sessions completed in last 14 days`,
      );
    }
  }

  score = clamp(Math.round(score), 0, 100);

  let confidence: ConfidenceLevel = 'low';
  const evidenceCount =
    input.longRowPaces.length +
    input.ut1Paces.length +
    input.ut2Paces.length +
    (input.benchmark5kPace != null ? 1 : 0);
  if (evidenceCount >= 8 && missingEvidence.length <= 2) confidence = 'moderate';
  if (evidenceCount >= 12 && missingEvidence.length === 0) confidence = 'high';
  // Cap high confidence in MVP — we don't have a full physiological model
  if (confidence === 'high') confidence = 'moderate';

  const estimatedCenter = estimatePaceFromEvidence(input);
  const spread = confidence === 'moderate' ? 1.6 : 2.8;

  const primaryLimiter =
    limitingEvidence[0]?.split(' — ')[0] ??
    limitingEvidence[0] ??
    missingEvidence[0] ??
    'Insufficient limiting-factor evidence';

  return {
    score,
    confidence,
    positiveEvidence,
    limitingEvidence,
    missingEvidence,
    estimatedPaceRangeSeconds500m: estimatedCenter
      ? { low: estimatedCenter - spread, high: estimatedCenter + spread }
      : undefined,
    primaryLimiter,
  };
}

function estimatePaceFromEvidence(input: ReadinessEvidenceInput): number | null {
  const candidates: number[] = [];
  if (input.longRowPaces.length) {
    candidates.push(Math.min(...input.longRowPaces) + 1.5);
  }
  if (input.ut1Paces.length) {
    candidates.push(Math.min(...input.ut1Paces) + 3);
  }
  if (input.benchmark5kPace != null) {
    candidates.push(input.benchmark5kPace + 14);
  }
  if (candidates.length === 0) return null;
  return candidates.reduce((a, b) => a + b, 0) / candidates.length;
}
