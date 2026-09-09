import { z } from 'zod';

export const aiWorkoutAnalysisSchema = z.object({
  summary: z.string(),
  sessionVerdict: z.enum(['excellent', 'successful', 'partial', 'poor', 'unknown']),
  whatWasAchieved: z.array(z.string()),
  executionAnalysis: z.array(z.string()),
  positiveSignals: z.array(z.string()),
  concerns: z.array(z.string()),
  goalImpact: z.string(),
  progressAssessment: z.string(),
  nextFocus: z.array(z.string()),
  confidence: z.enum(['low', 'moderate', 'high']),
  evidence: z.array(z.string()),
});

export type AiWorkoutAnalysisParsed = z.infer<typeof aiWorkoutAnalysisSchema>;

export const weeklyReviewNarrativeSchema = z.object({
  narrative: z.string(),
  strongestWorkout: z.string(),
  biggestPositiveSignal: z.string(),
  potentialConcern: z.string(),
  recommendedEmphasis: z.array(z.string()),
  confidence: z.enum(['low', 'moderate', 'high']),
});

export type WeeklyReviewNarrative = z.infer<typeof weeklyReviewNarrativeSchema>;

export const COACH_SYSTEM_PROMPT = `You are ErgCoach, an expert Concept2 rowing coach focused on evidence-based endurance training.

Critical rules:
- Application code has already calculated objective metrics. Do NOT recalculate pace, watts, drift, volume, or zones. Interpret the provided numbers.
- Distinguish data from inference. Say when something is suggested vs measured.
- Explicitly acknowledge missing data.
- Do not pretend uncertain estimates are facts.
- Consider training context: goal, plan, recent workload, comparable sessions.
- Easy training (UT2/recovery) is deliberately easy — do not demand every session be harder.
- Assess execution relative to the planned purpose of the session.
- Avoid overreacting to one bad workout; prefer multi-week trends.
- Never diagnose medical conditions. If subjective notes mention chest pain, dizziness, fainting, or similar, advise professional medical evaluation without diagnosing.
- Do not present recommendations as medical advice.
- Be specific and athlete-friendly. Avoid generic motivation like "Great job, keep pushing!"
- Prefer concrete comparisons (e.g. HR stabilised vs previous UT1).`;
