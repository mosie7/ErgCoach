/** Enum string unions — match former Prisma exports */

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

export type AuthProvider = 'local' | 'cognito' | 'auth0' | 'clerk';

export type ConfidenceLevel = 'low' | 'moderate' | 'high';

export type SessionVerdict = 'excellent' | 'successful' | 'partial' | 'poor' | 'unknown';

export type PlanTier = 'free' | 'pro';

export type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete';

export type TrainingBlockStatus = 'active' | 'completed' | 'planned' | 'archived';

export type TrainingBlockType =
  | 'marathon'
  | 'half_marathon'
  | 'ten_k'
  | 'five_k'
  | 'two_k'
  | 'hundred_k'
  | 'base'
  | 'general'
  | 'custom';

export type BlockAssignment = 'auto' | 'manual' | 'none';

export interface User {
  id: string;
  email: string;
  displayName: string;
  /** Local-auth compat only — not persisted in Amplify User model */
  passwordHash?: string | null;
  authProvider: AuthProvider;
  externalAuthId: string | null;
  createdAt: Date;
  updatedAt: Date;
  athleteProfile?: AthleteProfile | null;
  subscription?: Subscription | null;
  dataConnections?: DataConnection[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanTier;
  status: SubscriptionStatus;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEndsAt: Date | null;
  isComplimentary: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface HeartRateZone {
  id: string;
  athleteId: string;
  name: string;
  zoneIndex: number;
  minBpm: number;
  maxBpm: number;
  method: HrZoneMethod;
  createdAt: Date;
  updatedAt: Date;
}

export interface AthleteProfile {
  id: string;
  userId: string;
  dateOfBirth: Date | null;
  age: number | null;
  sex: Sex | null;
  weightKg: number | null;
  maxHeartRate: number | null;
  restingHeartRate: number | null;
  lactateThresholdHeartRate: number | null;
  preferredUnits: PreferredUnits;
  hrZoneMethod: HrZoneMethod;
  notes: string | null;
  isSyntheticSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User | Partial<User>;
  goals?: Goal[];
  trainingPlans?: TrainingPlan[];
  trainingBlocks?: TrainingBlock[];
  workouts?: Workout[];
  hrZones?: HeartRateZone[];
  athleteTrends?: AthleteTrend[];
  weeklyReviews?: WeeklyReview[];
  chatMessages?: ChatMessage[];
  coachState?: AthleteCoachState | null;
}

export interface Goal {
  id: string;
  athleteId: string;
  sport: Sport;
  eventType: EventType;
  targetDate: Date | null;
  targetDistance: number | null;
  targetTimeSeconds: number | null;
  targetPaceSeconds500m: number | null;
  status: GoalStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
  trainingPlans?: TrainingPlan[];
  trainingBlocks?: TrainingBlock[];
}

export interface PlannedWorkout {
  id: string;
  trainingPlanId: string;
  scheduledDate: Date;
  workoutType: WorkoutClassification;
  title: string;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetPaceMinSeconds500m: number | null;
  targetPaceMaxSeconds500m: number | null;
  targetHrMin: number | null;
  targetHrMax: number | null;
  targetSpmMin: number | null;
  targetSpmMax: number | null;
  instructions: string | null;
  createdAt: Date;
  updatedAt: Date;
  trainingPlan?: TrainingPlan;
  workouts?: Workout[];
}

export interface TrainingPlan {
  id: string;
  athleteId: string;
  goalId: string | null;
  name: string;
  startDate: Date;
  endDate: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
  goal?: Goal | null;
  trainingBlocks?: TrainingBlock[];
  plannedWorkouts?: PlannedWorkout[];
}

export interface TrainingBlock {
  id: string;
  athleteId: string;
  goalId: string | null;
  trainingPlanId: string | null;
  name: string;
  description: string | null;
  blockType: TrainingBlockType;
  startDate: Date;
  endDate: Date | null;
  status: TrainingBlockStatus;
  targetEvent: EventType | null;
  targetDistance: number | null;
  targetTimeSeconds: number | null;
  targetPaceSeconds500m: number | null;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
  goal?: Goal | null;
  trainingPlan?: TrainingPlan | null;
  workouts?: Workout[];
}

export interface WorkoutSplit {
  id: string;
  workoutId: string;
  index: number;
  durationSeconds: number;
  distanceMeters: number;
  paceSeconds500m: number | null;
  watts: number | null;
  heartRate: number | null;
  strokeRate: number | null;
}

export interface WorkoutStroke {
  id: string;
  workoutId: string;
  index: number;
  timestampOffset: number | null;
  paceSeconds500m: number | null;
  watts: number | null;
  heartRate: number | null;
  strokeRate: number | null;
}

export interface SubjectiveFeedback {
  id: string;
  workoutId: string;
  rpe: number | null;
  fatigue: number | null;
  soreness: number | null;
  sleepQuality: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  workout?: Workout;
}

export interface WorkoutAnalysis {
  id: string;
  workoutId: string;
  calculatedMetrics: unknown;
  aiAnalysis: unknown | null;
  classification: WorkoutClassification | null;
  confidence: ConfidenceLevel | null;
  sessionVerdict: SessionVerdict | null;
  generatedAt: Date;
  modelVersion: string | null;
  createdAt: Date;
  updatedAt: Date;
  workout?: Workout;
}

export interface Workout {
  id: string;
  athleteId: string;
  source: WorkoutSource;
  externalId: string | null;
  plannedWorkoutId: string | null;
  trainingBlockId: string | null;
  blockAssignment: BlockAssignment;
  excludeFromAnalysis: boolean;
  startedAt: Date;
  sport: Sport;
  workoutType: WorkoutClassification;
  detectedClassification: WorkoutClassification | null;
  title: string | null;
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSeconds500m: number | null;
  averageWatts: number | null;
  averageHeartRate: number | null;
  maxHeartRate: number | null;
  averageStrokeRate: number | null;
  rawData: unknown | null;
  isSyntheticSeed: boolean;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
  plannedWorkout?: PlannedWorkout | null;
  trainingBlock?: TrainingBlock | null;
  splits?: WorkoutSplit[];
  strokes?: WorkoutStroke[];
  subjectiveFeedback?: SubjectiveFeedback | null;
  analysis?: WorkoutAnalysis | null;
}

export interface WeeklyReview {
  id: string;
  athleteId: string;
  weekStart: Date;
  weekEnd: Date;
  summary: unknown;
  aiNarrative: string | null;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
}

export interface AthleteCoachState {
  id: string;
  athleteId: string;
  activeTrainingBlockId: string | null;
  currentFitnessSummary: string | null;
  strengths: unknown;
  currentLimiters: unknown;
  recentProgressSignals: unknown;
  currentConcerns: unknown;
  goalAssessment: unknown | null;
  lastUpdatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  athlete?: AthleteProfile;
}

export interface DataConnection {
  id: string;
  userId: string;
  provider: string;
  accessTokenEnc: string | null;
  refreshTokenEnc: string | null;
  tokenExpiresAt: Date | null;
  scope: string | null;
  externalUserId: string | null;
  metadata: unknown | null;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
}

export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  payload: unknown;
  processedAt: Date | null;
  status: string;
  error: string | null;
  createdAt: Date;
}

export interface ChatMessage {
  id: string;
  athleteId: string;
  role: string;
  content: string;
  toolCalls: unknown | null;
  createdAt: Date;
  athlete?: AthleteProfile;
}

export interface AthleteTrend {
  id: string;
  athleteId: string;
  metricKey: string;
  periodStart: Date;
  periodEnd: Date;
  value: number;
  metadata: unknown | null;
  createdAt: Date;
  athlete?: AthleteProfile;
}
