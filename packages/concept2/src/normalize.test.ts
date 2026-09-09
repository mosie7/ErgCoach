import { describe, expect, it } from 'vitest';
import { normalizeConcept2Workout, parseConcept2Time } from './normalize.js';
import { MockConcept2Client } from './client.js';

describe('parseConcept2Time', () => {
  it('parses seconds and mm:ss', () => {
    expect(parseConcept2Time(120)).toBe(120);
    expect(parseConcept2Time('2:00')).toBe(120);
  });

  it('treats large integers as tenths of a second', () => {
    expect(parseConcept2Time(1200)).toBe(1200);
    expect(parseConcept2Time(12000)).toBe(1200);
  });
});

describe('normalizeConcept2Workout', () => {
  it('maps fixture fields into domain workout', () => {
    const w = normalizeConcept2Workout({
      id: 'abc',
      date: '2026-01-01T07:00:00.000Z',
      type: 'rower',
      distance: 10000,
      time: 2580,
      pace: 129,
      watt: 160,
      heart_rate: 140,
      max_heart_rate: 148,
      stroke_rate: 18,
      splits: [{ distance: 500, time: 129, heart_rate: 138, stroke_rate: 18, watt: 160 }],
    });
    expect(w.externalId).toBe('abc');
    expect(w.distanceMeters).toBe(10000);
    expect(w.durationSeconds).toBe(2580);
    expect(w.averageStrokeRate).toBe(18);
    expect(w.splits).toHaveLength(1);
    expect(w.sport).toBe('rower');
  });
});

describe('MockConcept2Client', () => {
  it('syncs fixtures and skips known duplicates', async () => {
    const client = new MockConcept2Client({
      clientId: 'x',
      clientSecret: 'y',
      redirectUri: 'http://localhost/callback',
      authUrl: 'https://log.concept2.com/oauth/authorize',
      tokenUrl: 'https://log.concept2.com/oauth/access_token',
      apiBaseUrl: 'https://log.concept2.com/api',
    });
    await client.connect('code');
    const result = await client.syncWorkouts({
      knownExternalIds: new Set(['c2-mock-ut2-14k']),
    });
    expect(result.skippedDuplicateIds).toContain('c2-mock-ut2-14k');
    expect(result.imported.some((w) => w.externalId === 'c2-mock-ut1-2x20')).toBe(true);
  });
});
