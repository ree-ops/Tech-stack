import { supabase } from './supabase';

export interface ZoneHistoryPoint {
  ts: number;
  soil_moisture: number;
  canopy_temp: number;
}

const HOURLY_BUCKET_THRESHOLD_HOURS = 48;

/**
 * Reads persisted history from Supabase's zone_telemetry table — written by
 * the backend every ~30s (src/backend/mqtt-bridge/src/historyLog.ts). This
 * is long-term history (hours/days), distinct from the live ~10-minute
 * in-memory history that comes over the WebSocket feed.
 *
 * Beyond 48 hours, raw ~30s samples would be tens of thousands of rows and
 * an unreadable chart — those ranges get bucketed into hourly averages
 * instead.
 */
export async function fetchZoneHistory(zoneId: string, hours = 24): Promise<ZoneHistoryPoint[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('zone_telemetry')
    .select('soil_moisture, canopy_temp, recorded_at')
    .eq('zone_id', zoneId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('[zoneHistory] fetch failed:', error.message);
    return [];
  }
  if (!data) return [];

  const points = data.map((row) => ({
    ts: new Date(row.recorded_at).getTime(),
    soil_moisture: row.soil_moisture,
    canopy_temp: row.canopy_temp,
  }));

  return hours > HOURLY_BUCKET_THRESHOLD_HOURS ? bucketHourly(points) : points;
}

function bucketHourly(points: ZoneHistoryPoint[]): ZoneHistoryPoint[] {
  const HOUR_MS = 60 * 60 * 1000;
  const buckets = new Map<number, { sumMoisture: number; sumTemp: number; count: number }>();

  for (const p of points) {
    const bucketTs = Math.floor(p.ts / HOUR_MS) * HOUR_MS;
    const bucket = buckets.get(bucketTs) ?? { sumMoisture: 0, sumTemp: 0, count: 0 };
    bucket.sumMoisture += p.soil_moisture;
    bucket.sumTemp += p.canopy_temp;
    bucket.count += 1;
    buckets.set(bucketTs, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([ts, b]) => ({
      ts,
      soil_moisture: Math.round((b.sumMoisture / b.count) * 10) / 10,
      canopy_temp: Math.round((b.sumTemp / b.count) * 10) / 10,
    }));
}
