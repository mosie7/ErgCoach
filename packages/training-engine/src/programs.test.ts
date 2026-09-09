import { describe, expect, it } from 'vitest';
import { EVENT_DISTANCE_METERS } from '@ergcoach/shared';
import { generateProgramPlan, TRAINING_PROGRAMS } from './programs.js';

describe('training programs', () => {
  it('lists all six race distances', () => {
    expect(TRAINING_PROGRAMS.map((p) => p.eventType)).toEqual([
      'two_k',
      'five_k',
      'ten_k',
      'half_marathon',
      'marathon',
      'hundred_k',
    ]);
  });

  it('generates a dated marathon plan with progressive long rows', () => {
    const plan = generateProgramPlan({
      eventType: 'marathon',
      startDate: new Date('2026-03-02T00:00:00Z'),
      targetPaceSeconds500m: 120,
      weeks: 4,
    });

    expect(plan.name).toContain('Marathon');
    expect(plan.sessions.length).toBe(4 * 5);
    expect(plan.startDate.toISOString().startsWith('2026-03-02')).toBe(true);

    const longRows = plan.sessions.filter((s) => s.title.includes('Long row'));
    expect(longRows).toHaveLength(4);
    const distances = longRows.map((s) => s.targetDistanceMeters ?? 0);
    expect(distances[0]).toBeLessThan(distances[distances.length - 1]!);
    expect(distances[distances.length - 1]!).toBeLessThanOrEqual(EVENT_DISTANCE_METERS.marathon);

    const paced = plan.sessions.find((s) => s.targetPaceMinSeconds500m != null);
    expect(paced?.targetPaceMinSeconds500m).toBeGreaterThan(100);
  });

  it('generates a 100k plan with ultra long sessions', () => {
    const plan = generateProgramPlan({ eventType: 'hundred_k', weeks: 2 });
    expect(plan.sessions.length).toBe(2 * 5);
    const ultra = plan.sessions.find((s) => s.title.includes('Ultra long'));
    expect(ultra?.targetDistanceMeters).toBeGreaterThan(10_000);
  });
});
