import type { ProgramEventType, WorkoutClassification } from '@ergcoach/shared';
import { EVENT_DISTANCE_METERS } from '@ergcoach/shared';

export interface TrainingProgramDefinition {
  eventType: ProgramEventType;
  slug: string;
  name: string;
  shortLabel: string;
  distanceMeters: number;
  durationWeeks: number;
  sessionsPerWeek: number;
  focus: string;
  summary: string;
}

export const TRAINING_PROGRAMS: TrainingProgramDefinition[] = [
  {
    eventType: 'two_k',
    slug: '2k',
    name: '2k Race',
    shortLabel: '2k',
    distanceMeters: EVENT_DISTANCE_METERS.two_k,
    durationWeeks: 6,
    sessionsPerWeek: 4,
    focus: 'Speed & power',
    summary: 'Short, sharp speed work with anaerobic pieces and race-pace intervals.',
  },
  {
    eventType: 'five_k',
    slug: '5k',
    name: '5k',
    shortLabel: '5k',
    distanceMeters: EVENT_DISTANCE_METERS.five_k,
    durationWeeks: 8,
    sessionsPerWeek: 4,
    focus: 'Threshold speed',
    summary: 'Build sustainable race pace with AT intervals and supporting aerobic volume.',
  },
  {
    eventType: 'ten_k',
    slug: '10k',
    name: '10k',
    shortLabel: '10k',
    distanceMeters: EVENT_DISTANCE_METERS.ten_k,
    durationWeeks: 8,
    sessionsPerWeek: 4,
    focus: 'Tempo endurance',
    summary: 'Longer UT1/AT sessions that teach holding pace under accumulating fatigue.',
  },
  {
    eventType: 'half_marathon',
    slug: 'half-marathon',
    name: 'Half marathon',
    shortLabel: 'Half',
    distanceMeters: EVENT_DISTANCE_METERS.half_marathon,
    durationWeeks: 10,
    sessionsPerWeek: 4,
    focus: 'Aerobic base',
    summary: 'Steady UT2 volume plus progressive long rows toward ~21k.',
  },
  {
    eventType: 'marathon',
    slug: 'marathon',
    name: 'Marathon',
    shortLabel: 'Marathon',
    distanceMeters: EVENT_DISTANCE_METERS.marathon,
    durationWeeks: 12,
    sessionsPerWeek: 5,
    focus: 'Durability',
    summary: 'Classic RowErg marathon build: UT2 foundation, long rows, and race-pace practice.',
  },
  {
    eventType: 'hundred_k',
    slug: '100k',
    name: '100k',
    shortLabel: '100k',
    distanceMeters: EVENT_DISTANCE_METERS.hundred_k,
    durationWeeks: 16,
    sessionsPerWeek: 5,
    focus: 'Ultra endurance',
    summary: 'High-volume, low-intensity preparation for a 100k row with very long steady sessions.',
  },
];

export function getTrainingProgram(eventType: ProgramEventType): TrainingProgramDefinition {
  const program = TRAINING_PROGRAMS.find((p) => p.eventType === eventType);
  if (!program) {
    throw new Error(`Unknown training program: ${eventType}`);
  }
  return program;
}

export interface GeneratedPlannedSession {
  weekIndex: number;
  dayOffset: number;
  workoutType: WorkoutClassification;
  title: string;
  targetDurationSeconds: number | null;
  targetDistanceMeters: number | null;
  targetPaceMinSeconds500m: number | null;
  targetPaceMaxSeconds500m: number | null;
  targetSpmMin: number | null;
  targetSpmMax: number | null;
  instructions: string;
}

interface SessionTemplate {
  dayOffset: number;
  workoutType: WorkoutClassification;
  title: string;
  /** Scale factor applied to program distance for distance-based sessions */
  distanceFactor?: number;
  /** Fixed duration when not distance-based */
  durationMinutes?: number;
  paceOffsetMin?: number;
  paceOffsetMax?: number;
  spmMin?: number;
  spmMax?: number;
  instructions: string;
  /** Optional week-progress scaling for long rows (0–1 of race distance by end) */
  longRowProgress?: boolean;
}

function weeklyTemplates(eventType: ProgramEventType): SessionTemplate[] {
  switch (eventType) {
    case 'two_k':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'Aerobic technique',
          durationMinutes: 40,
          paceOffsetMin: 12,
          paceOffsetMax: 18,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Easy UT2. Focus on catch timing and relaxed recovery.',
        },
        {
          dayOffset: 2,
          workoutType: 'TR',
          title: 'Race-pace intervals',
          distanceFactor: 0.6,
          paceOffsetMin: -2,
          paceOffsetMax: 2,
          spmMin: 28,
          spmMax: 32,
          instructions: '6–8 × ~250–500m at 2k pace with equal rest. Stay long and aggressive.',
        },
        {
          dayOffset: 4,
          workoutType: 'AN',
          title: 'Power pieces',
          durationMinutes: 30,
          paceOffsetMin: -8,
          paceOffsetMax: -2,
          spmMin: 30,
          spmMax: 34,
          instructions: 'Short anaerobic bursts (e.g. 8×250m). Full recovery between pieces.',
        },
        {
          dayOffset: 6,
          workoutType: 'benchmark',
          title: '2k rate / open',
          distanceFactor: 1,
          paceOffsetMin: -2,
          paceOffsetMax: 2,
          spmMin: 30,
          spmMax: 36,
          instructions: 'Every other week: full 2k. Off weeks: 4×500m at goal pace.',
        },
      ];
    case 'five_k':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'Steady UT2',
          durationMinutes: 45,
          paceOffsetMin: 10,
          paceOffsetMax: 16,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Conversational effort. Smooth splits.',
        },
        {
          dayOffset: 2,
          workoutType: 'AT',
          title: 'Threshold intervals',
          distanceFactor: 0.8,
          paceOffsetMin: 0,
          paceOffsetMax: 4,
          spmMin: 24,
          spmMax: 28,
          instructions: '3–5 × 1000–1500m near 5k pace with short rest.',
        },
        {
          dayOffset: 4,
          workoutType: 'UT1',
          title: 'Steady UT1',
          durationMinutes: 40,
          paceOffsetMin: 4,
          paceOffsetMax: 8,
          spmMin: 20,
          spmMax: 22,
          instructions: 'Continuous pressure just below threshold.',
        },
        {
          dayOffset: 6,
          workoutType: 'benchmark',
          title: '5k progressive',
          distanceFactor: 1,
          paceOffsetMin: 0,
          paceOffsetMax: 4,
          longRowProgress: true,
          instructions: 'Build toward a full 5k. Practice even pacing.',
        },
      ];
    case 'ten_k':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'Base UT2',
          durationMinutes: 50,
          paceOffsetMin: 10,
          paceOffsetMax: 16,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Aerobic base. Keep SPM low and consistent.',
        },
        {
          dayOffset: 2,
          workoutType: 'AT',
          title: 'Tempo pieces',
          distanceFactor: 0.5,
          paceOffsetMin: 0,
          paceOffsetMax: 4,
          spmMin: 22,
          spmMax: 26,
          instructions: '2–3 × 2–3k at goal 10k pace.',
        },
        {
          dayOffset: 4,
          workoutType: 'UT1',
          title: 'UT1 continuous',
          durationMinutes: 45,
          paceOffsetMin: 4,
          paceOffsetMax: 8,
          spmMin: 20,
          spmMax: 22,
          instructions: 'One continuous UT1 block. Note HR drift.',
        },
        {
          dayOffset: 6,
          workoutType: 'UT2',
          title: 'Long aerobic',
          distanceFactor: 0.8,
          paceOffsetMin: 10,
          paceOffsetMax: 16,
          longRowProgress: true,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Progressive long row building toward race distance.',
        },
      ];
    case 'half_marathon':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'UT2 foundation',
          durationMinutes: 55,
          paceOffsetMin: 8,
          paceOffsetMax: 14,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Easy kilometres. Technique over pace chasing.',
        },
        {
          dayOffset: 2,
          workoutType: 'UT1',
          title: 'Half-marathon pace',
          distanceFactor: 0.35,
          paceOffsetMin: 0,
          paceOffsetMax: 4,
          spmMin: 20,
          spmMax: 22,
          instructions: 'Sustained work at goal half-marathon pace.',
        },
        {
          dayOffset: 4,
          workoutType: 'AT',
          title: 'Short threshold',
          durationMinutes: 35,
          paceOffsetMin: -2,
          paceOffsetMax: 2,
          spmMin: 22,
          spmMax: 24,
          instructions: 'Brief AT to keep top-end without dumping fatigue.',
        },
        {
          dayOffset: 6,
          workoutType: 'UT2',
          title: 'Long row',
          distanceFactor: 0.7,
          paceOffsetMin: 8,
          paceOffsetMax: 14,
          longRowProgress: true,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Progressive long row toward half-marathon distance.',
        },
      ];
    case 'marathon':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'UT2 volume',
          durationMinutes: 60,
          paceOffsetMin: 8,
          paceOffsetMax: 14,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Core aerobic session. Even splits, low SPM.',
        },
        {
          dayOffset: 1,
          workoutType: 'recovery',
          title: 'Recovery spin',
          durationMinutes: 30,
          paceOffsetMin: 16,
          paceOffsetMax: 22,
          spmMin: 16,
          spmMax: 18,
          instructions: 'Very easy. Optional if fatigued.',
        },
        {
          dayOffset: 3,
          workoutType: 'UT1',
          title: 'Marathon-pace block',
          distanceFactor: 0.25,
          paceOffsetMin: 0,
          paceOffsetMax: 4,
          spmMin: 20,
          spmMax: 22,
          instructions: 'Continuous block at goal marathon pace.',
        },
        {
          dayOffset: 5,
          workoutType: 'AT',
          title: 'Light threshold',
          durationMinutes: 35,
          paceOffsetMin: -2,
          paceOffsetMax: 2,
          spmMin: 22,
          spmMax: 24,
          instructions: 'Keep some sharpness without compromising the long row.',
        },
        {
          dayOffset: 6,
          workoutType: 'UT2',
          title: 'Long row',
          distanceFactor: 0.55,
          paceOffsetMin: 8,
          paceOffsetMax: 14,
          longRowProgress: true,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Progressive long row building toward marathon distance.',
        },
      ];
    case 'hundred_k':
      return [
        {
          dayOffset: 0,
          workoutType: 'UT2',
          title: 'Volume UT2',
          durationMinutes: 75,
          paceOffsetMin: 10,
          paceOffsetMax: 18,
          spmMin: 18,
          spmMax: 20,
          instructions: 'High aerobic volume. Prioritise consistency over pace.',
        },
        {
          dayOffset: 1,
          workoutType: 'recovery',
          title: 'Easy recovery',
          durationMinutes: 35,
          paceOffsetMin: 18,
          paceOffsetMax: 24,
          spmMin: 16,
          spmMax: 18,
          instructions: 'Keep blood moving. Skip if legs are heavy.',
        },
        {
          dayOffset: 3,
          workoutType: 'UT2',
          title: 'Steady mid-week',
          durationMinutes: 60,
          paceOffsetMin: 10,
          paceOffsetMax: 16,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Another aerobic block. Fuel as you would on race day.',
        },
        {
          dayOffset: 5,
          workoutType: 'UT1',
          title: 'Controlled pressure',
          durationMinutes: 45,
          paceOffsetMin: 4,
          paceOffsetMax: 8,
          spmMin: 20,
          spmMax: 22,
          instructions: 'Slightly higher intensity to keep efficiency without digging a hole.',
        },
        {
          dayOffset: 6,
          workoutType: 'UT2',
          title: 'Ultra long row',
          distanceFactor: 0.35,
          paceOffsetMin: 12,
          paceOffsetMax: 20,
          longRowProgress: true,
          spmMin: 18,
          spmMax: 20,
          instructions: 'Progressive ultra long row. Practice nutrition and pacing discipline.',
        },
      ];
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

export interface GenerateProgramPlanInput {
  eventType: ProgramEventType;
  startDate?: Date;
  targetPaceSeconds500m?: number | null;
  weeks?: number;
}

export interface GeneratedProgramPlan {
  program: TrainingProgramDefinition;
  name: string;
  startDate: Date;
  endDate: Date;
  sessions: Array<GeneratedPlannedSession & { scheduledDate: Date }>;
}

export function generateProgramPlan(input: GenerateProgramPlanInput): GeneratedProgramPlan {
  const program = getTrainingProgram(input.eventType);
  const weeks = input.weeks ?? program.durationWeeks;
  const startDate = startOfUtcWeek(input.startDate ?? new Date());
  const endDate = addDays(startDate, weeks * 7 - 1);
  const templates = weeklyTemplates(input.eventType);
  const raceDistance = program.distanceMeters;
  const targetPace = input.targetPaceSeconds500m ?? null;

  const sessions: GeneratedProgramPlan['sessions'] = [];

  for (let week = 0; week < weeks; week++) {
    const progress = weeks <= 1 ? 1 : week / (weeks - 1);
    const weekStart = addDays(startDate, week * 7);

    for (const template of templates) {
      let targetDistanceMeters: number | null = null;
      let targetDurationSeconds: number | null =
        template.durationMinutes != null ? template.durationMinutes * 60 : null;

      if (template.longRowProgress) {
        const baseFactor = template.distanceFactor ?? 0.5;
        // Ramp from ~45% of baseFactor*race to full baseFactor*race (capped at race distance)
        const ramp = 0.45 + 0.55 * progress;
        targetDistanceMeters = Math.round(
          Math.min(raceDistance, raceDistance * baseFactor * ramp),
        );
        targetDurationSeconds = null;
      } else if (template.distanceFactor != null) {
        targetDistanceMeters = Math.round(raceDistance * template.distanceFactor);
      }

      const paceMin =
        targetPace != null && template.paceOffsetMin != null
          ? targetPace + template.paceOffsetMin
          : null;
      const paceMax =
        targetPace != null && template.paceOffsetMax != null
          ? targetPace + template.paceOffsetMax
          : null;

      sessions.push({
        weekIndex: week,
        dayOffset: template.dayOffset,
        scheduledDate: addDays(weekStart, template.dayOffset),
        workoutType: template.workoutType,
        title: `W${week + 1}: ${template.title}`,
        targetDurationSeconds,
        targetDistanceMeters,
        targetPaceMinSeconds500m: paceMin,
        targetPaceMaxSeconds500m: paceMax,
        targetSpmMin: template.spmMin ?? null,
        targetSpmMax: template.spmMax ?? null,
        instructions: template.instructions,
      });
    }
  }

  return {
    program,
    name: `${program.name} · ${weeks}-week plan`,
    startDate,
    endDate,
    sessions,
  };
}
