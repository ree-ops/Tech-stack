import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';
import type { ZoneStatus } from './types.js';

let client: SupabaseClient | null = null;
let lastLoggedAt = 0;

function getClient(): SupabaseClient | null {
  if (client) return client;
  if (!config.supabaseUrl || !config.supabaseKey) return null;
  client = createClient(config.supabaseUrl, config.supabaseKey);
  return client;
}

/**
 * Logs a snapshot of every zone to Supabase, throttled to
 * SUPABASE_LOG_INTERVAL_MS — called every recompute (every ~1-2s), but only
 * actually writes on the throttle boundary. This is what persists history
 * beyond the in-memory prediction window (which only keeps ~10 minutes).
 * No-ops silently if SUPABASE_URL/SUPABASE_KEY aren't set.
 */
export async function logZoneSnapshots(statuses: ZoneStatus[]) {
  const supabase = getClient();
  if (!supabase) return;

  const now = Date.now();
  if (now - lastLoggedAt < config.supabaseLogIntervalMs) return;
  lastLoggedAt = now;

  const rows = statuses.map((z) => ({
    zone_id: z.zone_id,
    label: z.label,
    soil_moisture: z.soil_moisture,
    canopy_temp: z.canopy_temp,
    actuator_on: z.actuator_on,
    pump_on: z.pump_on,
    stress_code: z.stress_code,
    hours_to_critical: z.hours_to_critical,
    moisture_rate_pct_per_hr: z.moisture_rate_pct_per_hr,
    temp_rate_c_per_hr: z.temp_rate_c_per_hr,
  }));

  const { error } = await supabase.from('zone_telemetry').insert(rows);
  if (error) {
    console.error('[supabase] insert failed:', error.message);
  }
}
