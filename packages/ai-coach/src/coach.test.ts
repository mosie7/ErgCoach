import { describe, expect, it } from 'vitest';
import { aiWorkoutAnalysisSchema } from './schemas.js';
import { generateWorkoutAnalysis } from './coach.js';

describe('aiWorkoutAnalysisSchema', () => {
  it('accepts a valid analysis object', () => {
    const parsed = aiWorkoutAnalysisSchema.parse({
      summary: 'Solid UT1',
      sessionVerdict: 'successful',
      whatWasAchieved: ['Held target HR'],
      executionAnalysis: ['Matched plan'],
      positiveSignals: ['Stable second interval HR'],
      concerns: [],
      goalImpact: 'Supports marathon aerobic base',
      progressAssessment: 'In line with recent UT1s',
      nextFocus: ['Keep UT2 easy'],
      confidence: 'moderate',
      evidence: ['Avg HR 152'],
    });
    expect(parsed.sessionVerdict).toBe('successful');
  });
});

describe('generateWorkoutAnalysis', () => {
  it('returns heuristic analysis when no API key is set', async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const { analysis, modelVersion } = await generateWorkoutAnalysis({
      athlete: { age: 40 },
      goal: { eventType: 'marathon', targetPaceSeconds500m: 120 },
      plannedWorkout: { workoutType: 'UT1' },
      workout: { title: 'UT1 2x20', distanceMeters: 9700 },
      calculatedMetrics: {
        detectedClassification: 'UT1',
        heartRateDriftPercent: 3.2,
        complianceScore: 90,
        averageHeartRate: 152,
      },
      comparableWorkouts: [],
      recentContext: { sessionsLast7Days: 3 },
      subjectiveFeedback: { notes: 'Felt controlled/good', rpe: 6 },
    });
    expect(modelVersion).toBe('heuristic-v1');
    expect(analysis.confidence).toBe('low');
    expect(analysis.summary.length).toBeGreaterThan(10);
    if (prev) process.env.OPENAI_API_KEY = prev;
  });
});
