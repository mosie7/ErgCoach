-- CreateEnum
CREATE TYPE "TrainingBlockStatus" AS ENUM ('active', 'completed', 'planned', 'archived');

-- CreateEnum
CREATE TYPE "TrainingBlockType" AS ENUM ('marathon', 'half_marathon', 'ten_k', 'five_k', 'two_k', 'hundred_k', 'base', 'general', 'custom');

-- CreateEnum
CREATE TYPE "BlockAssignment" AS ENUM ('auto', 'manual', 'none');

-- CreateTable
CREATE TABLE "TrainingBlock" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "goalId" TEXT,
    "trainingPlanId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "blockType" "TrainingBlockType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "TrainingBlockStatus" NOT NULL DEFAULT 'active',
    "targetEvent" "EventType",
    "targetDistance" DOUBLE PRECISION,
    "targetTimeSeconds" INTEGER,
    "targetPaceSeconds500m" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteCoachState" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "activeTrainingBlockId" TEXT,
    "currentFitnessSummary" TEXT,
    "strengths" JSONB NOT NULL DEFAULT '[]',
    "currentLimiters" JSONB NOT NULL DEFAULT '[]',
    "recentProgressSignals" JSONB NOT NULL DEFAULT '[]',
    "currentConcerns" JSONB NOT NULL DEFAULT '[]',
    "goalAssessment" JSONB,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteCoachState_pkey" PRIMARY KEY ("id")
);

-- AlterTable Workout
ALTER TABLE "Workout" ADD COLUMN "trainingBlockId" TEXT;
ALTER TABLE "Workout" ADD COLUMN "blockAssignment" "BlockAssignment" NOT NULL DEFAULT 'none';
ALTER TABLE "Workout" ADD COLUMN "excludeFromAnalysis" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "TrainingBlock_athleteId_status_idx" ON "TrainingBlock"("athleteId", "status");
CREATE INDEX "TrainingBlock_athleteId_startDate_idx" ON "TrainingBlock"("athleteId", "startDate");
CREATE INDEX "TrainingBlock_goalId_idx" ON "TrainingBlock"("goalId");
CREATE INDEX "TrainingBlock_trainingPlanId_idx" ON "TrainingBlock"("trainingPlanId");
CREATE UNIQUE INDEX "AthleteCoachState_athleteId_key" ON "AthleteCoachState"("athleteId");
CREATE INDEX "Workout_athleteId_trainingBlockId_idx" ON "Workout"("athleteId", "trainingBlockId");

-- AddForeignKey
ALTER TABLE "TrainingBlock" ADD CONSTRAINT "TrainingBlock_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrainingBlock" ADD CONSTRAINT "TrainingBlock_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TrainingBlock" ADD CONSTRAINT "TrainingBlock_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AthleteCoachState" ADD CONSTRAINT "AthleteCoachState_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Workout" ADD CONSTRAINT "Workout_trainingBlockId_fkey" FOREIGN KEY ("trainingBlockId") REFERENCES "TrainingBlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ChatMessage FK (clean orphans first)
DELETE FROM "ChatMessage" WHERE "athleteId" NOT IN (SELECT "id" FROM "AthleteProfile");
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "AthleteProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
