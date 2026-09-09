export interface HrZoneDefinition {
  name: string;
  zoneIndex: number;
  minBpm: number;
  maxBpm: number;
}

export interface ZoneDistribution {
  [zoneName: string]: number; // fraction 0–1 of samples in zone
}

/**
 * Percentage of HR samples falling in each configured zone.
 * Samples outside all zones go to "out_of_zone".
 */
export function calculateHrZoneDistribution(
  heartRates: number[],
  zones: HrZoneDefinition[],
): ZoneDistribution {
  const result: ZoneDistribution = {};
  for (const z of zones) {
    result[z.name] = 0;
  }
  result['out_of_zone'] = 0;

  const valid = heartRates.filter((h) => Number.isFinite(h) && h > 0);
  if (valid.length === 0) return result;

  for (const hr of valid) {
    const zone = zones.find((z) => hr >= z.minBpm && hr <= z.maxBpm);
    if (zone) {
      result[zone.name] = (result[zone.name] ?? 0) + 1;
    } else {
      result['out_of_zone'] = (result['out_of_zone'] ?? 0) + 1;
    }
  }

  for (const key of Object.keys(result)) {
    result[key] = (result[key] ?? 0) / valid.length;
  }
  return result;
}

/** Build default max-HR percentage zones (method metadata only — not absolute truth). */
export function buildMaxHrZones(maxHr: number): HrZoneDefinition[] {
  return [
    { zoneIndex: 1, name: 'Z1', minBpm: Math.round(maxHr * 0.5), maxBpm: Math.round(maxHr * 0.6) },
    { zoneIndex: 2, name: 'Z2', minBpm: Math.round(maxHr * 0.6) + 1, maxBpm: Math.round(maxHr * 0.7) },
    { zoneIndex: 3, name: 'Z3', minBpm: Math.round(maxHr * 0.7) + 1, maxBpm: Math.round(maxHr * 0.8) },
    { zoneIndex: 4, name: 'Z4', minBpm: Math.round(maxHr * 0.8) + 1, maxBpm: Math.round(maxHr * 0.9) },
    { zoneIndex: 5, name: 'Z5', minBpm: Math.round(maxHr * 0.9) + 1, maxBpm: maxHr },
  ];
}

/** Build LTHR-relative zones (approximate bands; athlete-configurable). */
export function buildLthrZones(lthr: number): HrZoneDefinition[] {
  return [
    { zoneIndex: 1, name: 'Recovery', minBpm: Math.round(lthr * 0.55), maxBpm: Math.round(lthr * 0.79) },
    { zoneIndex: 2, name: 'UT2', minBpm: Math.round(lthr * 0.8), maxBpm: Math.round(lthr * 0.89) },
    { zoneIndex: 3, name: 'UT1', minBpm: Math.round(lthr * 0.9), maxBpm: Math.round(lthr * 0.95) },
    { zoneIndex: 4, name: 'AT', minBpm: Math.round(lthr * 0.96), maxBpm: Math.round(lthr * 1.02) },
    { zoneIndex: 5, name: 'TR/AN', minBpm: Math.round(lthr * 1.03), maxBpm: Math.round(lthr * 1.2) },
  ];
}
