import type { AiWorkoutAnalysis } from '@ergcoach/shared';
import OpenAI from 'openai';
import {
  aiWorkoutAnalysisSchema,
  COACH_SYSTEM_PROMPT,
  weeklyReviewNarrativeSchema,
  type WeeklyReviewNarrative,
} from './schemas.js';

export interface CoachEvidencePayload {
  athlete: Record<string, unknown>;
  goal: Record<string, unknown> | null;
  plannedWorkout: Record<string, unknown> | null;
  workout: Record<string, unknown>;
  calculatedMetrics: Record<string, unknown>;
  comparableWorkouts: Record<string, unknown>[];
  recentContext: Record<string, unknown>;
  subjectiveFeedback: Record<string, unknown> | null;
}

export interface ChatContextPayload {
  question: string;
  toolsUsed: string[];
  evidence: Record<string, unknown>;
}

function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

function heuristicWorkoutAnalysis(evidence: CoachEvidencePayload): AiWorkoutAnalysis {
  const metrics = evidence.calculatedMetrics as {
    heartRateDriftPercent?: number | null;
    detectedClassification?: string;
    complianceScore?: number | null;
    averageHeartRate?: number | null;
  };
  const feedback = evidence.subjectiveFeedback as { notes?: string | null; rpe?: number | null } | null;
  const classification = metrics.detectedClassification ?? 'unknown';
  const drift = metrics.heartRateDriftPercent;
  const compliance = metrics.complianceScore;

  const positiveSignals: string[] = [];
  const concerns: string[] = [];
  const evidenceLines: string[] = [];

  if (compliance != null && compliance >= 80) {
    positiveSignals.push(`Session matched planned targets (compliance ${compliance}%).`);
  } else if (compliance != null && compliance < 60) {
    concerns.push(`Execution drifted from the planned targets (compliance ${compliance}%).`);
  }

  if (drift != null && drift <= 5 && (classification === 'UT2' || classification === 'UT1')) {
    positiveSignals.push(
      `Heart-rate drift was ${drift.toFixed(1)}% — controlled for an aerobic ${classification} session.`,
    );
  } else if (drift != null && drift > 8) {
    concerns.push(
      `Heart-rate drift of ${drift.toFixed(1)}% is elevated; durability may still be limiting for longer efforts.`,
    );
  }

  if (feedback?.notes) {
    evidenceLines.push(`Athlete notes: ${feedback.notes}`);
  }

  const missing: string[] = [];
  if (metrics.averageHeartRate == null) missing.push('No heart-rate data for this session.');
  if (!evidence.comparableWorkouts.length) missing.push('No closely comparable prior sessions found.');

  return {
    summary:
      `Deterministic analysis of this ${classification} session (AI API not configured — heuristic interpretation). ` +
      (positiveSignals[0] ?? 'Review calculated metrics and training context for coaching decisions.'),
    sessionVerdict:
      compliance != null && compliance >= 80
        ? 'successful'
        : compliance != null && compliance < 50
          ? 'partial'
          : 'unknown',
    whatWasAchieved: [
      `Completed ${classification} session as recorded.`,
      ...(positiveSignals.slice(0, 2)),
    ],
    executionAnalysis: [
      compliance != null
        ? `Planned-vs-actual compliance score: ${compliance}%.`
        : 'No planned workout linked.',
      drift != null ? `Measured HR drift: ${drift.toFixed(1)}%.` : 'HR drift not measurable from splits.',
    ],
    positiveSignals,
    concerns: [...concerns, ...missing.map((m) => `Missing data: ${m}`)],
    goalImpact:
      'Single-session impact is limited; interpret alongside multi-week volume, UT1/UT2 efficiency, and long-row durability.',
    progressAssessment:
      evidence.comparableWorkouts.length > 0
        ? 'Comparable historical sessions are available — compare pace at similar HR before concluding fitness change.'
        : 'Insufficient comparable history for a strong progress call on this session alone.',
    nextFocus: [
      classification === 'UT2' || classification === 'UT1'
        ? 'Keep aerobic sessions controlled; chase efficiency (pace at same HR), not random intensity.'
        : 'Return to the planned intensity purpose of the next session.',
      'Protect sleep and recovery markers before stacking hard work.',
    ],
    confidence: 'low',
    evidence: [
      ...evidenceLines,
      'OPENAI_API_KEY not set — returned heuristic coach interpretation over pre-calculated metrics.',
      ...missing,
    ],
  };
}

export async function generateWorkoutAnalysis(
  evidence: CoachEvidencePayload,
): Promise<{ analysis: AiWorkoutAnalysis; modelVersion: string }> {
  const client = getClient();
  if (!client) {
    return { analysis: heuristicWorkoutAnalysis(evidence), modelVersion: 'heuristic-v1' };
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-5';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: COACH_SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'Interpret this post-workout evidence package. Return JSON matching the required schema.\n\n' +
          JSON.stringify(evidence, null, 2),
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? '{}';
  const parsed = aiWorkoutAnalysisSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    return {
      analysis: {
        ...heuristicWorkoutAnalysis(evidence),
        summary: 'AI returned an unexpected schema; showing fallback interpretation.',
        confidence: 'low',
        evidence: [`Schema validation failed: ${parsed.error.message}`],
      },
      modelVersion: `${model}-fallback`,
    };
  }
  return { analysis: parsed.data, modelVersion: model };
}

export async function generateChatReply(payload: ChatContextPayload): Promise<string> {
  const client = getClient();
  if (!client) {
    return (
      'AI chat requires OPENAI_API_KEY. Based on retrieved evidence only: ' +
      JSON.stringify(summarizeEvidence(payload.evidence))
    );
  }
  const model = process.env.OPENAI_MODEL ?? 'gpt-5';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.4,
    messages: [
      { role: 'system', content: COACH_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Athlete question: ${payload.question}\n\nTools used: ${payload.toolsUsed.join(', ')}\n\nEvidence JSON:\n${JSON.stringify(payload.evidence, null, 2)}\n\nAnswer specifically using this evidence. Acknowledge gaps.`,
      },
    ],
  });
  return response.choices[0]?.message?.content ?? 'No response generated.';
}

export async function generateWeeklyNarrative(
  summary: Record<string, unknown>,
): Promise<{ narrative: WeeklyReviewNarrative; modelVersion: string }> {
  const client = getClient();
  const fallback: WeeklyReviewNarrative = {
    narrative:
      'Weekly review generated from deterministic totals (AI API not configured). Review volume, intensity mix, and adherence before changing targets.',
    strongestWorkout: String(summary['strongestWorkout'] ?? 'n/a'),
    biggestPositiveSignal: String(summary['biggestPositiveSignal'] ?? 'See volume and drift metrics'),
    potentialConcern: String(summary['potentialConcern'] ?? 'Check missing sessions and elevated drift'),
    recommendedEmphasis: (summary['recommendedEmphasis'] as string[]) ?? [
      'Maintain aerobic volume quality',
      'Protect one quality UT1 or long row',
    ],
    confidence: 'low',
  };

  if (!client) {
    return { narrative: fallback, modelVersion: 'heuristic-v1' };
  }

  const model = process.env.OPENAI_MODEL ?? 'gpt-5';
  const response = await client.chat.completions.create({
    model,
    temperature: 0.3,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: COACH_SYSTEM_PROMPT },
      {
        role: 'user',
        content:
          'Write a weekly athlete review narrative from this deterministic summary. Return JSON schema fields narrative, strongestWorkout, biggestPositiveSignal, potentialConcern, recommendedEmphasis, confidence.\n\n' +
          JSON.stringify(summary),
      },
    ],
  });
  const content = response.choices[0]?.message?.content ?? '{}';
  const parsed = weeklyReviewNarrativeSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    return { narrative: fallback, modelVersion: `${model}-fallback` };
  }
  return { narrative: parsed.data, modelVersion: model };
}

function summarizeEvidence(evidence: Record<string, unknown>): Record<string, unknown> {
  return {
    keys: Object.keys(evidence),
    goal: evidence['goal'] ?? null,
    readiness: evidence['readiness'] ?? null,
  };
}
