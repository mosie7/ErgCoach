import { describe, expect, it } from 'vitest';
import { computeBlockWeek, eventTypeToBlockType } from './blocks.js';

describe('training block helpers', () => {
  it('maps event types to block types', () => {
    expect(eventTypeToBlockType('marathon')).toBe('marathon');
    expect(eventTypeToBlockType('two_k')).toBe('two_k');
    expect(eventTypeToBlockType('general_endurance')).toBe('general');
  });

  it('computes current week from block start', () => {
    const start = new Date('2026-01-05T00:00:00Z');
    const week8 = new Date('2026-02-23T00:00:00Z'); // ~7 weeks later → week 8
    const info = computeBlockWeek(start, week8, 16);
    expect(info.currentWeek).toBe(8);
    expect(info.totalWeeks).toBe(16);
    expect(info.progressPercent).toBe(50);
  });
});
