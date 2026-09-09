import { describe, expect, it } from 'vitest';
import { EVENT_DISTANCE_METERS } from '@ergcoach/shared';
import { CONCEPT2_MARATHON_WEEKS } from './concept2-plans.js';
import { generateProgramPlan, TRAINING_PROGRAMS } from './programs.js';

describe('Concept2 training programs', () => {
  it('lists six distances with real Concept2 coverage for 2k/5k/half/marathon', () => {
    expect(TRAINING_PROGRAMS.map((p) => [p.eventType, p.available])).toEqual([
      ['two_k', true],
      ['five_k', true],
      ['ten_k', false],
      ['half_marathon', true],
      ['marathon', true],
      ['hundred_k', false],
    ]);
  });

  it('encodes the Concept2 marathon schedule with week 5 and 9 5k time trials', () => {
    expect(CONCEPT2_MARATHON_WEEKS).toHaveLength(16);
    expect(CONCEPT2_MARATHON_WEEKS[4]![1]!.text).toMatch(/5k time trial/i);
    expect(CONCEPT2_MARATHON_WEEKS[8]![1]!.text).toMatch(/5k time trial/i);
    expect(CONCEPT2_MARATHON_WEEKS[0]![0]!.targetDistanceMeters).toBe(10_000);
    expect(CONCEPT2_MARATHON_WEEKS[15]![3]!.targetDistanceMeters).toBe(
      EVENT_DISTANCE_METERS.marathon,
    );
  });

  it('generates a dated Concept2 marathon plan', () => {
    const plan = generateProgramPlan({
      eventType: 'marathon',
      startDate: new Date('2026-03-02T00:00:00Z'),
      targetPaceSeconds500m: 120, // 5k pace reference
    });

    expect(plan.name).toContain('Concept2 Marathon');
    expect(plan.sessions.length).toBe(16 * 4);
    const paceChecks = plan.sessions.filter((s) => /5k time trial/i.test(s.title));
    expect(paceChecks).toHaveLength(2);
    expect(paceChecks[0]!.targetDistanceMeters).toBe(5000);

    const ut2 = plan.sessions.find((s) => s.title.includes('10 km UT2'));
    expect(ut2?.targetPaceMinSeconds500m).toBe(138); // 120 + 18
    expect(ut2?.targetPaceMaxSeconds500m).toBe(142); // 120 + 22
  });

  it('generates Concept2 2k and 5k plans', () => {
    const twoK = generateProgramPlan({ eventType: 'two_k' });
    expect(twoK.sessions.length).toBe(12 * 4);
    expect(twoK.sessions.some((s) => s.title.includes('2000m test'))).toBe(true);

    const fiveK = generateProgramPlan({ eventType: 'five_k' });
    expect(fiveK.sessions.length).toBe(8 * 4);
    expect(fiveK.program.source?.url).toContain('5k-erg-test');
  });

  it('refuses distances without a public Concept2 plan', () => {
    expect(() => generateProgramPlan({ eventType: 'ten_k' })).toThrow(/No public Concept2/);
    expect(() => generateProgramPlan({ eventType: 'hundred_k' })).toThrow(/No public Concept2/);
  });
});
