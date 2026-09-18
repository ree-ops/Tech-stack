import { broadcastZoneStatuses } from './broadcast.js';
import { logZoneSnapshots } from './historyLog.js';
import { evaluate, rankZones } from './prediction.js';
import { getAllTelemetry, isLiveFromRealData } from './zoneRegistry.js';

/** Re-runs prediction + priority ranking over every known zone (simulated or real) and broadcasts it. */
export function recomputeAndBroadcast() {
  const statuses = getAllTelemetry().map((t) =>
    evaluate(t, isLiveFromRealData(t.zone_id) ? 'real' : 'simulated'),
  );
  const ranked = rankZones(statuses);
  broadcastZoneStatuses(ranked);
  void logZoneSnapshots(ranked);
}
