import type { WorkoutClassification } from '@ergcoach/shared';

export interface ComparableSession {
  id: string;
  workoutType: WorkoutClassification;
  durationSeconds: number;
  distanceMeters: number;
  averageStrokeRate?: number | null;
  averageHeartRate?: number | null;
  averagePaceSeconds500m?: number | null;
  intervalStructure?: string | null;
  trainingBlockId?: string | null;
  /** Same goal/event type as current block (e.g. prior marathon build) */
  sameGoalType?: boolean;
  startedAt?: Date | string | null;
  excludeFromAnalysis?: boolean;
}

export interface SimilarityResult {
  workoutId: string;
  similarityScore: number;
  reasons: string[];
  tier: 'current_block' | 'similar_block' | 'prior_block' | 'lifetime';
}

export interface CompareOptions {
  currentBlockId?: string | null;
  limit?: number;
  /** Prefer current-block same-type first (default true) */
  prioritizeCurrentBlock?: boolean;
}

function ratio(a: number, b: number): number {
  return Math.min(a, b) / Math.max(a, b, 1);
}

/**
 * Deterministic comparable-workout scoring.
 * Priority: same type in current block → similar in block → prior relevant blocks → lifetime.
 */
export function calculateWorkoutSimilarity(
  target: ComparableSession,
  candidate: ComparableSession,
  options: CompareOptions = {},
): SimilarityResult | null {
  if (candidate.id === target.id) return null;
  if (candidate.excludeFromAnalysis) return null;

  let score = 0;
  const reasons: string[] = [];
  const currentBlockId = options.currentBlockId ?? target.trainingBlockId ?? null;
  const inCurrentBlock =
    !!currentBlockId && candidate.trainingBlockId != null && candidate.trainingBlockId === currentBlockId;

  let tier: SimilarityResult['tier'] = 'lifetime';

  if (candidate.workoutType === target.workoutType) {
    score += 40;
    reasons.push(`same workout type: ${target.workoutType}`);
  } else if (
    (target.workoutType === 'UT2' && candidate.workoutType === 'recovery') ||
    (target.workoutType === 'recovery' && candidate.workoutType === 'UT2')
  ) {
    score += 10;
    reasons.push('related easy aerobic type');
  } else {
    score -= 20;
  }

  const durRatio = ratio(target.durationSeconds, candidate.durationSeconds);
  score += durRatio * 20;
  if (durRatio >= 0.95) reasons.push('duration within 5%');
  else if (durRatio > 0.85) reasons.push('similar duration');

  const distRatio = ratio(target.distanceMeters, candidate.distanceMeters);
  score += distRatio * 20;
  if (distRatio >= 0.95) reasons.push('distance within 5%');
  else if (distRatio > 0.85) reasons.push('similar distance');

  if (
    target.averageStrokeRate != null &&
    candidate.averageStrokeRate != null &&
    Math.abs(target.averageStrokeRate - candidate.averageStrokeRate) <= 1.5
  ) {
    score += 10;
    reasons.push(
      Math.abs(target.averageStrokeRate - candidate.averageStrokeRate) <= 1
        ? 'stroke rate within 1 spm'
        : 'similar stroke rate',
    );
  }

  if (
    target.averageHeartRate != null &&
    candidate.averageHeartRate != null &&
    Math.abs(target.averageHeartRate - candidate.averageHeartRate) <= 5
  ) {
    score += 10;
    reasons.push('HR intensity similar');
  }

  if (
    target.intervalStructure &&
    candidate.intervalStructure &&
    target.intervalStructure === candidate.intervalStructure
  ) {
    score += 15;
    reasons.push(`same interval structure (${target.intervalStructure})`);
  }

  if (inCurrentBlock) {
    score += 25;
    reasons.push('same training block');
    tier = candidate.workoutType === target.workoutType ? 'current_block' : 'similar_block';
  } else if (candidate.sameGoalType && candidate.trainingBlockId) {
    score += 12;
    reasons.push('previous relevant training block');
    tier = 'prior_block';
  } else if (candidate.trainingBlockId && target.trainingBlockId) {
    // Different block, not marked same goal — mild penalty vs in-block
    score -= 5;
  }

  // Mild recency boost within ~90 days
  if (target.startedAt && candidate.startedAt) {
    const t = new Date(target.startedAt).getTime();
    const c = new Date(candidate.startedAt).getTime();
    const days = Math.abs(t - c) / 86400000;
    if (days <= 28) {
      score += 8;
      reasons.push('recent (within 4 weeks)');
    } else if (days <= 90) {
      score += 4;
    }
  }

  return {
    workoutId: candidate.id,
    similarityScore: Math.max(0, Math.min(100, Math.round(score))),
    reasons,
    tier,
  };
}

/**
 * Find historically similar sessions with training-block priority.
 */
export function compareEquivalentSessions(
  current: ComparableSession,
  history: ComparableSession[],
  limitOrOptions: number | CompareOptions = 5,
): SimilarityResult[] {
  const options: CompareOptions =
    typeof limitOrOptions === 'number' ? { limit: limitOrOptions } : limitOrOptions;
  const limit = options.limit ?? 5;
  const prioritize = options.prioritizeCurrentBlock !== false;

  const results: SimilarityResult[] = [];
  for (const other of history) {
    const scored = calculateWorkoutSimilarity(current, other, options);
    if (scored) results.push(scored);
  }

  results.sort((a, b) => {
    if (prioritize) {
      const tierRank = { current_block: 0, similar_block: 1, prior_block: 2, lifetime: 3 };
      const tr = tierRank[a.tier] - tierRank[b.tier];
      if (tr !== 0) return tr;
    }
    return b.similarityScore - a.similarityScore;
  });

  return results.slice(0, limit);
}
