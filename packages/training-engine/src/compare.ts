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
}

export interface SimilarityResult {
  workoutId: string;
  similarityScore: number;
  reasons: string[];
}

/**
 * Find historically similar sessions. Prefers same type and similar duration/distance/structure.
 */
export function compareEquivalentSessions(
  current: ComparableSession,
  history: ComparableSession[],
  limit = 5,
): SimilarityResult[] {
  const results: SimilarityResult[] = [];

  for (const other of history) {
    if (other.id === current.id) continue;
    let score = 0;
    const reasons: string[] = [];

    if (other.workoutType === current.workoutType) {
      score += 40;
      reasons.push(`Same type (${current.workoutType})`);
    } else if (
      (current.workoutType === 'UT2' && other.workoutType === 'recovery') ||
      (current.workoutType === 'recovery' && other.workoutType === 'UT2')
    ) {
      score += 10;
      reasons.push('Related easy aerobic type');
    } else {
      score -= 20;
    }

    const durRatio =
      Math.min(current.durationSeconds, other.durationSeconds) /
      Math.max(current.durationSeconds, other.durationSeconds, 1);
    score += durRatio * 20;
    if (durRatio > 0.85) reasons.push('Similar duration');

    const distRatio =
      Math.min(current.distanceMeters, other.distanceMeters) /
      Math.max(current.distanceMeters, other.distanceMeters, 1);
    score += distRatio * 20;
    if (distRatio > 0.85) reasons.push('Similar distance');

    if (
      current.averageStrokeRate != null &&
      other.averageStrokeRate != null &&
      Math.abs(current.averageStrokeRate - other.averageStrokeRate) <= 1.5
    ) {
      score += 10;
      reasons.push('Similar stroke rate');
    }

    if (
      current.averageHeartRate != null &&
      other.averageHeartRate != null &&
      Math.abs(current.averageHeartRate - other.averageHeartRate) <= 5
    ) {
      score += 10;
      reasons.push('Similar average HR');
    }

    if (
      current.intervalStructure &&
      other.intervalStructure &&
      current.intervalStructure === other.intervalStructure
    ) {
      score += 15;
      reasons.push(`Same interval structure (${current.intervalStructure})`);
    }

    results.push({
      workoutId: other.id,
      similarityScore: Math.max(0, Math.min(100, score)),
      reasons,
    });
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore).slice(0, limit);
}
