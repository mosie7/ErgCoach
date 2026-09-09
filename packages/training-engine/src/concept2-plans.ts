import type { WorkoutClassification } from '@ergcoach/shared';

/**
 * Public Concept2 training plans encoded for ErgCoach.
 * Sources (accessed 2026-09-09):
 * - https://www.concept2.com/training/plans/2k-erg-test-12-week
 * - https://www.concept2.com/training/plans/5k-erg-test
 * - https://www.concept2.com/training/plans/half-marathon-row-training-plan
 * - https://www.concept2.com/training/plans/marathon-row-training-plan
 *
 * Marathon plan includes ErgCoach adaptations: weeks 5 and 9 Session 2
 * (AT intervals) replaced with 5k time trials for pace recalibration.
 */

export type PaceZone = 'UT2' | 'UT1' | 'AT' | 'MP' | 'HMP' | 'easy' | 'race' | 'work';

export interface Concept2Session {
  /** Mon=0 … Sun=6 */
  dayOffset: number;
  /** Original Concept2 workout text (or adapted) */
  text: string;
  workoutType: WorkoutClassification;
  optional?: boolean;
  /** Pace zone vs 5k pace (Concept2 endurance plans) */
  paceZone?: PaceZone;
  targetDistanceMeters?: number | null;
  targetDurationSeconds?: number | null;
  /** Mark sessions that should trigger pace recalibration */
  isPaceCheck?: boolean;
}

export interface Concept2PlanSource {
  name: string;
  url: string;
  attribution: string;
  adaptations?: string[];
}

/** Concept2 endurance pace guide vs 5k pace (seconds / 500m). */
export const CONCEPT2_PACE_OFFSETS: Record<
  PaceZone,
  { min: number; max: number } | null
> = {
  UT2: { min: 18, max: 22 },
  UT1: { min: 14, max: 18 },
  MP: { min: 10, max: 14 },
  HMP: { min: 8, max: 12 },
  AT: { min: 6, max: 10 },
  easy: { min: 20, max: 28 },
  race: { min: 0, max: 0 },
  work: null,
};

function s(
  dayOffset: number,
  text: string,
  workoutType: WorkoutClassification,
  extras: Partial<Concept2Session> = {},
): Concept2Session {
  return { dayOffset, text, workoutType, ...extras };
}

function km(n: number): number {
  return Math.round(n * 1000);
}

function min(n: number): number {
  return Math.round(n * 60);
}

function normalizeZone(raw: string): PaceZone {
  switch (raw.toLowerCase()) {
    case 'ut2':
      return 'UT2';
    case 'ut1':
      return 'UT1';
    case 'at':
      return 'AT';
    case 'mp':
      return 'MP';
    case 'hmp':
      return 'HMP';
    case 'easy':
      return 'easy';
    default:
      return 'work';
  }
}

function zoneToWorkoutType(zone: PaceZone): WorkoutClassification {
  if (zone === 'AT') return 'AT';
  if (zone === 'UT1' || zone === 'MP' || zone === 'HMP') return 'UT1';
  if (zone === 'easy') return 'recovery';
  if (zone === 'race') return 'race';
  return 'UT2';
}

/** Parse common Concept2 distance/time session shorthand into structured fields. */
export function enrichEnduranceSession(
  dayOffset: number,
  text: string,
): Concept2Session {
  const t = text.trim();

  if (/^optional\s+5\s*km$/i.test(t)) {
    return s(dayOffset, t, 'UT2', {
      optional: true,
      paceZone: 'easy',
      targetDistanceMeters: km(5),
    });
  }
  if (/^marathon\s+row$/i.test(t)) {
    return s(dayOffset, t, 'race', {
      paceZone: 'race',
      targetDistanceMeters: 42195,
    });
  }
  if (/^half\s+marathon$/i.test(t)) {
    return s(dayOffset, t, 'race', {
      paceZone: 'race',
      targetDistanceMeters: 21097,
    });
  }
  if (/5k\s+time\s+trial/i.test(t)) {
    return s(dayOffset, t, 'benchmark', {
      paceZone: 'race',
      targetDistanceMeters: 5000,
      isPaceCheck: true,
    });
  }

  const distZone = t.match(/^(\d+(?:\.\d+)?)\s*km\s+(UT2|UT1|AT|MP|HMP|easy)$/i);
  if (distZone?.[1] && distZone[2]) {
    const zone = normalizeZone(distZone[2]);
    return s(dayOffset, t, zoneToWorkoutType(zone), {
      paceZone: zone,
      targetDistanceMeters: km(Number(distZone[1])),
    });
  }

  const easy = t.match(/^(\d+(?:\.\d+)?)\s*km\s+(easy|very easy)$/i);
  if (easy?.[1]) {
    return s(dayOffset, t, 'recovery', {
      paceZone: 'easy',
      targetDistanceMeters: km(Number(easy[1])),
    });
  }

  const timedIntervals = t.match(
    /^(\d+)\s*[×x]\s*(\d+)\s*min\s+(UT2|UT1|AT|MP|HMP)$/i,
  );
  if (timedIntervals?.[1] && timedIntervals[2] && timedIntervals[3]) {
    const reps = Number(timedIntervals[1]);
    const minutes = Number(timedIntervals[2]);
    const zone = normalizeZone(timedIntervals[3]);
    return s(dayOffset, t, zoneToWorkoutType(zone), {
      paceZone: zone,
      targetDurationSeconds: min(reps * minutes),
    });
  }

  const singleTimed = t.match(/^(\d+)\s*min\s+(UT2|UT1|AT|MP|HMP)$/i);
  if (singleTimed?.[1] && singleTimed[2]) {
    const zone = normalizeZone(singleTimed[2]);
    return s(dayOffset, t, zoneToWorkoutType(zone), {
      paceZone: zone,
      targetDurationSeconds: min(Number(singleTimed[1])),
    });
  }

  return s(dayOffset, t, 'unknown', { paceZone: 'work' });
}

// Endurance week helper
function enduranceWeek(sessions: Array<[number, string]>): Concept2Session[] {
  return sessions.map(([day, text]) => enrichEnduranceSession(day, text));
}

/** Mon / Wed / Fri / Sat */
const D = { s1: 0, s2: 2, s3: 4, s4: 5 } as const;

export const CONCEPT2_MARATHON_SOURCE: Concept2PlanSource = {
  name: 'Concept2 Marathon Row Training Plan',
  url: 'https://www.concept2.com/training/plans/marathon-row-training-plan',
  attribution: 'Based on the public Concept2 Marathon Row Training Plan (16 weeks, 4 sessions/week).',
  adaptations: [
    'Week 5 Session 2: replaced 4×10 min AT with a 5k time trial to recalibrate pacing.',
    'Week 9 Session 2: replaced 3×12 min AT with a 5k time trial to recalibrate pacing.',
  ],
};

export const CONCEPT2_MARATHON_WEEKS: Concept2Session[][] = [
  enduranceWeek([
    [D.s1, '10 km UT2'],
    [D.s2, '3×10 min UT1'],
    [D.s3, '12 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '4×8 min AT'],
    [D.s3, '14 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '3×15 min UT1'],
    [D.s3, '16 km UT2'],
    [D.s4, '10 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '10 km UT2'],
    [D.s2, '3×10 min AT'],
    [D.s3, '12 km UT2'],
    [D.s4, '6 km easy'],
  ]),
  // Week 5 — adapted: AT → 5k TT
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '5k time trial'],
    [D.s3, '18 km UT2'],
    [D.s4, '10 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '16 km UT2'],
    [D.s2, '2×30 min UT1'],
    [D.s3, '22 km UT2'],
    [D.s4, '10 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '16 km UT2'],
    [D.s2, '5×8 min AT'],
    [D.s3, '26 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '2×20 min UT1'],
    [D.s3, '18 km UT2'],
    [D.s4, '6 km easy'],
  ]),
  // Week 9 — adapted: AT → 5k TT
  enduranceWeek([
    [D.s1, '16 km UT2'],
    [D.s2, '5k time trial'],
    [D.s3, '28 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '18 km UT2'],
    [D.s2, '3×25 min MP'],
    [D.s3, '30 km UT2'],
    [D.s4, '6 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '16 km UT2'],
    [D.s2, '2×20 min AT'],
    [D.s3, '32 km UT2'],
    [D.s4, '6 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '50 min MP'],
    [D.s3, '34 km UT2'],
    [D.s4, '6 km easy'],
  ]),
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '3×10 min AT'],
    [D.s3, '28 km UT2'],
    [D.s4, '6 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '2×20 min MP'],
    [D.s3, '22 km UT2'],
    [D.s4, '6 km easy'],
  ]),
  enduranceWeek([
    [D.s1, '10 km UT2'],
    [D.s2, '2×8 min AT'],
    [D.s3, '14 km UT2'],
    [D.s4, 'Optional 5 km'],
  ]),
  enduranceWeek([
    [D.s1, '6 km easy'],
    [D.s2, '3×5 min MP'],
    [D.s3, '4 km very easy'],
    [D.s4, 'Marathon Row'],
  ]),
];

export const CONCEPT2_HALF_SOURCE: Concept2PlanSource = {
  name: 'Concept2 Half Marathon Row Training Plan',
  url: 'https://www.concept2.com/training/plans/half-marathon-row-training-plan',
  attribution:
    'Based on the public Concept2 Half Marathon Row Training Plan (10 weeks, 4 sessions/week).',
};

export const CONCEPT2_HALF_WEEKS: Concept2Session[][] = [
  enduranceWeek([
    [D.s1, '8 km UT2'],
    [D.s2, '3×10 min UT1'],
    [D.s3, '10 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '10 km UT2'],
    [D.s2, '4×8 min AT'],
    [D.s3, '10 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '3×15 min UT1'],
    [D.s3, '10 km UT2'],
    [D.s4, '8 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '10 km UT2'],
    [D.s2, '3×10 min AT'],
    [D.s3, '10 km UT2'],
    [D.s4, '2×20 min AT'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '2×30 min UT1'],
    [D.s3, '10 km UT2'],
    [D.s4, '3×12 min AT'],
  ]),
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '5×8 min AT'],
    [D.s3, '10 km UT2'],
    [D.s4, '3×10 min AT'],
  ]),
  enduranceWeek([
    [D.s1, '12 km UT2'],
    [D.s2, '2×20 min HMP'],
    [D.s3, '8 km UT2'],
    [D.s4, '2×20 min AT'],
  ]),
  enduranceWeek([
    [D.s1, '14 km UT2'],
    [D.s2, '50 min HMP'],
    [D.s3, '8 km UT2'],
    [D.s4, '3×12 min AT'],
  ]),
  enduranceWeek([
    [D.s1, '16 km UT2'],
    [D.s2, '2×20 min HMP'],
    [D.s3, '6 km UT2'],
    [D.s4, '6 km UT2'],
  ]),
  enduranceWeek([
    [D.s1, '6 km easy'],
    [D.s2, '3×5 min HMP'],
    [D.s3, '4 km very easy'],
    [D.s4, 'Half Marathon'],
  ]),
];

function intervalSession(
  dayOffset: number,
  text: string,
  workoutType: WorkoutClassification,
  extras: Partial<Concept2Session> = {},
): Concept2Session {
  return s(dayOffset, text, extras.workoutType ?? workoutType, {
    paceZone: 'work',
    ...extras,
  });
}

function parseDistanceMeters(text: string): number | null {
  const m = text.match(/(\d[\d,]*)\s*m\b/i);
  if (!m?.[1]) return null;
  return Number(m[1].replace(/,/g, ''));
}

function parseDurationSeconds(text: string): number | null {
  // e.g. 4 x 4 minutes, 15 times X 1min, 30 minute continuous
  const multi = text.match(/(\d+)\s*[x×]\s*(\d+)\s*min/i);
  if (multi?.[1] && multi[2]) return Number(multi[1]) * Number(multi[2]) * 60;
  const timesX = text.match(/(\d+)\s*times?\s*[x×]\s*(\d+)\s*min/i);
  if (timesX?.[1] && timesX[2]) return Number(timesX[1]) * Number(timesX[2]) * 60;
  const continuous = text.match(/(\d+)\s*minute/i);
  if (continuous?.[1]) return Number(continuous[1]) * 60;
  return null;
}

function twoKDay(
  dayOffset: number,
  text: string,
  opts: Partial<Concept2Session> = {},
): Concept2Session {
  const lower = text.toLowerCase();
  let workoutType: WorkoutClassification = 'TR';
  if (lower.includes('time trial') || lower.includes('2000m test') || lower.includes('2000m race') || lower.includes('2,000m')) {
    workoutType = 'benchmark';
  } else if (lower.includes('consistent pace') || lower.includes('steady easy') || lower.includes('optional')) {
    workoutType = 'UT2';
  } else if (lower.includes('1 minute') || lower.includes('2 minute') || lower.includes('2 minutes')) {
    workoutType = 'AN';
  }

  return intervalSession(dayOffset, text, workoutType, {
    optional: /optional/i.test(text) || undefined,
    targetDistanceMeters: parseDistanceMeters(text),
    targetDurationSeconds: parseDurationSeconds(text),
    isPaceCheck: /test|time trial|race/i.test(text) && /2000|2,\s*000|2k/i.test(text),
    ...opts,
  });
}

/** Concept2 2k 12-week plan: Cycle 1 once, Cycle 2 twice. */
export const CONCEPT2_2K_SOURCE: Concept2PlanSource = {
  name: 'Concept2 2K Erg Test — 12 Week Plan',
  url: 'https://www.concept2.com/training/plans/2k-erg-test-12-week',
  attribution: 'Based on the public Concept2 2K Erg Test 12-week plan (Cycle 1 + Cycle 2 × 2).',
};

const TWO_K_CYCLE_1: Concept2Session[][] = [
  [
    twoKDay(D.s1, '2,000m row. Initial time trial. Don’t start too fast. Aim to increase pace over the second half. Record your time.', {
      targetDistanceMeters: 2000,
      isPaceCheck: true,
      workoutType: 'benchmark',
    }),
    twoKDay(D.s2, '4 x 4 minutes work with 2 min rest'),
    twoKDay(D.s3, '6 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '5000m row at a consistent pace', { optional: true, targetDistanceMeters: 5000 }),
  ],
  [
    twoKDay(D.s1, '4 x 4 minutes with 2 min rest'),
    twoKDay(D.s2, '3 x 6 minutes work with 3 min rest'),
    twoKDay(D.s3, '6 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '5000m row at a consistent pace', { optional: true, targetDistanceMeters: 5000 }),
  ],
  [
    twoKDay(D.s1, '5 x 4 minutes with 2 min rest'),
    twoKDay(D.s2, '3 x 6 minutes work with 3 min rest'),
    twoKDay(D.s3, '8 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '6000m row at a consistent pace', { optional: true, targetDistanceMeters: 6000 }),
  ],
  [
    twoKDay(D.s1, '5 x 4 minutes with 2 min rest'),
    twoKDay(D.s2, '3 x 6 minutes work with 3 min rest'),
    twoKDay(D.s3, '8 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '6000m row at a consistent pace', { optional: true, targetDistanceMeters: 6000 }),
  ],
];

const TWO_K_CYCLE_2: Concept2Session[][] = [
  [
    twoKDay(D.s1, '6 x 4 minutes with 2 min rest'),
    twoKDay(D.s2, '4 x 6 minutes work with 3 min rest'),
    twoKDay(D.s3, '10 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '8000m row at a consistent pace', { optional: true, targetDistanceMeters: 8000 }),
  ],
  [
    twoKDay(D.s1, '6 x 4 minutes with 2 min rest'),
    twoKDay(D.s2, '4 x 6 minutes work with 3 min rest'),
    twoKDay(D.s3, '10 x 2 minute with 1 min rest'),
    twoKDay(D.s4, '8000m row at a consistent pace', { optional: true, targetDistanceMeters: 8000 }),
  ],
  [
    twoKDay(D.s1, '6 x 3 minutes with 2 min rest'),
    twoKDay(D.s2, '4 x 5 minutes work with 3 min rest'),
    twoKDay(D.s3, '12 x 1 minute with 1 min rest'),
    twoKDay(D.s4, '10000m row at a consistent pace', { optional: true, targetDistanceMeters: 10000 }),
  ],
  [
    twoKDay(D.s1, '6 x 2 minutes with 2 min rest'),
    twoKDay(D.s2, '4 x 4 minutes work with 3 min rest'),
    twoKDay(D.s3, '2000m test', {
      targetDistanceMeters: 2000,
      isPaceCheck: true,
      workoutType: 'benchmark',
    }),
    twoKDay(D.s4, '10000m row at a consistent pace', { optional: true, targetDistanceMeters: 10000 }),
  ],
];

export const CONCEPT2_2K_WEEKS: Concept2Session[][] = [
  ...TWO_K_CYCLE_1,
  ...TWO_K_CYCLE_2,
  ...TWO_K_CYCLE_2,
];

function fiveKDay(
  dayOffset: number,
  text: string,
  opts: Partial<Concept2Session> = {},
): Concept2Session {
  const lower = text.toLowerCase();
  let workoutType: WorkoutClassification = 'AT';
  if (lower.includes('5k continuous') || lower.includes('time trial') || lower.includes('5k test')) {
    workoutType = 'benchmark';
  } else if (lower.includes('steady state') || lower.includes('conversational') || lower.includes('optional')) {
    workoutType = 'UT2';
  } else if (lower.includes('1min') || lower.includes('400') || lower.includes('500')) {
    workoutType = 'TR';
  } else if (lower.includes('continuous')) {
    workoutType = 'UT1';
  }

  return intervalSession(dayOffset, text, workoutType, {
    optional: /optional/i.test(text) || undefined,
    targetDistanceMeters: parseDistanceMeters(text) ?? (/5k continuous/i.test(text) ? 5000 : null),
    targetDurationSeconds: parseDurationSeconds(text),
    isPaceCheck: /time trial|5k test|5k continuous row\. this is your initial/i.test(text),
    ...opts,
  });
}

export const CONCEPT2_5K_SOURCE: Concept2PlanSource = {
  name: 'Concept2 5K Erg Test Plan',
  url: 'https://www.concept2.com/training/plans/5k-erg-test',
  attribution: 'Based on the public Concept2 5K Erg Test plan (Cycle 1 + Cycle 2 = 8 weeks).',
};

const FIVE_K_CYCLE_1: Concept2Session[][] = [
  [
    fiveKDay(D.s1, '5K continuous row. Initial time trial. First 1K easy; increase intensity each 1K. Record your time.', {
      targetDistanceMeters: 5000,
      isPaceCheck: true,
      workoutType: 'benchmark',
    }),
    fiveKDay(D.s2, 'Intervals: 15 times X 1min work with 1 min rest'),
    fiveKDay(D.s3, 'Intervals: 5 times 1000 meters with 2 min rest', { targetDistanceMeters: 5000 }),
    fiveKDay(
      D.s4,
      '30 minute continuous row at moderate conversational intensity with a power 20 every 5 minutes',
      { optional: true, targetDurationSeconds: 1800 },
    ),
  ],
  [
    fiveKDay(D.s1, '6K continuous row (target pace = average pace of your 5K last week)', {
      targetDistanceMeters: 6000,
    }),
    fiveKDay(D.s2, 'Intervals: 8 X 400 meters with 2 minutes rest', { targetDistanceMeters: 3200 }),
    fiveKDay(D.s3, 'Intervals: 2 X 2K meters with 4 minutes rest', { targetDistanceMeters: 4000 }),
    fiveKDay(D.s4, '30 minute continuous row. Steady State.', {
      optional: true,
      targetDurationSeconds: 1800,
    }),
  ],
  [
    fiveKDay(D.s1, '8K continuous row (target pace = average pace of your 6K)', {
      targetDistanceMeters: 8000,
    }),
    fiveKDay(D.s2, 'Intervals: 8 X 500 meters with 2 minutes rest', { targetDistanceMeters: 4000 }),
    fiveKDay(D.s3, 'Intervals: 2 X 3K meters with 4 minutes rest', { targetDistanceMeters: 6000 }),
    fiveKDay(
      D.s4,
      '30 minutes at moderate conversational intensity with a power 10 every 500 meters',
      { optional: true, targetDurationSeconds: 1800 },
    ),
  ],
  [
    fiveKDay(D.s1, '10K continuous row (target pace = average pace of your 8K)', {
      targetDistanceMeters: 10000,
    }),
    fiveKDay(D.s2, 'Intervals: 8 X 500 meters with 1 minute rest', { targetDistanceMeters: 4000 }),
    fiveKDay(D.s3, '5K continuous row (time trial). Record your time. Compare to week 1.', {
      targetDistanceMeters: 5000,
      isPaceCheck: true,
      workoutType: 'benchmark',
    }),
    fiveKDay(D.s4, '30 minute continuous row. Steady State.', {
      optional: true,
      targetDurationSeconds: 1800,
    }),
  ],
];

const FIVE_K_CYCLE_2: Concept2Session[][] = [
  [
    fiveKDay(D.s1, '5K continuous row (target pace = average pace of your fastest 5K)', {
      targetDistanceMeters: 5000,
    }),
    fiveKDay(D.s2, 'Intervals: 15 X 1min work with 1 min rest (faster than prior cycle)'),
    fiveKDay(D.s3, 'Intervals: 5 X 1000 meters with 2 min rest (faster than prior cycle)', {
      targetDistanceMeters: 5000,
    }),
    fiveKDay(
      D.s4,
      '30 minute continuous row. Middle 10 min: alternate 1 min @24 spm / 1 min @30 spm, pace 5–10 sec slower than 5k.',
      { optional: true, targetDurationSeconds: 1800 },
    ),
  ],
  [
    fiveKDay(D.s1, '6K continuous row (faster than prior cycle)', { targetDistanceMeters: 6000 }),
    fiveKDay(D.s2, 'Intervals: 8 X 400 meters with 2 minutes rest (faster than prior cycle)', {
      targetDistanceMeters: 3200,
    }),
    fiveKDay(D.s3, 'Intervals: 2 X 2K meters with 4 minutes rest (faster than prior cycle)', {
      targetDistanceMeters: 4000,
    }),
    fiveKDay(D.s4, '30 minute continuous row. Steady State.', {
      optional: true,
      targetDurationSeconds: 1800,
    }),
  ],
  [
    fiveKDay(D.s1, '8K continuous row (faster than prior cycle)', { targetDistanceMeters: 8000 }),
    fiveKDay(D.s2, 'Intervals: 8 X 500 meters with 2 minutes rest (faster than prior cycle)', {
      targetDistanceMeters: 4000,
    }),
    fiveKDay(D.s3, 'Intervals: 2 X 3K meters with 4 minutes rest (faster than prior cycle)', {
      targetDistanceMeters: 6000,
    }),
    fiveKDay(D.s4, '30 minutes at moderate conversational intensity focusing on technique', {
      optional: true,
      targetDurationSeconds: 1800,
    }),
  ],
  [
    fiveKDay(D.s1, '10K continuous row (faster than prior cycle)', { targetDistanceMeters: 10000 }),
    fiveKDay(D.s2, 'Intervals: 8 X 500 meters with 1 minute rest (faster than prior cycle)', {
      targetDistanceMeters: 4000,
    }),
    fiveKDay(
      D.s3,
      '5K continuous row (5K TEST). Stick to race plan; lift intensity in last 1K if feeling good.',
      {
        targetDistanceMeters: 5000,
        isPaceCheck: true,
        workoutType: 'benchmark',
      },
    ),
    fiveKDay(D.s4, '30 minute continuous row. Steady State.', {
      optional: true,
      targetDurationSeconds: 1800,
    }),
  ],
];

export const CONCEPT2_5K_WEEKS: Concept2Session[][] = [
  ...FIVE_K_CYCLE_1,
  ...FIVE_K_CYCLE_2,
];
