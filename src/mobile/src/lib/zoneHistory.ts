import { supabase } from './supabase';

export interface ZoneHistoryRow {
  soil_moisture: number;
  canopy_temp: number;
  stress_code: string;
  recorded_at: string;
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
 * instead (stress_code is kept from the last raw reading in each bucket,
 * since it isn't meaningful to average).
 */
export async function fetchZoneHistory(zoneId: string, hours = 24): Promise<ZoneHistoryRow[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('zone_telemetry')
    .select('soil_moisture, canopy_temp, stress_code, recorded_at')
    .eq('zone_id', zoneId)
    .gte('recorded_at', since)
    .order('recorded_at', { ascending: true });

  if (error) {
    console.error('[zoneHistory] fetch failed:', error.message);
    return [];
  }
  if (!data) return [];

  return hours > HOURLY_BUCKET_THRESHOLD_HOURS ? bucketHourly(data) : data;
}

function bucketHourly(rows: ZoneHistoryRow[]): ZoneHistoryRow[] {
  const HOUR_MS = 60 * 60 * 1000;
  const buckets = new Map<number, { sumMoisture: number; sumTemp: number; count: number; lastStress: string }>();

  for (const row of rows) {
    const ts = new Date(row.recorded_at).getTime();
    const bucketTs = Math.floor(ts / HOUR_MS) * HOUR_MS;
    const bucket = buckets.get(bucketTs) ?? { sumMoisture: 0, sumTemp: 0, count: 0, lastStress: row.stress_code };
    bucket.sumMoisture += row.soil_moisture;
    bucket.sumTemp += row.canopy_temp;
    bucket.count += 1;
    bucket.lastStress = row.stress_code;
    buckets.set(bucketTs, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a - b)
    .map(([bucketTs, b]) => ({
      soil_moisture: Math.round((b.sumMoisture / b.count) * 10) / 10,
      canopy_temp: Math.round((b.sumTemp / b.count) * 10) / 10,
      stress_code: b.lastStress,
      recorded_at: new Date(bucketTs).toISOString(),
    }));
}
