import { broadcastZoneStatuses } from './broadcast.js';
import { evaluate, rankZones } from './prediction.js';
import { getAllTelemetry } from './zoneRegistry.js';

/** Re-runs prediction + priority ranking over every known zone (simulated or real) and broadcasts it. */
export function recomputeAndBroadcast() {
  const statuses = getAllTelemetry().map(evaluate);
  broadcastZoneStatuses(rankZones(statuses));
}
