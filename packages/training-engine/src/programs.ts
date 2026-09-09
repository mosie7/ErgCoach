import type { ProgramEventType, WorkoutClassification } from '@ergcoach/shared';
import { EVENT_DISTANCE_METERS } from '@ergcoach/shared';
import {
  CONCEPT2_2K_SOURCE,
  CONCEPT2_2K_WEEKS,
  CONCEPT2_5K_SOURCE,
  CONCEPT2_5K_WEEKS,
  CONCEPT2_HALF_SOURCE,
  CONCEPT2_HALF_WEEKS,
  CONCEPT2_MARATHON_SOURCE,
  CONCEPT2_MARATHON_WEEKS,
  CONCEPT2_PACE_OFFSETS,
  type Concept2PlanSource,
  type Concept2Session,
  type PaceZone,
} from './concept2-plans.js';

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
  /** False when Concept2 has no public plan for this distance yet */
  available: boolean;
  source: Concept2PlanSource | null;
  /** Endurance plans use Concept2 zones vs 5k pace */
  paceReference: '5k' | 'race' | null;
}

export const TRAINING_PROGRAMS: TrainingProgramDefinition[] = [
  {
    eventType: 'two_k',
    slug: '2k',
    name: '2k',
    shortLabel: '2k',
    distanceMeters: EVENT_DISTANCE_METERS.two_k,
    durationWeeks: 12,
    sessionsPerWeek: 4,
    focus: 'Speed & power',
    summary: 'Concept2 12-week 2k erg test plan (Cycle 1 + Cycle 2 twice).',
    available: true,
    source: CONCEPT2_2K_SOURCE,
    paceReference: 'race',
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
    summary: 'Concept2 5k erg test plan (Cycle 1 + Cycle 2).',
    available: true,
    source: CONCEPT2_5K_SOURCE,
    paceReference: 'race',
  },
  {
    eventType: 'ten_k',
    slug: '10k',
    name: '10k',
    shortLabel: '10k',
    distanceMeters: EVENT_DISTANCE_METERS.ten_k,
    durationWeeks: 0,
    sessionsPerWeek: 0,
    focus: 'Coming soon',
    summary: 'Concept2 does not publish a dedicated 10k training plan yet.',
    available: false,
    source: null,
    paceReference: null,
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
    summary: 'Concept2 10-week half marathon row training plan.',
    available: true,
    source: CONCEPT2_HALF_SOURCE,
    paceReference: '5k',
  },
  {
    eventType: 'marathon',
    slug: 'marathon',
    name: 'Marathon',
    shortLabel: 'Marathon',
    distanceMeters: EVENT_DISTANCE_METERS.marathon,
    durationWeeks: 16,
    sessionsPerWeek: 4,
    focus: 'Durability',
    summary:
      'Concept2 16-week marathon plan, with weeks 5 and 9 AT sessions replaced by 5k time trials for pace resets.',
    available: true,
    source: CONCEPT2_MARATHON_SOURCE,
    paceReference: '5k',
  },
  {
    eventType: 'hundred_k',
    slug: '100k',
    name: '100k',
    shortLabel: '100k',
    distanceMeters: EVENT_DISTANCE_METERS.hundred_k,
    durationWeeks: 0,
    sessionsPerWeek: 0,
    focus: 'Coming soon',
    summary: 'Concept2 does not publish a dedicated 100k training plan yet.',
    available: false,
    source: null,
    paceReference: null,
  },
];

export function getTrainingProgram(eventType: ProgramEventType): TrainingProgramDefinition {
  const program = TRAINING_PROGRAMS.find((p) => p.eventType === eventType);
  if (!program) {
    throw new Error(`Unknown training program: ${eventType}`);
  }
  return program;
}

function weeksFor(eventType: ProgramEventType): Concept2Session[][] {
  switch (eventType) {
    case 'two_k':
      return CONCEPT2_2K_WEEKS;
    case 'five_k':
      return CONCEPT2_5K_WEEKS;
    case 'half_marathon':
      return CONCEPT2_HALF_WEEKS;
    case 'marathon':
      return CONCEPT2_MARATHON_WEEKS;
    default:
      return [];
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

function paceRange(
  referencePaceSeconds500m: number | null | undefined,
  zone: PaceZone | undefined,
): { min: number | null; max: number | null } {
  if (referencePaceSeconds500m == null || zone == null) {
    return { min: null, max: null };
  }
  const offset = CONCEPT2_PACE_OFFSETS[zone];
  if (!offset) {
    return { min: null, max: null };
  }
  return {
    min: referencePaceSeconds500m + offset.min,
    max: referencePaceSeconds500m + offset.max,
  };
}

function sessionTitle(weekIndex: number, session: Concept2Session): string {
  const prefix = `W${weekIndex + 1}`;
  if (session.optional) return `${prefix}: ${session.text} (optional)`;
  if (session.isPaceCheck) return `${prefix}: ${session.text}`;
  return `${prefix}: ${session.text}`;
}

function sessionInstructions(
  session: Concept2Session,
  program: TrainingProgramDefinition,
): string {
  const parts = [session.text];
  if (session.isPaceCheck) {
    parts.push(
      'Pace check: record average pace and update training targets for remaining weeks.',
    );
  }
  if (session.optional) {
    parts.push('Optional session.');
  }
  if (program.source?.adaptations?.length && session.isPaceCheck && program.eventType === 'marathon') {
    parts.push('ErgCoach adaptation of the Concept2 marathon plan.');
  }
  if (session.paceZone && ['UT2', 'UT1', 'AT', 'MP', 'HMP', 'easy'].includes(session.paceZone)) {
    parts.push(`Zone ${session.paceZone} (Concept2 guide vs 5k pace).`);
  }
  if (/[×x]\s*\d+\s*min/i.test(session.text)) {
    parts.push('Limit rest between interval pieces to no more than 3 minutes.');
  }
  return parts.join(' ');
}

export interface GenerateProgramPlanInput {
  eventType: ProgramEventType;
  startDate?: Date;
  /** For half/marathon: 5k pace. For 2k/5k: race/reference pace. */
  targetPaceSeconds500m?: number | null;
  weeks?: number;
  includeOptionalSessions?: boolean;
}

export interface GeneratedProgramPlan {
  program: TrainingProgramDefinition;
  name: string;
  startDate: Date;
  endDate: Date;
  sessions: Array<{
    weekIndex: number;
    dayOffset: number;
    scheduledDate: Date;
    workoutType: WorkoutClassification;
    title: string;
    targetDurationSeconds: number | null;
    targetDistanceMeters: number | null;
    targetPaceMinSeconds500m: number | null;
    targetPaceMaxSeconds500m: number | null;
    targetSpmMin: number | null;
    targetSpmMax: number | null;
    instructions: string;
  }>;
}

export function generateProgramPlan(input: GenerateProgramPlanInput): GeneratedProgramPlan {
  const program = getTrainingProgram(input.eventType);
  if (!program.available) {
    throw new Error(`No public Concept2 plan available for ${input.eventType} yet.`);
  }

  const weekTemplates = weeksFor(input.eventType);
  const weeks = input.weeks ?? weekTemplates.length;
  const includeOptional = input.includeOptionalSessions ?? true;
  const startDate = startOfUtcWeek(input.startDate ?? new Date());
  const endDate = addDays(startDate, weeks * 7 - 1);
  const referencePace = input.targetPaceSeconds500m ?? null;

  const sessions: GeneratedProgramPlan['sessions'] = [];

  for (let week = 0; week < weeks; week++) {
    const template = weekTemplates[week] ?? weekTemplates[weekTemplates.length - 1]!;
    const weekStart = addDays(startDate, week * 7);

    for (const session of template) {
      if (session.optional && !includeOptional) continue;

      const zone = session.paceZone;
      const useZoneOffsets = program.paceReference === '5k';
      const range = useZoneOffsets ? paceRange(referencePace, zone) : { min: null, max: null };

      sessions.push({
        weekIndex: week,
        dayOffset: session.dayOffset,
        scheduledDate: addDays(weekStart, session.dayOffset),
        workoutType: session.workoutType,
        title: sessionTitle(week, session),
        targetDurationSeconds: session.targetDurationSeconds ?? null,
        targetDistanceMeters: session.targetDistanceMeters ?? null,
        targetPaceMinSeconds500m: range.min,
        targetPaceMaxSeconds500m: range.max,
        targetSpmMin: null,
        targetSpmMax: null,
        instructions: sessionInstructions(session, program),
      });
    }
  }

  const name = program.source
    ? `${program.source.name}${program.eventType === 'marathon' ? ' (adapted)' : ''}`
    : `${program.name} plan`;

  return {
    program,
    name,
    startDate,
    endDate,
    sessions,
  };
}

export {
  CONCEPT2_2K_SOURCE,
  CONCEPT2_5K_SOURCE,
  CONCEPT2_HALF_SOURCE,
  CONCEPT2_MARATHON_SOURCE,
};
