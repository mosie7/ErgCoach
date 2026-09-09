import { prisma } from '@ergcoach/database';
import { generateChatReply } from '@ergcoach/ai-coach';
import { requireAthleteEntitlement } from './entitlements.js';
import {
  assessGoalReadiness,
  getActiveGoal,
  getAthleteProfile,
  getDashboardData,
  getLatestWorkout,
  getProgressTrends,
  getRecentWorkouts,
  getTrainingPlan,
} from './athlete.js';
import { runPostWorkoutAnalysis } from './analysis.js';

/**
 * Tool-routed coach chat — retrieves only relevant slices, never the full DB.
 * Requires Pro entitlement (ai_coach_chat).
 */
export async function coachChat(athleteId: string, question: string) {
  await requireAthleteEntitlement(athleteId, 'ai_coach_chat');

  const q = question.toLowerCase();
  const toolsUsed: string[] = [];
  const evidence: Record<string, unknown> = {};

  if (/profile|who am i|weight|max hr|lthr/.test(q)) {
    toolsUsed.push('get_athlete_profile');
    evidence.athlete = await getAthleteProfile(athleteId);
  }

  if (/goal|marathon|target|2:00|pace realistic|capable/.test(q)) {
    toolsUsed.push('get_active_goal', 'assess_goal_readiness');
    evidence.goal = await getActiveGoal(athleteId);
    evidence.readiness = await assessGoalReadiness(athleteId);
  }

  if (/plan|this week|concentrate|focus/.test(q)) {
    toolsUsed.push('get_training_plan', 'get_dashboard');
    evidence.plan = await getTrainingPlan(athleteId);
    evidence.dashboard = await getDashboardData(athleteId);
  }

  if (/today|latest|was .* (good|ut1|ut2)|session/.test(q)) {
    toolsUsed.push('get_latest_workout');
    evidence.latestWorkout = await getLatestWorkout(athleteId);
  }

  if (/compare|ut2|last three|progress|trend|holding me back|limiter/.test(q)) {
    toolsUsed.push('get_recent_workouts', 'get_progress_trends');
    evidence.recentWorkouts = await getRecentWorkouts(athleteId, 15);
    evidence.trends = await getProgressTrends(athleteId);
  }

  if (toolsUsed.length === 0) {
    toolsUsed.push('get_dashboard');
    evidence.dashboard = await getDashboardData(athleteId);
  }

  const reply = await generateChatReply({ question, toolsUsed, evidence });

  await prisma.chatMessage.createMany({
    data: [
      { athleteId, role: 'user', content: question },
      {
        athleteId,
        role: 'assistant',
        content: reply,
        toolCalls: { toolsUsed },
      },
    ],
  });

  return { reply, toolsUsed, evidenceKeys: Object.keys(evidence) };
}

export async function analyseWorkoutService(workoutId: string) {
  return runPostWorkoutAnalysis(workoutId);
}

export async function getChatHistory(athleteId: string, limit = 40) {
  return prisma.chatMessage.findMany({
    where: { athleteId },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });
}
