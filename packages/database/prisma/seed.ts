/**
 * SYNTHETIC SEED DATA
 * All workouts, HR values, and feedback below are synthetic demo data for local development.
 * They do not represent a real athlete's Concept2 Logbook.
 */
import {
  PrismaClient,
  Sport,
  EventType,
  GoalStatus,
  WorkoutSource,
  WorkoutClassification,
  PreferredUnits,
  Sex,
  HrZoneMethod,
  AuthProvider,
} from '@prisma/client';
import { createHash } from 'node:crypto';

const prisma = new PrismaClient();

const DEMO_EMAIL = process.env.DEMO_USER_EMAIL ?? 'athlete@ergcoach.local';
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? 'demo1234';

function hashPassword(password: string): string {
  // Local-dev hash only — replace with bcrypt/argon2 when substituting real auth providers.
  return createHash('sha256').update(`ergcoach:${password}`).digest('hex');
}

function paceFromWatts(watts: number): number {
  // Concept2: pace (s/500m) = (2.8 / watts)^(1/3) * 500
  return Math.pow(2.8 / watts, 1 / 3) * 500;
}

function wattsFromPace(paceSeconds500m: number): number {
  return 2.8 / Math.pow(paceSeconds500m / 500, 3);
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function atTime(date: Date, hours: number, minutes = 0): Date {
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

type SplitSpec = {
  distanceMeters: number;
  durationSeconds: number;
  heartRate?: number;
  strokeRate?: number;
};

function buildSplits(specs: SplitSpec[]) {
  return specs.map((s, index) => {
    const pace = (s.durationSeconds / s.distanceMeters) * 500;
    return {
      index,
      durationSeconds: s.durationSeconds,
      distanceMeters: s.distanceMeters,
      paceSeconds500m: pace,
      watts: wattsFromPace(pace),
      heartRate: s.heartRate ?? null,
      strokeRate: s.strokeRate ?? null,
    };
  });
}

/** Build evenly spaced 500m splits for a steady row with mild HR/pace drift. */
function steadySplits(opts: {
  distanceMeters: number;
  paceSeconds500m: number;
  startHr: number;
  endHr: number;
  spm: number;
  spmJitter?: number;
}): ReturnType<typeof buildSplits> {
  const splitCount = Math.round(opts.distanceMeters / 500);
  const specs: SplitSpec[] = [];
  for (let i = 0; i < splitCount; i++) {
    const t = splitCount === 1 ? 0 : i / (splitCount - 1);
    const driftFactor = 1 + t * 0.012; // slight pace fade
    const pace = opts.paceSeconds500m * driftFactor;
    const hr = opts.startHr + (opts.endHr - opts.startHr) * t;
    const spm =
      opts.spm + (opts.spmJitter ? Math.sin(i / 2) * opts.spmJitter : 0);
    specs.push({
      distanceMeters: 500,
      durationSeconds: pace,
      heartRate: Math.round(hr),
      strokeRate: Math.round(spm * 10) / 10,
    });
  }
  return buildSplits(specs);
}

type SeedWorkout = {
  dayOffset: number;
  hour: number;
  type: WorkoutClassification;
  title: string;
  distanceMeters: number;
  paceSeconds500m: number;
  avgHr: number;
  maxHr: number;
  spm: number;
  startHr: number;
  endHr: number;
  rpe: number;
  notes: string;
  plannedTitle?: string;
};

async function main() {
  console.log('Seeding ErgCoach synthetic demo athlete...');

  await prisma.chatMessage.deleteMany();
  await prisma.webhookEvent.deleteMany();
  await prisma.weeklyReview.deleteMany();
  await prisma.athleteTrend.deleteMany();
  await prisma.workoutAnalysis.deleteMany();
  await prisma.subjectiveFeedback.deleteMany();
  await prisma.workoutStroke.deleteMany();
  await prisma.workoutSplit.deleteMany();
  await prisma.workout.deleteMany();
  await prisma.plannedWorkout.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.heartRateZone.deleteMany();
  await prisma.dataConnection.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.athleteProfile.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      displayName: 'Demo Marathon Rower',
      passwordHash: hashPassword(DEMO_PASSWORD),
      authProvider: AuthProvider.local,
      subscription: {
        create: {
          plan: 'pro',
          status: 'active',
          isComplimentary: true,
          currentPeriodEnd: addDays(new Date(), 365),
        },
      },
    },
  });

  const athlete = await prisma.athleteProfile.create({
    data: {
      userId: user.id,
      age: 40,
      dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
      sex: Sex.male,
      weightKg: 94,
      maxHeartRate: 185,
      restingHeartRate: 52,
      lactateThresholdHeartRate: 163,
      preferredUnits: PreferredUnits.metric,
      hrZoneMethod: HrZoneMethod.lthr,
      notes: 'SYNTHETIC SEED — Concept2 RowErg marathon training demo athlete',
      isSyntheticSeed: true,
    },
  });

  // LTHR-based zones (approximate Karvonen-style bands for demo)
  const zones = [
    { zoneIndex: 1, name: 'Recovery', minBpm: 90, maxBpm: 129 },
    { zoneIndex: 2, name: 'UT2', minBpm: 130, maxBpm: 145 },
    { zoneIndex: 3, name: 'UT1', minBpm: 146, maxBpm: 156 },
    { zoneIndex: 4, name: 'AT', minBpm: 157, maxBpm: 167 },
    { zoneIndex: 5, name: 'TR/AN', minBpm: 168, maxBpm: 185 },
  ];
  for (const z of zones) {
    await prisma.heartRateZone.create({
      data: {
        athleteId: athlete.id,
        ...z,
        method: HrZoneMethod.lthr,
      },
    });
  }

  const goal = await prisma.goal.create({
    data: {
      athleteId: athlete.id,
      sport: Sport.rower,
      eventType: EventType.marathon,
      targetDate: addDays(new Date(), 70),
      targetDistance: 42195,
      targetTimeSeconds: 2 * 3600 + 48 * 60 + 47, // ~2:48:47
      targetPaceSeconds500m: 120, // 2:00 /500m
      status: GoalStatus.active,
      notes: 'Concept2 RowErg Marathon — target 2:00/500m (~2:48:47)',
    },
  });

  // Plan starts ~6 weeks ago, 16-week Concept2-style programme
  const planStart = addDays(new Date(), -42);
  planStart.setUTCHours(0, 0, 0, 0);
  const plan = await prisma.trainingPlan.create({
    data: {
      athleteId: athlete.id,
      goalId: goal.id,
      name: 'Concept2-style 16-week Marathon Programme (synthetic)',
      startDate: planStart,
      endDate: addDays(planStart, 16 * 7 - 1),
      notes: 'Synthetic training plan for demo purposes',
    },
  });

  const seedWorkouts: SeedWorkout[] = [
    // Week -6
    {
      dayOffset: 0,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 10k steady',
      distanceMeters: 10000,
      paceSeconds500m: 129,
      avgHr: 138,
      maxHr: 146,
      spm: 18,
      startHr: 132,
      endHr: 144,
      rpe: 4,
      notes: 'Felt easy, controlled. Settling into volume.',
    },
    {
      dayOffset: 2,
      hour: 7,
      type: WorkoutClassification.UT1,
      title: 'UT1 2x20 min',
      distanceMeters: 9600,
      paceSeconds500m: 125,
      avgHr: 152,
      maxHr: 158,
      spm: 20,
      startHr: 148,
      endHr: 155,
      rpe: 6,
      notes: 'Controlled/good. HR settled in second piece.',
    },
    {
      dayOffset: 4,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 14k steady',
      distanceMeters: 14000,
      paceSeconds500m: 128.5,
      avgHr: 140,
      maxHr: 148,
      spm: 18,
      startHr: 134,
      endHr: 146,
      rpe: 5,
      notes: 'Comfortable longish UT2.',
    },
    // Week -5
    {
      dayOffset: 7,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 16k steady',
      distanceMeters: 16000,
      paceSeconds500m: 128,
      avgHr: 139,
      maxHr: 147,
      spm: 18,
      startHr: 133,
      endHr: 145,
      rpe: 5,
      notes: 'Good rhythm at 18 spm.',
    },
    {
      dayOffset: 9,
      hour: 7,
      type: WorkoutClassification.AT,
      title: 'AT 5x8 min',
      distanceMeters: 8200,
      paceSeconds500m: 118,
      avgHr: 162,
      maxHr: 171,
      spm: 24,
      startHr: 158,
      endHr: 170,
      rpe: 7,
      notes: 'Hard but sustainable. Last piece HR climbed.',
    },
    {
      dayOffset: 11,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 18k steady',
      distanceMeters: 18000,
      paceSeconds500m: 127.5,
      avgHr: 141,
      maxHr: 149,
      spm: 18,
      startHr: 135,
      endHr: 147,
      rpe: 5,
      notes: 'Long row felt durable.',
    },
    // Week -4
    {
      dayOffset: 14,
      hour: 7,
      type: WorkoutClassification.benchmark,
      title: '5k benchmark',
      distanceMeters: 5000,
      paceSeconds500m: 112,
      avgHr: 172,
      maxHr: 181,
      spm: 28,
      startHr: 160,
      endHr: 180,
      rpe: 9,
      notes: 'All-out 5k. Synthetic benchmark.',
    },
    {
      dayOffset: 16,
      hour: 7,
      type: WorkoutClassification.UT1,
      title: 'UT1 2x20 min',
      distanceMeters: 9700,
      paceSeconds500m: 124.5,
      avgHr: 153,
      maxHr: 158,
      spm: 20,
      startHr: 149,
      endHr: 155,
      rpe: 6,
      notes: 'Felt controlled/good. Similar to previous UT1.',
    },
    {
      dayOffset: 18,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 14k steady',
      distanceMeters: 14000,
      paceSeconds500m: 127,
      avgHr: 138,
      maxHr: 145,
      spm: 18,
      startHr: 132,
      endHr: 143,
      rpe: 4,
      notes: 'Slightly faster UT2 at similar HR — efficiency signal.',
    },
    // Week -3
    {
      dayOffset: 21,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 22k long steady',
      distanceMeters: 22000,
      paceSeconds500m: 128,
      avgHr: 142,
      maxHr: 151,
      spm: 18,
      startHr: 134,
      endHr: 150,
      rpe: 6,
      notes: 'Longest row so far. Mild late drift.',
    },
    {
      dayOffset: 23,
      hour: 7,
      type: WorkoutClassification.UT1,
      title: 'UT1 2x30 min',
      distanceMeters: 14500,
      paceSeconds500m: 124,
      avgHr: 153,
      maxHr: 159,
      spm: 20,
      startHr: 149,
      endHr: 156,
      rpe: 7,
      notes: 'Extended UT1. Second piece held well.',
    },
    {
      dayOffset: 25,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 16k steady',
      distanceMeters: 16000,
      paceSeconds500m: 126.5,
      avgHr: 137,
      maxHr: 144,
      spm: 18,
      startHr: 131,
      endHr: 142,
      rpe: 4,
      notes: 'Easy and efficient.',
    },
    // Week -2
    {
      dayOffset: 28,
      hour: 7,
      type: WorkoutClassification.AT,
      title: 'AT 5x8 min',
      distanceMeters: 8400,
      paceSeconds500m: 117,
      avgHr: 161,
      maxHr: 169,
      spm: 24,
      startHr: 157,
      endHr: 168,
      rpe: 7,
      notes: 'Slightly stronger than previous AT set.',
    },
    {
      dayOffset: 30,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 18k steady',
      distanceMeters: 18000,
      paceSeconds500m: 126,
      avgHr: 139,
      maxHr: 146,
      spm: 18,
      startHr: 133,
      endHr: 144,
      rpe: 5,
      notes: 'Pace improved vs earlier 18k at similar HR.',
    },
    {
      dayOffset: 32,
      hour: 7,
      type: WorkoutClassification.UT1,
      title: 'UT1 2x20 min',
      distanceMeters: 9800,
      paceSeconds500m: 123.5,
      avgHr: 152,
      maxHr: 157,
      spm: 20,
      startHr: 148,
      endHr: 154,
      rpe: 6,
      notes: 'HR stabilised 152–153 in second interval. Controlled/good.',
    },
    // Week -1 (current)
    {
      dayOffset: 35,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 10k recovery-ish',
      distanceMeters: 10000,
      paceSeconds500m: 130,
      avgHr: 134,
      maxHr: 140,
      spm: 18,
      startHr: 128,
      endHr: 138,
      rpe: 3,
      notes: 'Deliberately easy.',
    },
    {
      dayOffset: 37,
      hour: 7,
      type: WorkoutClassification.UT2,
      title: 'UT2 22k long steady',
      distanceMeters: 22000,
      paceSeconds500m: 126.5,
      avgHr: 140,
      maxHr: 148,
      spm: 18,
      startHr: 133,
      endHr: 147,
      rpe: 6,
      notes: 'Better durability than previous 22k — lower late HR drift.',
    },
    {
      dayOffset: 39,
      hour: 7,
      type: WorkoutClassification.UT1,
      title: 'UT1 2x30 min',
      distanceMeters: 14800,
      paceSeconds500m: 123,
      avgHr: 152,
      maxHr: 157,
      spm: 20,
      startHr: 148,
      endHr: 154,
      rpe: 6,
      notes: 'Strong aerobic control across both pieces.',
    },
    {
      dayOffset: 41,
      hour: 7,
      type: WorkoutClassification.strength,
      title: 'Strength — posterior chain',
      distanceMeters: 0,
      paceSeconds500m: 0,
      avgHr: 110,
      maxHr: 130,
      spm: 0,
      startHr: 100,
      endHr: 120,
      rpe: 5,
      notes: 'Gym session — not an erg piece.',
    },
  ];

  for (const w of seedWorkouts) {
    const startedAt = atTime(addDays(planStart, w.dayOffset), w.hour);
    const isStrength = w.type === WorkoutClassification.strength;
    const durationSeconds = isStrength
      ? 2700
      : Math.round((w.distanceMeters / 500) * w.paceSeconds500m);

    const planned = await prisma.plannedWorkout.create({
      data: {
        trainingPlanId: plan.id,
        scheduledDate: atTime(addDays(planStart, w.dayOffset), 0),
        workoutType: w.type,
        title: w.plannedTitle ?? w.title,
        targetDistanceMeters: isStrength ? null : w.distanceMeters,
        targetDurationSeconds: durationSeconds,
        targetPaceMinSeconds500m: isStrength ? null : w.paceSeconds500m - 2,
        targetPaceMaxSeconds500m: isStrength ? null : w.paceSeconds500m + 3,
        targetHrMin: w.type === WorkoutClassification.UT2 ? 130 : w.type === WorkoutClassification.UT1 ? 146 : null,
        targetHrMax: w.type === WorkoutClassification.UT2 ? 145 : w.type === WorkoutClassification.UT1 ? 156 : null,
        targetSpmMin: isStrength ? null : w.spm - 1,
        targetSpmMax: isStrength ? null : w.spm + 1,
        instructions: `Synthetic planned session: ${w.title}`,
      },
    });

    const splits =
      isStrength || w.distanceMeters === 0
        ? []
        : w.type === WorkoutClassification.UT1
          ? buildUt1Splits(w)
          : w.type === WorkoutClassification.AT
            ? buildAtSplits(w)
            : steadySplits({
                distanceMeters: w.distanceMeters,
                paceSeconds500m: w.paceSeconds500m,
                startHr: w.startHr,
                endHr: w.endHr,
                spm: w.spm,
                spmJitter: 0.3,
              });

    const workout = await prisma.workout.create({
      data: {
        athleteId: athlete.id,
        source: WorkoutSource.manual,
        externalId: `synthetic-${w.dayOffset}-${w.type}`,
        plannedWorkoutId: planned.id,
        startedAt,
        sport: isStrength ? Sport.strength : Sport.rower,
        workoutType: w.type,
        detectedClassification: w.type,
        title: w.title,
        durationSeconds,
        distanceMeters: w.distanceMeters,
        averagePaceSeconds500m: isStrength ? null : w.paceSeconds500m,
        averageWatts: isStrength ? null : wattsFromPace(w.paceSeconds500m),
        averageHeartRate: w.avgHr,
        maxHeartRate: w.maxHr,
        averageStrokeRate: isStrength ? null : w.spm,
        rawData: {
          synthetic: true,
          note: 'SYNTHETIC SEED DATA — not from Concept2 API',
        },
        isSyntheticSeed: true,
        splits: splits.length
          ? {
              create: splits.map((s) => ({
                index: s.index,
                durationSeconds: s.durationSeconds,
                distanceMeters: s.distanceMeters,
                paceSeconds500m: s.paceSeconds500m,
                watts: s.watts,
                heartRate: s.heartRate,
                strokeRate: s.strokeRate,
              })),
            }
          : undefined,
        subjectiveFeedback: {
          create: {
            rpe: w.rpe,
            fatigue: Math.min(10, w.rpe + 1),
            soreness: Math.max(1, w.rpe - 2),
            sleepQuality: 7,
            notes: w.notes,
          },
        },
      },
    });

    void workout;
  }

  console.log(`Seeded user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Athlete profile: ${athlete.id}`);
  console.log(`Goal: Concept2 Marathon @ 2:00/500m`);
  console.log(`Workouts: ${seedWorkouts.length} synthetic sessions over ~6 weeks`);
}

function buildUt1Splits(w: SeedWorkout) {
  // Approximate 2 intervals with rest gap represented as separate pieces only
  const pieceDistance = w.distanceMeters / 2;
  const pieceDuration = (pieceDistance / 500) * w.paceSeconds500m;
  const mid = Math.round(pieceDistance / 500);
  const specs: SplitSpec[] = [];
  for (let i = 0; i < mid * 2; i++) {
    const inSecond = i >= mid;
    const t = mid === 1 ? 0 : (i % mid) / (mid - 1);
    const hrBase = inSecond ? w.startHr + 2 : w.startHr;
    const hrEnd = inSecond ? w.endHr : w.startHr + (w.endHr - w.startHr) * 0.7;
    specs.push({
      distanceMeters: 500,
      durationSeconds: w.paceSeconds500m * (1 + t * 0.008),
      heartRate: Math.round(hrBase + (hrEnd - hrBase) * t),
      strokeRate: w.spm,
    });
  }
  return buildSplits(specs);
}

function buildAtSplits(w: SeedWorkout) {
  const pieces = 5;
  const pieceDistance = w.distanceMeters / pieces;
  const specs: SplitSpec[] = [];
  for (let p = 0; p < pieces; p++) {
    const splitsInPiece = Math.max(1, Math.round(pieceDistance / 500));
    for (let i = 0; i < splitsInPiece; i++) {
      const t = p / (pieces - 1);
      specs.push({
        distanceMeters: 500,
        durationSeconds: w.paceSeconds500m * (1 + t * 0.01),
        heartRate: Math.round(w.startHr + (w.endHr - w.startHr) * t),
        strokeRate: w.spm,
      });
    }
  }
  return buildSplits(specs);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
