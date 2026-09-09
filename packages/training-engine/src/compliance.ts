import type { WorkoutClassification } from '@ergcoach/shared';

export interface PlannedTargets {
  workoutType?: WorkoutClassification | null;
  targetDurationSeconds?: number | null;
  targetDistanceMeters?: number | null;
  targetPaceMinSeconds500m?: number | null;
  targetPaceMaxSeconds500m?: number | null;
  targetHrMin?: number | null;
  targetHrMax?: number | null;
  targetSpmMin?: number | null;
  targetSpmMax?: number | null;
}

export interface ActualSession {
  workoutType?: WorkoutClassification | null;
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSeconds500m?: number | null;
  averageHeartRate?: number | null;
  averageStrokeRate?: number | null;
}

export interface ComplianceResult {
  score: number; // 0–100
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

export function calculateSessionCompliance(
  planned: PlannedTargets | null | undefined,
  actual: ActualSession,
): ComplianceResult {
  if (!planned) {
    return {
      score: 50,
      checks: [
        {
          name: 'planned_session',
          passed: false,
          detail: 'No planned workout linked — compliance assessed as neutral',
        },
      ],
    };
  }

  const checks: ComplianceResult['checks'] = [];

  if (planned.workoutType) {
    const passed = actual.workoutType === planned.workoutType;
    checks.push({
      name: 'type',
      passed,
      detail: passed
        ? `Matched planned type ${planned.workoutType}`
        : `Planned ${planned.workoutType}, detected ${actual.workoutType ?? 'unknown'}`,
    });
  }

  if (planned.targetDistanceMeters) {
    const ratio = actual.distanceMeters / planned.targetDistanceMeters;
    const passed = ratio >= 0.9 && ratio <= 1.15;
    checks.push({
      name: 'distance',
      passed,
      detail: `Actual ${Math.round(actual.distanceMeters)}m vs target ${Math.round(planned.targetDistanceMeters)}m`,
    });
  }

  if (planned.targetDurationSeconds) {
    const ratio = actual.durationSeconds / planned.targetDurationSeconds;
    const passed = ratio >= 0.85 && ratio <= 1.2;
    checks.push({
      name: 'duration',
      passed,
      detail: `Actual ${actual.durationSeconds}s vs target ${planned.targetDurationSeconds}s`,
    });
  }

  if (
    planned.targetPaceMinSeconds500m != null &&
    planned.targetPaceMaxSeconds500m != null &&
    actual.averagePaceSeconds500m != null
  ) {
    const passed =
      actual.averagePaceSeconds500m >= planned.targetPaceMinSeconds500m &&
      actual.averagePaceSeconds500m <= planned.targetPaceMaxSeconds500m;
    checks.push({
      name: 'pace',
      passed,
      detail: `Pace ${actual.averagePaceSeconds500m.toFixed(1)}s/500m vs ${planned.targetPaceMinSeconds500m}–${planned.targetPaceMaxSeconds500m}`,
    });
  }

  if (
    planned.targetHrMin != null &&
    planned.targetHrMax != null &&
    actual.averageHeartRate != null
  ) {
    const passed =
      actual.averageHeartRate >= planned.targetHrMin &&
      actual.averageHeartRate <= planned.targetHrMax + 3;
    checks.push({
      name: 'heart_rate',
      passed,
      detail: `Avg HR ${actual.averageHeartRate} vs target ${planned.targetHrMin}–${planned.targetHrMax}`,
    });
  }

  if (
    planned.targetSpmMin != null &&
    planned.targetSpmMax != null &&
    actual.averageStrokeRate != null
  ) {
    const passed =
      actual.averageStrokeRate >= planned.targetSpmMin &&
      actual.averageStrokeRate <= planned.targetSpmMax;
    checks.push({
      name: 'stroke_rate',
      passed,
      detail: `SPM ${actual.averageStrokeRate} vs ${planned.targetSpmMin}–${planned.targetSpmMax}`,
    });
  }

  if (checks.length === 0) {
    return {
      score: 50,
      checks: [{ name: 'targets', passed: false, detail: 'Planned workout had no measurable targets' }],
    };
  }

  const passedCount = checks.filter((c) => c.passed).length;
  return {
    score: Math.round((passedCount / checks.length) * 100),
    checks,
  };
}
