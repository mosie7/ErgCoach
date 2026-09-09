import { describe, expect, it } from 'vitest';
import { normalizeConcept2Workout, parseConcept2Time, parseConcept2Pace } from './normalize.js';
import { MockConcept2Client, formatConcept2DateTime } from './client.js';

describe('parseConcept2Time', () => {
  it('parses mm:ss strings as seconds', () => {
    expect(parseConcept2Time('2:00')).toBe(120);
  });

  it('treats integer values as tenths of a second', () => {
    expect(parseConcept2Time(1200)).toBe(120);
    expect(parseConcept2Time(12000)).toBe(1200);
    expect(parseConcept2Time(600)).toBe(60);
  });
});

describe('parseConcept2Pace', () => {
  it('treats integer pace as tenths of a second', () => {
    expect(parseConcept2Pace(1290)).toBe(129);
    expect(parseConcept2Pace(1020)).toBe(102);
  });
});

describe('normalizeConcept2Workout', () => {
  it('maps Concept2 API fields into domain workout', () => {
    const w = normalizeConcept2Workout({
      id: 'abc',
      date: '2026-01-01 07:00:00',
      type: 'rower',
      distance: 10000,
      time: 25800, // tenths
      pace: 1290,
      watt: 160,
      heart_rate: { average: 140, max: 148 },
      stroke_rate: 18,
      splits: [{ distance: 500, time: 1290, heart_rate: { average: 138 }, stroke_rate: 18, watt: 160 }],
    });
    expect(w.externalId).toBe('abc');
    expect(w.distanceMeters).toBe(10000);
    expect(w.durationSeconds).toBe(2580);
    expect(w.averagePaceSeconds500m).toBe(129);
    expect(w.averageHeartRate).toBe(140);
    expect(w.maxHeartRate).toBe(148);
    expect(w.averageStrokeRate).toBe(18);
    expect(w.splits).toHaveLength(1);
    expect(w.splits[0]?.durationSeconds).toBe(129);
    expect(w.sport).toBe('rower');
  });
});

describe('formatConcept2DateTime', () => {
  it('formats GMT timestamps for updated_after', () => {
    expect(formatConcept2DateTime(new Date('2026-09-09T15:30:00.000Z'))).toBe(
      '2026-09-09 15:30:00',
    );
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
