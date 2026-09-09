/**
 * Synthetic Concept2-like workout fixtures for local development.
 * Matches live Logbook conventions: `time` / split `time` / pace in tenths of a second.
 */
export const mockWorkouts: Record<string, unknown>[] = [
  {
    id: 'c2-mock-ut2-14k',
    date: '2026-08-20 07:00:00',
    type: 'rower',
    distance: 14000,
    time: 35960, // tenths → 3596s
    pace: 1284, // tenths → 128.4s/500m
    watt: 165,
    heart_rate: { average: 139, max: 147 },
    stroke_rate: 18,
    splits: [
      { distance: 500, time: 1280, heart_rate: { average: 134 }, stroke_rate: 18, watt: 166 },
      { distance: 500, time: 1282, heart_rate: { average: 136 }, stroke_rate: 18, watt: 165 },
      { distance: 500, time: 1285, heart_rate: { average: 138 }, stroke_rate: 18, watt: 164 },
      { distance: 500, time: 1290, heart_rate: { average: 141 }, stroke_rate: 18, watt: 162 },
    ],
  },
  {
    id: 'c2-mock-ut1-2x20',
    date: '2026-08-22 07:00:00',
    type: 'rower',
    distance: 9700,
    time: 24100,
    pace: 1242,
    watt: 182,
    heart_rate: { average: 152, max: 158 },
    stroke_rate: 20,
    splits: [
      { distance: 500, time: 1240, heart_rate: { average: 149 }, stroke_rate: 20, watt: 183 },
      { distance: 500, time: 1242, heart_rate: { average: 151 }, stroke_rate: 20, watt: 182 },
      { distance: 500, time: 1245, heart_rate: { average: 153 }, stroke_rate: 20, watt: 181 },
      { distance: 500, time: 1243, heart_rate: { average: 153 }, stroke_rate: 20, watt: 182 },
    ],
  },
];
