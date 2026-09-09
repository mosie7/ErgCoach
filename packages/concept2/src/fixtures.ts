/**
 * Synthetic Concept2-like workout fixtures for local development.
 * Field names mirror commonly documented Logbook properties — VERIFY live schema.
 */
export const mockWorkouts: Record<string, unknown>[] = [
  {
    id: 'c2-mock-ut2-14k',
    date: '2026-08-20T07:00:00.000Z',
    type: 'rower',
    distance: 14000,
    time: 3596, // seconds
    pace: 128.4,
    watt: 165,
    heart_rate: 139,
    max_heart_rate: 147,
    stroke_rate: 18,
    splits: [
      { distance: 500, time: 128, heart_rate: 134, stroke_rate: 18, watt: 166 },
      { distance: 500, time: 128.2, heart_rate: 136, stroke_rate: 18, watt: 165 },
      { distance: 500, time: 128.5, heart_rate: 138, stroke_rate: 18, watt: 164 },
      { distance: 500, time: 129, heart_rate: 141, stroke_rate: 18, watt: 162 },
    ],
  },
  {
    id: 'c2-mock-ut1-2x20',
    date: '2026-08-22T07:00:00.000Z',
    type: 'rower',
    distance: 9700,
    time: 2410,
    pace: 124.2,
    watt: 182,
    heart_rate: 152,
    max_heart_rate: 158,
    stroke_rate: 20,
    splits: [
      { distance: 500, time: 124, heart_rate: 149, stroke_rate: 20, watt: 183 },
      { distance: 500, time: 124.2, heart_rate: 151, stroke_rate: 20, watt: 182 },
      { distance: 500, time: 124.5, heart_rate: 153, stroke_rate: 20, watt: 181 },
      { distance: 500, time: 124.3, heart_rate: 153, stroke_rate: 20, watt: 182 },
    ],
  },
];
