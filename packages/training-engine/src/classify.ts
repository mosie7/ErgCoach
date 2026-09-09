import type { ConfidenceLevel, WorkoutClassification } from '@ergcoach/shared';

export interface ClassificationInput {
  plannedType?: WorkoutClassification | null;
  distanceMeters: number;
  durationSeconds: number;
  averageHeartRate?: number | null;
  averagePaceSeconds500m?: number | null;
  averageStrokeRate?: number | null;
  title?: string | null;
  lthr?: number | null;
  maxHr?: number | null;
}

export interface ClassificationResult {
  classification: WorkoutClassification;
  confidence: ConfidenceLevel;
  reasons: string[];
}

/**
 * Heuristic workout classification. Prefer planned type when HR/pace evidence agrees.
 * Not a physiological diagnosis — an explainable label for coaching context.
 */
export function classifyWorkout(input: ClassificationInput): ClassificationResult {
  const reasons: string[] = [];
  const title = (input.title ?? '').toLowerCase();

  if (title.includes('5k') || title.includes('benchmark')) {
    return {
      classification: 'benchmark',
      confidence: 'moderate',
      reasons: ['Title indicates benchmark/test'],
    };
  }
  if (title.includes('race') || title.includes('marathon race')) {
    return { classification: 'race', confidence: 'moderate', reasons: ['Title indicates race'] };
  }
  if (input.distanceMeters === 0 || title.includes('strength') || title.includes('gym')) {
    return {
      classification: 'strength',
      confidence: 'moderate',
      reasons: ['Zero erg distance or strength title'],
    };
  }

  const lthr = input.lthr ?? null;
  const avgHr = input.averageHeartRate ?? null;
  const durationMin = input.durationSeconds / 60;
  const distance = input.distanceMeters;
  const spm = input.averageStrokeRate ?? null;

  if (avgHr != null && lthr != null) {
    const ratio = avgHr / lthr;
    // Long, low-SPM work is UT2 even if HR sits a bit higher in the aerobic band
    if (
      distance >= 10000 &&
      (spm == null || spm <= 20) &&
      ratio < 0.92 &&
      durationMin >= 40
    ) {
      reasons.push(
        `Long low-SPM row (${Math.round(distance / 1000)}km, SPM ${spm ?? 'n/a'}) at ${Math.round(ratio * 100)}% LTHR — UT2`,
      );
      return { classification: 'UT2', confidence: 'moderate', reasons };
    }
    if (ratio < 0.82 && durationMin >= 30 && (spm == null || spm <= 20)) {
      reasons.push(`Avg HR ${avgHr} is ~${Math.round(ratio * 100)}% of LTHR — UT2 range`);
      return { classification: 'UT2', confidence: 'moderate', reasons };
    }
    if (ratio >= 0.82 && ratio < 0.96 && durationMin >= 20) {
      reasons.push(`Avg HR ${avgHr} is ~${Math.round(ratio * 100)}% of LTHR — UT1 range`);
      return { classification: 'UT1', confidence: 'moderate', reasons };
    }
    if (ratio >= 0.96 && ratio < 1.05) {
      reasons.push(`Avg HR near LTHR — AT range`);
      return { classification: 'AT', confidence: 'moderate', reasons };
    }
    if (ratio >= 1.05) {
      reasons.push(`Avg HR above LTHR — TR/AN territory`);
      return {
        classification: durationMin <= 25 && distance <= 6000 ? 'AN' : 'TR',
        confidence: 'low',
        reasons,
      };
    }
  }

  if (input.plannedType && input.plannedType !== 'unknown') {
    return {
      classification: input.plannedType,
      confidence: 'low',
      reasons: ['Falling back to planned classification (limited HR evidence)'],
    };
  }

  if (distance >= 10000 && (spm == null || spm <= 20)) {
    return {
      classification: 'UT2',
      confidence: 'low',
      reasons: ['Long distance + low SPM heuristic'],
    };
  }

  return {
    classification: 'unknown',
    confidence: 'low',
    reasons: ['Insufficient evidence to classify'],
  };
}
