import type { CalculatedWorkoutMetrics, WorkoutClassification } from '@ergcoach/shared';
import { classifyWorkout } from './classify.js';
import {
  calculateHeartRateDrift,
  calculatePace,
  calculatePaceDrift,
  calculatePaceVariance,
  calculatePowerDrift,
  calculateSplitConsistency,
  calculateStrokeRateConsistency,
  paceToWatts,
} from './pace-power.js';
import { calculateHrZoneDistribution, type HrZoneDefinition } from './hr-zones.js';
import { calculateSessionCompliance, type PlannedTargets } from './compliance.js';

export interface SplitInput {
  paceSeconds500m?: number | null;
  watts?: number | null;
  heartRate?: number | null;
  strokeRate?: number | null;
  durationSeconds: number;
  distanceMeters: number;
}

export interface AnalyzeWorkoutInput {
  distanceMeters: number;
  durationSeconds: number;
  averagePaceSeconds500m?: number | null;
  averageWatts?: number | null;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  averageStrokeRate?: number | null;
  splits?: SplitInput[];
  planned?: PlannedTargets | null;
  title?: string | null;
  plannedType?: WorkoutClassification | null;
  lthr?: number | null;
  maxHr?: number | null;
  hrZones?: HrZoneDefinition[];
}

export interface FullWorkoutMetrics extends CalculatedWorkoutMetrics {
  complianceScore: number | null;
  complianceChecks: Array<{ name: string; passed: boolean; detail: string }>;
}

export function analyzeWorkoutMetrics(input: AnalyzeWorkoutInput): FullWorkoutMetrics {
  const splits = input.splits ?? [];
  const paces = splits
    .map((s) => s.paceSeconds500m)
    .filter((v): v is number => v != null && v > 0);
  const hrs = splits
    .map((s) => s.heartRate)
    .filter((v): v is number => v != null && v > 0);
  const watts = splits
    .map((s) => s.watts)
    .filter((v): v is number => v != null && v > 0);
  const spms = splits
    .map((s) => s.strokeRate)
    .filter((v): v is number => v != null && v > 0);

  const averagePaceSeconds500m =
    input.averagePaceSeconds500m ??
    calculatePace(input.distanceMeters, input.durationSeconds);

  const averageWatts =
    input.averageWatts ??
    (averagePaceSeconds500m != null ? paceToWatts(averagePaceSeconds500m) : null);

  const classification = classifyWorkout({
    plannedType: input.plannedType ?? input.planned?.workoutType,
    distanceMeters: input.distanceMeters,
    durationSeconds: input.durationSeconds,
    averageHeartRate: input.averageHeartRate,
    averagePaceSeconds500m,
    averageStrokeRate: input.averageStrokeRate,
    title: input.title,
    lthr: input.lthr,
    maxHr: input.maxHr,
  });

  const zones = input.hrZones ?? [];
  const hrZoneDistribution =
    hrs.length > 0 && zones.length > 0
      ? calculateHrZoneDistribution(hrs, zones)
      : input.averageHeartRate != null && zones.length > 0
        ? calculateHrZoneDistribution([input.averageHeartRate], zones)
        : {};

  const compliance = calculateSessionCompliance(input.planned, {
    workoutType: classification.classification,
    durationSeconds: input.durationSeconds,
    distanceMeters: input.distanceMeters,
    averagePaceSeconds500m,
    averageHeartRate: input.averageHeartRate,
    averageStrokeRate: input.averageStrokeRate,
  });

  return {
    averagePaceSeconds500m,
    averageWatts,
    averageHeartRate: input.averageHeartRate ?? null,
    maxHeartRate: input.maxHeartRate ?? null,
    averageStrokeRate: input.averageStrokeRate ?? null,
    paceVariance: calculatePaceVariance(paces),
    heartRateDriftPercent: calculateHeartRateDrift(hrs),
    paceDriftPercent: calculatePaceDrift(paces),
    powerDriftPercent: calculatePowerDrift(watts),
    splitConsistency: calculateSplitConsistency(paces),
    strokeRateConsistency: calculateStrokeRateConsistency(spms),
    durationSeconds: input.durationSeconds,
    distanceMeters: input.distanceMeters,
    hrZoneDistribution,
    detectedClassification: classification.classification,
    classificationConfidence: classification.confidence,
    complianceScore: compliance.score,
    complianceChecks: compliance.checks,
  };
}
