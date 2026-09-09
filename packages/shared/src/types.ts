export type Sport = 'rower' | 'bikeerg' | 'skierg' | 'strength' | 'other';

export type EventType =
  | 'two_k'
  | 'five_k'
  | 'ten_k'
  | 'half_marathon'
  | 'marathon'
  | 'hundred_k'
  | 'general_endurance'
  | 'custom';

/** Race / program distances used by Training Programs. */
export type ProgramEventType =
  | 'two_k'
  | 'five_k'
  | 'ten_k'
  | 'half_marathon'
  | 'marathon'
  | 'hundred_k';

export const EVENT_DISTANCE_METERS: Record<ProgramEventType, number> = {
  two_k: 2000,
  five_k: 5000,
  ten_k: 10000,
  half_marathon: 21097,
  marathon: 42195,
  hundred_k: 100000,
};

export const MARATHON_DISTANCE_METERS = EVENT_DISTANCE_METERS.marathon;

export type GoalStatus = 'active' | 'completed' | 'abandoned' | 'paused';

export type WorkoutSource =
  | 'manual'
  | 'concept2'
  | 'csv'
  | 'garmin'
  | 'strava'
  | 'apple_health'
  | 'other';

export type WorkoutClassification =
  | 'UT2'
  | 'UT1'
  | 'AT'
  | 'TR'
  | 'AN'
  | 'recovery'
  | 'benchmark'
  | 'race'
  | 'strength'
  | 'unknown';

export type PreferredUnits = 'metric' | 'imperial';

export type Sex = 'male' | 'female' | 'other' | 'unspecified';

export type HrZoneMethod = 'max_hr' | 'lthr' | 'manual';

export type ConfidenceLevel = 'low' | 'moderate' | 'high';

export type SessionVerdict = 'excellent' | 'successful' | 'partial' | 'poor' | 'unknown';

export type AuthProvider = 'local' | 'cognito' | 'auth0' | 'clerk';

export interface PaceDisplay {
  /** Pace as seconds per 500m */
  secondsPer500m: number;
  /** Formatted as m:ss.s */
  formatted: string;
}

export interface AthleteIdentity {
  id: string;
  userId: string;
  displayName: string;
}

export interface EvidenceItem {
  label: string;
  detail: string;
  polarity: 'positive' | 'limiting' | 'neutral' | 'missing';
}

export interface MarathonReadinessResult {
  score: number;
  confidence: ConfidenceLevel;
  positiveEvidence: string[];
  limitingEvidence: string[];
  missingEvidence: string[];
  estimatedPaceRangeSeconds500m?: {
    low: number;
    high: number;
  };
  primaryLimiter?: string;
}

export interface CalculatedWorkoutMetrics {
  averagePaceSeconds500m: number | null;
  averageWatts: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averageStrokeRate: number | null;
  paceVariance: number | null;
  heartRateDriftPercent: number | null;
  paceDriftPercent: number | null;
  powerDriftPercent: number | null;
  splitConsistency: number | null;
  strokeRateConsistency: number | null;
  durationSeconds: number;
  distanceMeters: number;
  hrZoneDistribution: Record<string, number>;
  detectedClassification: WorkoutClassification;
  classificationConfidence: ConfidenceLevel;
}

export interface AiWorkoutAnalysis {
  summary: string;
  sessionVerdict: SessionVerdict;
  whatWasAchieved: string[];
  executionAnalysis: string[];
  positiveSignals: string[];
  concerns: string[];
  goalImpact: string;
  progressAssessment: string;
  nextFocus: string[];
  confidence: ConfidenceLevel;
  evidence: string[];
}

export interface ComparableWorkoutResult {
  workoutId: string;
  similarityScore: number;
  reasons: string[];
}

export interface WeeklyVolumeSummary {
  weekStart: string;
  totalMeters: number;
  totalDurationSeconds: number;
  sessionCount: number;
  intensityBreakdown: Partial<Record<WorkoutClassification, number>>;
}

export const STANDARD_SPLIT_METERS = 500;

/** Concept2 pace/power relationship constants (public Formula). */
export const CONCEPT2_PACE_POWER_CONSTANT = 2.8;
