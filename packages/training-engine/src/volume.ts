import type { WorkoutClassification } from '@ergcoach/shared';

export interface VolumeWorkout {
  startedAt: Date;
  distanceMeters: number;
  durationSeconds: number;
  workoutType: WorkoutClassification;
}

export interface WeeklyVolume {
  weekStart: Date;
  totalMeters: number;
  totalDurationSeconds: number;
  sessionCount: number;
  intensityBreakdown: Partial<Record<WorkoutClassification, number>>;
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export function calculateWeeklyVolume(
  workouts: VolumeWorkout[],
  referenceDate: Date = new Date(),
): WeeklyVolume {
  const weekStart = startOfUtcWeek(referenceDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  const inWeek = workouts.filter(
    (w) => w.startedAt >= weekStart && w.startedAt < weekEnd,
  );

  const intensityBreakdown: Partial<Record<WorkoutClassification, number>> = {};
  let totalMeters = 0;
  let totalDurationSeconds = 0;

  for (const w of inWeek) {
    totalMeters += w.distanceMeters;
    totalDurationSeconds += w.durationSeconds;
    intensityBreakdown[w.workoutType] =
      (intensityBreakdown[w.workoutType] ?? 0) + w.distanceMeters;
  }

  return {
    weekStart,
    totalMeters,
    totalDurationSeconds,
    sessionCount: inWeek.length,
    intensityBreakdown,
  };
}

export function calculateRollingVolume(
  workouts: VolumeWorkout[],
  days: number,
  referenceDate: Date = new Date(),
): { totalMeters: number; totalDurationSeconds: number; sessionCount: number } {
  const end = referenceDate;
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);

  const inWindow = workouts.filter((w) => w.startedAt >= start && w.startedAt <= end);
  return {
    totalMeters: inWindow.reduce((s, w) => s + w.distanceMeters, 0),
    totalDurationSeconds: inWindow.reduce((s, w) => s + w.durationSeconds, 0),
    sessionCount: inWindow.length,
  };
}
