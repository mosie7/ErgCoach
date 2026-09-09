-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('rower', 'bikeerg', 'skierg', 'strength', 'other');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('two_k', 'five_k', 'ten_k', 'half_marathon', 'marathon', 'general_endurance', 'custom');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'completed', 'abandoned', 'paused');

-- CreateEnum
CREATE TYPE "WorkoutSource" AS ENUM ('manual', 'concept2', 'csv', 'garmin', 'strava', 'apple_health', 'other');

-- CreateEnum
CREATE TYPE "WorkoutClassification" AS ENUM ('UT2', 'UT1', 'AT', 'TR', 'AN', 'recovery', 'benchmark', 'race', 'strength', 'unknown');

-- CreateEnum
CREATE TYPE "PreferredUnits" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other', 'unspecified');

-- CreateEnum
CREATE TYPE "HrZoneMethod" AS ENUM ('max_hr', 'lthr', 'manual');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('local', 'cognito', 'auth0', 'clerk');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "SessionVerdict" AS ENUM ('excellent', 'successful', 'partial', 'poor', 'unknown');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "authProvider" "AuthProvider" NOT NULL DEFAULT 'local',
    "externalAuthId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "age" INTEGER,
    "sex" "Sex",
    "weightKg" DOUBLE PRECISION,
    "maxHeartRate" INTEGER,
    "restingHeartRate" INTEGER,
    "lactateThresholdHeartRate" INTEGER,
    "preferredUnits" "PreferredUnits" NOT NULL DEFAULT 'metric',
    "hrZoneMethod" "HrZoneMethod" NOT NULL DEFAULT 'lthr',
    "notes" TEXT,
    "isSyntheticSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeartRateZone" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "zoneIndex" INTEGER NOT NULL,
    "minBpm" INTEGER NOT NULL,
    "maxBpm" INTEGER NOT NULL,
    "method" "HrZoneMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeartRateZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "sport" "Sport" NOT NULL,
    "eventType" "EventType" NOT NULL,
    "targetDate" TIMESTAMP(3),
    "targetDistance" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPaceSeconds500m" DOUBLE PRECISION,
    "status" "GoalStatus" NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "goalId" TEXT,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedWorkout" (
    "id" TEXT NOT NULL,
    "trainingPlanId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "workoutType" "WorkoutClassification" NOT NULL,
    "title" TEXT NOT NULL,
    "targetDurationSeconds" INTEGER,
    "targetDistanceMeters" DOUBLE PRECISION,
    "targetPaceMinSeconds500m" DOUBLE PRECISION,
    "targetPaceMaxSeconds500m" DOUBLE PRECISION,
    "targetHrMin" INTEGER,
    "targetHrMax" INTEGER,
    "targetSpmMin" DOUBLE PRECISION,
    "targetSpmMax" DOUBLE PRECISION,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workout" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "source" "WorkoutSource" NOT NULL,
    "externalId" TEXT,
    "plannedWorkoutId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "sport" "Sport" NOT NULL DEFAULT 'rower',
    "workoutType" "WorkoutClassification" NOT NULL DEFAULT 'unknown',
    "detectedClassification" "WorkoutClassification",
    "title" TEXT,
    "durationSeconds" INTEGER NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "averagePaceSeconds500m" DOUBLE PRECISION,
    "averageWatts" DOUBLE PRECISION,
    "averageHeartRate" DOUBLE PRECISION,
    "maxHeartRate" DOUBLE PRECISION,
    "averageStrokeRate" DOUBLE PRECISION,
    "rawData" JSONB,
    "isSyntheticSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSplit" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "durationSeconds" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "paceSeconds500m" DOUBLE PRECISION,
    "watts" DOUBLE PRECISION,
    "heartRate" DOUBLE PRECISION,
    "strokeRate" DOUBLE PRECISION,

    CONSTRAINT "WorkoutSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutStroke" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "timestampOffset" DOUBLE PRECISION,
    "paceSeconds500m" DOUBLE PRECISION,
    "watts" DOUBLE PRECISION,
    "heartRate" DOUBLE PRECISION,
    "strokeRate" DOUBLE PRECISION,

    CONSTRAINT "WorkoutStroke_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectiveFeedback" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "rpe" INTEGER,
    "fatigue" INTEGER,
    "soreness" INTEGER,
    "sleepQuality" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectiveFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutAnalysis" (
    "id" TEXT NOT NULL,
    "workoutId" TEXT NOT NULL,
    "calculatedMetrics" JSONB NOT NULL,
    "aiAnalysis" JSONB,
    "classification" "WorkoutClassification",
    "confidence" "ConfidenceLevel",
    "sessionVerdict" "SessionVerdict",
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteTrend" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AthleteTrend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReview" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "summary" JSONB NOT NULL,
    "aiNarrative" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "externalUserId" TEXT,
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_authProvider_externalAuthId_idx" ON "User"("authProvider", "externalAuthId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE INDEX "AuthSession_userId_idx" ON "AuthSession"("userId");

-- CreateIndex
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteProfile_userId_key" ON "AthleteProfile"("userId");

-- CreateIndex
CREATE INDEX "HeartRateZone_athleteId_idx" ON "HeartRateZone"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "HeartRateZone_athleteId_zoneIndex_key" ON "HeartRateZone"("athleteId", "zoneIndex");

-- CreateIndex
CREATE INDEX "Goal_athleteId_status_idx" ON "Goal"("athleteId", "status");

-- CreateIndex
CREATE INDEX "TrainingPlan_athleteId_idx" ON "TrainingPlan"("athleteId");

-- CreateIndex
CREATE INDEX "TrainingPlan_goalId_idx" ON "TrainingPlan"("goalId");

-- CreateIndex
CREATE INDEX "PlannedWorkout_trainingPlanId_scheduledDate_idx" ON "PlannedWorkout"("trainingPlanId", "scheduledDate");

-- CreateIndex
CREATE INDEX "Workout_athleteId_startedAt_idx" ON "Workout"("athleteId", "startedAt");

-- CreateIndex
CREATE INDEX "Workout_athleteId_workoutType_idx" ON "Workout"("athleteId", "workoutType");

-- CreateIndex
CREATE INDEX "Workout_source_externalId_idx" ON "Workout"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Workout_athleteId_source_externalId_key" ON "Workout"("athleteId", "source", "externalId");

-- CreateIndex
CREATE INDEX "WorkoutSplit_workoutId_idx" ON "WorkoutSplit"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutSplit_workoutId_index_key" ON "WorkoutSplit"("workoutId", "index");

-- CreateIndex
CREATE INDEX "WorkoutStroke_workoutId_idx" ON "WorkoutStroke"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutStroke_workoutId_index_key" ON "WorkoutStroke"("workoutId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectiveFeedback_workoutId_key" ON "SubjectiveFeedback"("workoutId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutAnalysis_workoutId_key" ON "WorkoutAnalysis"("workoutId");

-- CreateIndex
CREATE INDEX "AthleteTrend_athleteId_metricKey_periodEnd_idx" ON "AthleteTrend"("athleteId", "metricKey", "periodEnd");

-- CreateIndex
CREATE INDEX "WeeklyReview_athleteId_weekStart_idx" ON "WeeklyReview"("athleteId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReview_athleteId_weekStart_key" ON "WeeklyReview"("athleteId", "weekStart");

-- CreateIndex
CREATE INDEX "DataConnection_provider_idx" ON "DataConnection"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "DataConnection_userId_provider_key" ON "DataConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "WebhookEvent_provider_status_createdAt_idx" ON "WebhookEvent"("provider", "status", "createdAt");

-- CreateIndex
CREATE INDEX "ChatMessage_athleteId_createdAt_idx" ON "ChatMessage"("athleteId", "createdAt");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteProfile" ADD CONSTRAINT "AthleteProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HeartRateZone" ADD CONSTRAINT "HeartRateZone_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedWorkout" ADD CONSTRAINT "PlannedWorkout_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_plannedWorkoutId_fkey" FOREIGN KEY ("plannedWorkoutId") REFERENCES "PlannedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSplit" ADD CONSTRAINT "WorkoutSplit_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutStroke" ADD CONSTRAINT "WorkoutStroke_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectiveFeedback" ADD CONSTRAINT "SubjectiveFeedback_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutAnalysis" ADD CONSTRAINT "WorkoutAnalysis_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteTrend" ADD CONSTRAINT "AthleteTrend_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReview" ADD CONSTRAINT "WeeklyReview_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataConnection" ADD CONSTRAINT "DataConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
