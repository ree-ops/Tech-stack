import type { ZoneTelemetry } from './types.js';

// A zone that has received a real MQTT message recently is "live" — the
// simulator must not overwrite it. Once real data stops arriving for
// longer than this, the zone falls back to being simulator-driven again
// (the dual-demo fallback behaviour described in the build plan).
const LIVE_GRACE_MS = 8000;

const latest = new Map<string, ZoneTelemetry>();
const lastRealUpdateAt = new Map<string, number>();

export function upsertTelemetry(t: ZoneTelemetry) {
  latest.set(t.zone_id, t);
}

/** Records that this zone's data came from a real MQTT publish, not the simulator. */
export function markRealUpdate(zoneId: string) {
  lastRealUpdateAt.set(zoneId, Date.now());
}

/** True if this zone has had a real MQTT update recently enough that the simulator should leave it alone. */
export function isLiveFromRealData(zoneId: string): boolean {
  const at = lastRealUpdateAt.get(zoneId);
  return at !== undefined && Date.now() - at < LIVE_GRACE_MS;
}

export function getAllTelemetry(): ZoneTelemetry[] {
  return Array.from(latest.values());
}
