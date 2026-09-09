import { prisma } from '@ergcoach/database';
import { generateChatReply } from '@ergcoach/ai-coach';
import { requireAthleteEntitlement } from './entitlements.js';
import { buildCoachChatContext } from './ai-context.js';
import { runPostWorkoutAnalysis } from './analysis.js';

/**
 * Tool-routed coach chat — uses training-block context engine.
 * Requires Pro entitlement (ai_coach_chat).
 */
export async function coachChat(athleteId: string, question: string) {
  await requireAthleteEntitlement(athleteId, 'ai_coach_chat');

  const { toolsUsed, evidence } = await buildCoachChatContext(athleteId, question);
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
