import { describe, expect, it } from 'vitest';
import {
  calculatePace,
  paceToWatts,
  wattsToPace,
  calculateHeartRateDrift,
  calculatePaceDrift,
  calculatePaceVariance,
  calculateSplitConsistency,
} from './pace-power.js';

describe('calculatePace', () => {
  it('computes seconds per 500m', () => {
    expect(calculatePace(2000, 480)).toBeCloseTo(120, 5);
  });

  it('returns null for invalid input', () => {
    expect(calculatePace(0, 100)).toBeNull();
    expect(calculatePace(1000, 0)).toBeNull();
  });
});

describe('pace/watts conversion', () => {
  it('round-trips pace to watts and back', () => {
    const pace = 120; // 2:00
    const watts = paceToWatts(pace);
    expect(watts).not.toBeNull();
    expect(watts!).toBeCloseTo(202.5, 0);
    expect(wattsToPace(watts!)!).toBeCloseTo(pace, 5);
  });

  it('handles faster paces with higher watts', () => {
    expect(paceToWatts(90)!).toBeGreaterThan(paceToWatts(120)!);
  });
});

describe('heart-rate drift', () => {
  it('detects positive drift when second half HR is higher', () => {
    const hrs = [140, 141, 142, 143, 150, 151, 152, 153];
    const drift = calculateHeartRateDrift(hrs);
    expect(drift).not.toBeNull();
    expect(drift!).toBeGreaterThan(4);
  });

  it('returns near-zero for stable HR', () => {
    const hrs = [150, 150, 151, 150, 150, 151, 150, 150];
    const drift = calculateHeartRateDrift(hrs);
    expect(Math.abs(drift!)).toBeLessThan(1);
  });

  it('returns null with too few samples', () => {
    expect(calculateHeartRateDrift([140, 150])).toBeNull();
  });
});

describe('pace variance and consistency', () => {
  it('scores consistent splits higher', () => {
    const steady = [126, 126.2, 125.8, 126.1, 126, 125.9];
    const erratic = [120, 130, 118, 132, 125, 140];
    expect(calculatePaceVariance(erratic)!).toBeGreaterThan(calculatePaceVariance(steady)!);
    expect(calculateSplitConsistency(steady)!).toBeGreaterThan(
      calculateSplitConsistency(erratic)!,
    );
  });
});

describe('pace drift', () => {
  it('is positive when second half is slower', () => {
    const paces = [120, 120, 121, 121, 126, 127, 128, 128];
    expect(calculatePaceDrift(paces)!).toBeGreaterThan(3);
  });
});
