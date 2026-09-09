import { describe, expect, it } from 'vitest';
import { calculateWorkoutSimilarity, compareEquivalentSessions } from './compare.js';

describe('block-aware comparable scoring', () => {
  const current = {
    id: 'today',
    workoutType: 'UT2' as const,
    durationSeconds: 3600,
    distanceMeters: 16000,
    averageStrokeRate: 18,
    averageHeartRate: 136,
    averagePaceSeconds500m: 126.4,
    trainingBlockId: 'block-marathon-2026',
    startedAt: new Date('2026-03-01'),
  };

  it('scores same-type current-block sessions highest', () => {
    const blockPeer = calculateWorkoutSimilarity(current, {
      id: 'block-ut2',
      workoutType: 'UT2',
      durationSeconds: 3500,
      distanceMeters: 15500,
      averageStrokeRate: 18,
      averageHeartRate: 137,
      averagePaceSeconds500m: 127.2,
      trainingBlockId: 'block-marathon-2026',
      startedAt: new Date('2026-02-20'),
    });
    const old2k = calculateWorkoutSimilarity(current, {
      id: 'old-2k',
      workoutType: 'benchmark',
      durationSeconds: 420,
      distanceMeters: 2000,
      averageStrokeRate: 32,
      averageHeartRate: 175,
      averagePaceSeconds500m: 105,
      trainingBlockId: 'block-2k-2024',
      startedAt: new Date('2024-06-01'),
    });

    expect(blockPeer).not.toBeNull();
    expect(old2k).not.toBeNull();
    expect(blockPeer!.tier).toBe('current_block');
    expect(blockPeer!.similarityScore).toBeGreaterThan(old2k!.similarityScore);
    expect(blockPeer!.reasons.some((r) => r.includes('same training block'))).toBe(true);
  });

  it('orders current-block peers before lifetime history', () => {
    const results = compareEquivalentSessions(
      current,
      [
        {
          id: 'old-ut2',
          workoutType: 'UT2',
          durationSeconds: 3600,
          distanceMeters: 16000,
          averageStrokeRate: 18,
          averageHeartRate: 136,
          trainingBlockId: null,
          startedAt: new Date('2023-01-01'),
        },
        {
          id: 'block-ut2',
          workoutType: 'UT2',
          durationSeconds: 3400,
          distanceMeters: 15000,
          averageStrokeRate: 18,
          averageHeartRate: 137,
          trainingBlockId: 'block-marathon-2026',
          startedAt: new Date('2026-02-15'),
        },
        {
          id: 'excluded',
          workoutType: 'UT2',
          durationSeconds: 3600,
          distanceMeters: 16000,
          trainingBlockId: 'block-marathon-2026',
          excludeFromAnalysis: true,
        },
      ],
      { currentBlockId: 'block-marathon-2026', limit: 5 },
    );

    expect(results[0]!.workoutId).toBe('block-ut2');
    expect(results[0]!.tier).toBe('current_block');
    expect(results.find((r) => r.workoutId === 'excluded')).toBeUndefined();
  });

  it('boosts prior blocks of the same goal type', () => {
    const prior = calculateWorkoutSimilarity(
      current,
      {
        id: 'prior-marathon-ut2',
        workoutType: 'UT2',
        durationSeconds: 3600,
        distanceMeters: 16000,
        trainingBlockId: 'block-marathon-2025',
        sameGoalType: true,
        startedAt: new Date('2025-03-01'),
      },
      { currentBlockId: 'block-marathon-2026' },
    );
    expect(prior!.tier).toBe('prior_block');
    expect(prior!.reasons.some((r) => r.includes('previous relevant'))).toBe(true);
  });
});
