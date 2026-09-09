import { prisma, type WorkoutClassification, type WorkoutSource } from '@ergcoach/database';
import { runPostWorkoutAnalysis } from './analysis.js';
import { resolveBlockForWorkoutDate } from './blocks.js';

export interface ManualWorkoutInput {
  athleteId: string;
  startedAt: Date;
  workoutType: WorkoutClassification;
  title?: string;
  durationSeconds: number;
  distanceMeters: number;
  averagePaceSeconds500m?: number | null;
  averageWatts?: number | null;
  averageHeartRate?: number | null;
  maxHeartRate?: number | null;
  averageStrokeRate?: number | null;
  plannedWorkoutId?: string | null;
  trainingBlockId?: string | null;
  excludeFromAnalysis?: boolean;
  splits?: Array<{
    durationSeconds: number;
    distanceMeters: number;
    paceSeconds500m?: number | null;
    watts?: number | null;
    heartRate?: number | null;
    strokeRate?: number | null;
  }>;
  feedback?: {
    rpe?: number | null;
    fatigue?: number | null;
    soreness?: number | null;
    sleepQuality?: number | null;
    notes?: string | null;
  };
  source?: WorkoutSource;
  externalId?: string | null;
  rawData?: unknown;
  analyse?: boolean;
}

export async function createManualWorkout(input: ManualWorkoutInput) {
  const source = input.source ?? 'manual';
  const externalId =
    input.externalId ?? `manual-${input.startedAt.toISOString()}-${Math.random().toString(36).slice(2, 8)}`;

  let trainingBlockId = input.trainingBlockId ?? null;
  let blockAssignment: 'auto' | 'manual' | 'none' = trainingBlockId ? 'manual' : 'none';
  if (!trainingBlockId && !input.excludeFromAnalysis) {
    const block = await resolveBlockForWorkoutDate(input.athleteId, input.startedAt);
    if (block) {
      trainingBlockId = block.id;
      blockAssignment = 'auto';
    }
  }

  const workout = await prisma.workout.create({
    data: {
      athleteId: input.athleteId,
      source,
      externalId,
      plannedWorkoutId: input.plannedWorkoutId ?? null,
      trainingBlockId,
      blockAssignment,
      excludeFromAnalysis: input.excludeFromAnalysis ?? false,
      startedAt: input.startedAt,
      sport: input.workoutType === 'strength' ? 'strength' : 'rower',
      workoutType: input.workoutType,
      title: input.title,
      durationSeconds: input.durationSeconds,
      distanceMeters: input.distanceMeters,
      averagePaceSeconds500m: input.averagePaceSeconds500m ?? null,
      averageWatts: input.averageWatts ?? null,
      averageHeartRate: input.averageHeartRate ?? null,
      maxHeartRate: input.maxHeartRate ?? null,
      averageStrokeRate: input.averageStrokeRate ?? null,
      rawData: (input.rawData as object) ?? undefined,
      splits: input.splits?.length
        ? {
            create: input.splits.map((s, index) => ({
              index,
              durationSeconds: s.durationSeconds,
              distanceMeters: s.distanceMeters,
              paceSeconds500m: s.paceSeconds500m ?? null,
              watts: s.watts ?? null,
              heartRate: s.heartRate ?? null,
              strokeRate: s.strokeRate ?? null,
            })),
          }
        : undefined,
      subjectiveFeedback: input.feedback
        ? {
            create: {
              rpe: input.feedback.rpe ?? null,
              fatigue: input.feedback.fatigue ?? null,
              soreness: input.feedback.soreness ?? null,
              sleepQuality: input.feedback.sleepQuality ?? null,
              notes: input.feedback.notes ?? null,
            },
          }
        : undefined,
    },
    include: {
      splits: { orderBy: { index: 'asc' } },
      subjectiveFeedback: true,
      plannedWorkout: true,
      trainingBlock: true,
    },
  });

  if (input.analyse !== false) {
    await runPostWorkoutAnalysis(workout.id);
    return prisma.workout.findUniqueOrThrow({
      where: { id: workout.id },
      include: {
        splits: { orderBy: { index: 'asc' } },
        subjectiveFeedback: true,
        analysis: true,
        plannedWorkout: true,
        trainingBlock: true,
      },
    });
  }

  return workout;
}

export async function recordWorkoutFeedback(
  workoutId: string,
  feedback: {
    rpe?: number | null;
    fatigue?: number | null;
    soreness?: number | null;
    sleepQuality?: number | null;
    notes?: string | null;
  },
) {
  return prisma.subjectiveFeedback.upsert({
    where: { workoutId },
    create: {
      workoutId,
      rpe: feedback.rpe ?? null,
      fatigue: feedback.fatigue ?? null,
      soreness: feedback.soreness ?? null,
      sleepQuality: feedback.sleepQuality ?? null,
      notes: feedback.notes ?? null,
    },
    update: {
      rpe: feedback.rpe ?? undefined,
      fatigue: feedback.fatigue ?? undefined,
      soreness: feedback.soreness ?? undefined,
      sleepQuality: feedback.sleepQuality ?? undefined,
      notes: feedback.notes ?? undefined,
    },
  });
}

/** Generic CSV import — expects headers like date,distance,time,pace,hr,spm,type */
export function parseWorkoutCsv(csv: string): Array<Record<string, string>> {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cols = line.split(',');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? '').trim();
    });
    return row;
  });
}

export async function importWorkoutsFromCsv(athleteId: string, csv: string) {
  const rows = parseWorkoutCsv(csv);
  const created = [];
  for (const row of rows) {
    const distanceMeters = Number(row['distance'] ?? row['distance_m'] ?? row['dist'] ?? 0);
    const durationSeconds = Number(row['time'] ?? row['duration'] ?? row['seconds'] ?? 0);
    const pace = row['pace'] ? Number(row['pace']) : null;
    const type = (row['type'] ?? row['workout_type'] ?? 'unknown').toUpperCase();
    const workoutType = (
      ['UT2', 'UT1', 'AT', 'TR', 'AN', 'RECOVERY', 'BENCHMARK', 'RACE', 'STRENGTH'].includes(type)
        ? type === 'RECOVERY'
          ? 'recovery'
          : type === 'BENCHMARK'
            ? 'benchmark'
            : type === 'RACE'
              ? 'race'
              : type === 'STRENGTH'
                ? 'strength'
                : type
        : 'unknown'
    ) as WorkoutClassification;

    const startedAt = new Date(row['date'] ?? row['datetime'] ?? Date.now());
    const workout = await createManualWorkout({
      athleteId,
      startedAt,
      workoutType,
      title: row['title'] ?? `CSV import ${workoutType}`,
      durationSeconds,
      distanceMeters,
      averagePaceSeconds500m: pace,
      averageHeartRate: row['hr'] || row['heart_rate'] ? Number(row['hr'] ?? row['heart_rate']) : null,
      maxHeartRate: row['max_hr'] ? Number(row['max_hr']) : null,
      averageStrokeRate: row['spm'] || row['stroke_rate'] ? Number(row['spm'] ?? row['stroke_rate']) : null,
      source: 'csv',
      externalId: `csv-${startedAt.toISOString()}-${distanceMeters}`,
      rawData: { csvRow: row },
      analyse: true,
    });
    created.push(workout);
  }
  return created;
}
