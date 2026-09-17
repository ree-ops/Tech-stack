import { config } from './config.js';
import { broadcastEvent } from './broadcast.js';
import { recomputeAndBroadcast } from './recompute.js';
import { isLiveFromRealData, upsertTelemetry } from './zoneRegistry.js';
import { ZONES } from './zones.js';
import type { ZoneTelemetry } from './types.js';

interface ZoneSimState {
  zone_id: string;
  mode: 'healthy' | 'stress';
  moisture: number;
  temp: number;
  /** Staggers zones so some dry out faster than others — makes the priority queue demo-able. */
  rateMultiplier: number;
}

const HEALTHY_MOISTURE = 55;
const HEALTHY_TEMP = 24;
const STRESS_MOISTURE = 8;
const STRESS_TEMP = 38;

const states = new Map<string, ZoneSimState>(
  ZONES.map((zone, i) => [
    zone.zone_id,
    {
      zone_id: zone.zone_id,
      mode: 'healthy' as const,
      moisture: HEALTHY_MOISTURE - i * 3,
      temp: HEALTHY_TEMP + i * 1.2,
      rateMultiplier: 0.9 + i * 0.2,
    },
  ]),
);

let intervalHandle: NodeJS.Timeout | null = null;

function step(state: ZoneSimState): ZoneTelemetry {
  const targetMoisture = state.mode === 'stress' ? STRESS_MOISTURE : HEALTHY_MOISTURE;
  const targetTemp = state.mode === 'stress' ? STRESS_TEMP : HEALTHY_TEMP;

  // A healthy zone should read as visually flat (small sensor jitter only);
  // a triggered stress event should still be obviously trending within a
  // demo-friendly timescale. The pull-toward-target term dominates either way.
  state.moisture += (targetMoisture - state.moisture) * 0.2 * state.rateMultiplier + (Math.random() - 0.5) * 0.3;
  state.temp += (targetTemp - state.temp) * 0.2 * state.rateMultiplier + (Math.random() - 0.5) * 0.2;
  state.moisture = Math.max(0, Math.min(100, state.moisture));

  const moisture = Math.round(state.moisture * 10) / 10;
  const temp = Math.round(state.temp * 10) / 10;

  return {
    zone_id: state.zone_id,
    soil_moisture: moisture,
    canopy_temp: temp,
    actuator_on: moisture <= config.moistureThreshold || temp >= config.criticalTemp,
    pump_on: moisture <= config.pumpMoistureThreshold,
    ts: Date.now(),
  };
}

export function startSimulator() {
  if (intervalHandle) return;
  intervalHandle = setInterval(() => {
    for (const state of states.values()) {
      // Don't stomp on a zone that's currently getting real MQTT data —
      // simulation is the fallback, not a competing source of truth.
      if (isLiveFromRealData(state.zone_id)) continue;
      upsertTelemetry(step(state));
    }
    recomputeAndBroadcast();
  }, 2000);
  console.log(`[simulator] started with ${states.size} zones`);
}

export function stopSimulator() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

export function triggerHeatStress(zoneId?: string) {
  let matched = false;
  for (const state of states.values()) {
    if (!zoneId || state.zone_id === zoneId) {
      state.mode = 'stress';
      matched = true;
    }
  }
  broadcastEvent({
    message: zoneId && matched ? `Heat stress event triggered on zone ${zoneId}` : 'Heat stress event triggered (all simulated zones)',
    ts: Date.now(),
  });
}

export function resetToHealthy(zoneId?: string) {
  let matched = false;
  for (const state of states.values()) {
    if (!zoneId || state.zone_id === zoneId) {
      state.mode = 'healthy';
      matched = true;
    }
  }
  broadcastEvent({
    message: zoneId && matched ? `Zone ${zoneId} reset to healthy` : 'All simulated zones reset to healthy',
    ts: Date.now(),
  });
}
