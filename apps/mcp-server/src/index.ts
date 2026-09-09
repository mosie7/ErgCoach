#!/usr/bin/env node
/**
 * ErgCoach MCP server
 *
 * Exposes athlete/training tools that call the same @ergcoach/services
 * layer used by the web app — no duplicated business logic.
 *
 * Configure in an MCP client:
 * {
 *   "mcpServers": {
 *     "ergcoach": {
 *       "command": "pnpm",
 *       "args": ["--filter", "@ergcoach/mcp-server", "exec", "tsx", "src/index.ts"],
 *       "env": { "DATABASE_URL": "...", "ATHLETE_ID": "..." }
 *     }
 *   }
 * }
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  analyseWorkoutService,
  assessGoalReadiness,
  getActiveGoal,
  getAthleteProfile,
  getComparableWorkouts,
  getDashboardData,
  getLatestWorkout,
  getProgressTrends,
  getRecentWorkouts,
  getTrainingPlan,
  getWorkout,
  recordWorkoutFeedback,
  runPostWorkoutAnalysis,
} from '@ergcoach/services';
import { prisma } from '@ergcoach/database';
import { calculateWeeklyVolume } from '@ergcoach/training-engine';

async function resolveAthleteId(explicit?: string): Promise<string> {
  if (explicit) return explicit;
  if (process.env.ATHLETE_ID) return process.env.ATHLETE_ID;
  const seeded = await prisma.athleteProfile.findFirst({
    where: { isSyntheticSeed: true },
    orderBy: { createdAt: 'asc' },
  });
  if (!seeded) throw new Error('No athlete found. Set ATHLETE_ID or run db:seed.');
  return seeded.id;
}

function json(data: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
  };
}

const tools = [
  {
    name: 'get_athlete_profile',
    description: 'Get athlete physiological profile and HR zones',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_active_goal',
    description: 'Get the athlete’s active training goal',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_training_plan',
    description: 'Get current training plan and planned workouts',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_recent_workouts',
    description: 'List recent workouts with analysis summaries',
    inputSchema: {
      type: 'object',
      properties: {
        athleteId: { type: 'string' },
        limit: { type: 'number' },
      },
    },
  },
  {
    name: 'get_workout',
    description: 'Get a workout with splits, feedback, and analysis',
    inputSchema: {
      type: 'object',
      properties: { workoutId: { type: 'string' } },
      required: ['workoutId'],
    },
  },
  {
    name: 'get_latest_workout',
    description: 'Get the most recent workout',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_workout_splits',
    description: 'Get split rows for a workout',
    inputSchema: {
      type: 'object',
      properties: { workoutId: { type: 'string' } },
      required: ['workoutId'],
    },
  },
  {
    name: 'get_comparable_workouts',
    description: 'Find historically similar workouts with similarity scores',
    inputSchema: {
      type: 'object',
      properties: {
        workoutId: { type: 'string' },
        limit: { type: 'number' },
      },
      required: ['workoutId'],
    },
  },
  {
    name: 'get_training_volume',
    description: 'Get weekly and rolling training volume',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_training_metrics',
    description: 'Get calculated metrics from a workout analysis',
    inputSchema: {
      type: 'object',
      properties: { workoutId: { type: 'string' } },
      required: ['workoutId'],
    },
  },
  {
    name: 'get_progress_trends',
    description: 'Get UT2/UT1/benchmark/long-row progression trends',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'get_goal_progress',
    description: 'Dashboard-style goal progress snapshot',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'assess_goal_readiness',
    description: 'Explainable marathon readiness score with evidence lists',
    inputSchema: {
      type: 'object',
      properties: { athleteId: { type: 'string' } },
    },
  },
  {
    name: 'record_workout_feedback',
    description: 'Record RPE / fatigue / notes for a workout',
    inputSchema: {
      type: 'object',
      properties: {
        workoutId: { type: 'string' },
        rpe: { type: 'number' },
        fatigue: { type: 'number' },
        soreness: { type: 'number' },
        sleepQuality: { type: 'number' },
        notes: { type: 'string' },
      },
      required: ['workoutId'],
    },
  },
  {
    name: 'analyse_workout',
    description: 'Run deterministic metrics + AI interpretation for a workout',
    inputSchema: {
      type: 'object',
      properties: { workoutId: { type: 'string' } },
      required: ['workoutId'],
    },
  },
] as const;

const server = new Server(
  { name: 'ergcoach', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const args = (request.params.arguments ?? {}) as Record<string, unknown>;
  const name = request.params.name;

  try {
    switch (name) {
      case 'get_athlete_profile': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getAthleteProfile(athleteId));
      }
      case 'get_active_goal': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getActiveGoal(athleteId));
      }
      case 'get_training_plan': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getTrainingPlan(athleteId));
      }
      case 'get_recent_workouts': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getRecentWorkouts(athleteId, Number(args.limit ?? 20)));
      }
      case 'get_workout': {
        return json(await getWorkout(String(args.workoutId)));
      }
      case 'get_latest_workout': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getLatestWorkout(athleteId));
      }
      case 'get_workout_splits': {
        const workout = await getWorkout(String(args.workoutId));
        return json(workout?.splits ?? []);
      }
      case 'get_comparable_workouts': {
        return json(
          await getComparableWorkouts(String(args.workoutId), Number(args.limit ?? 5)),
        );
      }
      case 'get_training_volume': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        const workouts = await getRecentWorkouts(athleteId, 100);
        const volume = calculateWeeklyVolume(
          workouts.map((w) => ({
            startedAt: w.startedAt,
            distanceMeters: w.distanceMeters,
            durationSeconds: w.durationSeconds,
            workoutType: w.workoutType,
          })),
        );
        return json(volume);
      }
      case 'get_training_metrics': {
        const workout = await getWorkout(String(args.workoutId));
        return json(workout?.analysis?.calculatedMetrics ?? null);
      }
      case 'get_progress_trends': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getProgressTrends(athleteId));
      }
      case 'get_goal_progress': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await getDashboardData(athleteId));
      }
      case 'assess_goal_readiness': {
        const athleteId = await resolveAthleteId(args.athleteId as string | undefined);
        return json(await assessGoalReadiness(athleteId));
      }
      case 'record_workout_feedback': {
        return json(
          await recordWorkoutFeedback(String(args.workoutId), {
            rpe: args.rpe as number | undefined,
            fatigue: args.fatigue as number | undefined,
            soreness: args.soreness as number | undefined,
            sleepQuality: args.sleepQuality as number | undefined,
            notes: args.notes as string | undefined,
          }),
        );
      }
      case 'analyse_workout': {
        const analysis = await analyseWorkoutService(String(args.workoutId));
        // ensure export exists
        void runPostWorkoutAnalysis;
        return json(analysis);
      }
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (e) {
    return {
      content: [
        {
          type: 'text',
          text: e instanceof Error ? e.message : 'Tool execution failed',
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
