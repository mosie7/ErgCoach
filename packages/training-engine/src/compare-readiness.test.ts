import { describe, expect, it } from 'vitest';
import { compareEquivalentSessions } from './compare.js';
import { estimateMarathonReadiness } from './readiness.js';
import { calculateSessionCompliance } from './compliance.js';
import { detectProgressionTrend } from './progression.js';

describe('compareEquivalentSessions', () => {
  it('prefers same-type similar duration sessions', () => {
    const current = {
      id: 'today',
      workoutType: 'UT1' as const,
      durationSeconds: 2400,
      distanceMeters: 9700,
      averageStrokeRate: 20,
      averageHeartRate: 152,
      intervalStructure: '2x20',
    };
    const history = [
      {
        id: 'ut1-prev',
        workoutType: 'UT1' as const,
        durationSeconds: 2400,
        distanceMeters: 9600,
        averageStrokeRate: 20,
        averageHeartRate: 153,
        intervalStructure: '2x20',
      },
      {
        id: '5k',
        workoutType: 'benchmark' as const,
        durationSeconds: 1120,
        distanceMeters: 5000,
        averageStrokeRate: 28,
        averageHeartRate: 172,
      },
    ];
    const results = compareEquivalentSessions(current, history);
    expect(results[0]!.workoutId).toBe('ut1-prev');
    expect(results[0]!.similarityScore).toBeGreaterThan(results[1]!.similarityScore);
  });
});

describe('estimateMarathonReadiness', () => {
  it('returns explainable evidence without fake certainty', () => {
    const result = estimateMarathonReadiness({
      targetPaceSeconds500m: 120,
      longRowPaces: [128, 126.5],
      longRowHrDrifts: [7.5, 5.2],
      ut1Paces: [125, 124.5, 123.5],
      ut1AvgHrs: [153, 153, 152],
      ut2Paces: [129, 127, 126],
      ut2AvgHrs: [140, 139, 138],
      benchmark5kPace: 112,
      weeksWithConsistentVolume: 5,
      plannedSessionsLast14Days: 6,
      completedSessionsLast14Days: 6,
      recentLongRowDistanceMax: 22000,
    });

    expect(result.score).toBeGreaterThan(55);
    expect(result.confidence).toBe('moderate');
    expect(result.positiveEvidence.length).toBeGreaterThan(0);
    expect(result.estimatedPaceRangeSeconds500m).toBeDefined();
    expect(result.estimatedPaceRangeSeconds500m!.low).toBeLessThan(
      result.estimatedPaceRangeSeconds500m!.high,
    );
  });

  it('flags missing evidence when data is sparse', () => {
    const result = estimateMarathonReadiness({
      targetPaceSeconds500m: 120,
      longRowPaces: [],
      longRowHrDrifts: [],
      ut1Paces: [],
      ut1AvgHrs: [],
      ut2Paces: [],
      ut2AvgHrs: [],
      weeksWithConsistentVolume: 1,
      plannedSessionsLast14Days: 4,
      completedSessionsLast14Days: 1,
      recentLongRowDistanceMax: 10000,
    });
    expect(result.missingEvidence.length).toBeGreaterThan(0);
    expect(result.confidence).toBe('low');
    expect(result.score).toBeLessThan(55);
  });
});

describe('session compliance', () => {
  it('scores high when actual matches planned UT1 targets', () => {
    const result = calculateSessionCompliance(
      {
        workoutType: 'UT1',
        targetDistanceMeters: 9700,
        targetDurationSeconds: 2400,
        targetPaceMinSeconds500m: 122,
        targetPaceMaxSeconds500m: 128,
        targetHrMin: 146,
        targetHrMax: 156,
        targetSpmMin: 19,
        targetSpmMax: 21,
      },
      {
        workoutType: 'UT1',
        durationSeconds: 2410,
        distanceMeters: 9750,
        averagePaceSeconds500m: 124,
        averageHeartRate: 152,
        averageStrokeRate: 20,
      },
    );
    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });
});

describe('progression trend', () => {
  it('detects improving pace when lower is better', () => {
    const trend = detectProgressionTrend(
      [
        { date: new Date('2026-01-01'), value: 129 },
        { date: new Date('2026-01-08'), value: 127.5 },
        { date: new Date('2026-01-15'), value: 126 },
        { date: new Date('2026-01-22'), value: 125 },
      ],
      { lowerIsBetter: true, label: 'UT2 pace' },
    );
    expect(trend.direction).toBe('improving');
  });
});
