import { config } from './config.js';
import { getHumidityDryingMultiplier } from './weather.js';
import { ZONES } from './zones.js';
import type { StressCode, ZoneStatus, ZoneTelemetry } from './types.js';

// The trend is computed from only this much recent history, not the whole
// retained window — a brief stress-then-reset blip (e.g. from testing the
// demo buttons) should age out of the *rate* calculation within a couple
// minutes, not linger for the full 10-minute retention window.
const RECENCY_WINDOW_MS = 2 * 60 * 1000;

// Below this much elapsed history there aren't enough samples to average out
// sensor jitter, so a slope estimate is mostly noise. Report a flat trend
// until there's enough span.
const MIN_TREND_WINDOW_MS = RECENCY_WINDOW_MS;

// A zone sitting near its setpoint still jitters tick to tick. Comparing the
// average of the window's first half to its second half — rather than a raw
// least-squares slope through every noisy point — is far less sensitive to
// that jitter. Below this minimum swing between the two halves, treat the
// trend as flat rather than extrapolating noise into an hourly rate.
const MOISTURE_DEADBAND_PCT = 1.5;
const TEMP_DEADBAND_C = 0.8;

type DataSource = 'real' | 'simulated';
interface HistoryPoint extends ZoneTelemetry {
  source: DataSource;
}

const history = new Map<string, HistoryPoint[]>();

function pushHistory(t: ZoneTelemetry, source: DataSource): HistoryPoint[] {
  const list = history.get(t.zone_id) ?? [];
  list.push({ ...t, source });
  const cutoff = t.ts - config.trendWindowMs;
  while (list.length && list[0].ts < cutoff) list.shift();
  history.set(t.zone_id, list);
  return list;
}

// A zone switching between real MQTT data and the simulator (or back) is a
// discontinuity, not a trend — e.g. real data going stale and falling back
// to the simulator's ~55% baseline looks like a huge "decline" from 100% if
// compared directly. Only compare samples from the *current* unbroken run
// of the same source, discarding anything from before the last switch.
function currentSourceRun(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length === 0) return points;
  const currentSource = points[points.length - 1].source;
  let start = points.length - 1;
  while (start > 0 && points[start - 1].source === currentSource) start--;
  return points.slice(start);
}

/** Rate of change per hour, comparing the mean of each half of the window. */
function trendPerHour(points: { ts: number; value: number }[], deadband: number): number {
  if (points.length < 4) return 0;

  const mid = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, mid);
  const secondHalf = points.slice(mid);
  const mean = (arr: typeof points) => arr.reduce((a, p) => a + p.value, 0) / arr.length;
  const meanTs = (arr: typeof points) => arr.reduce((a, p) => a + p.ts, 0) / arr.length;

  const valueDelta = mean(secondHalf) - mean(firstHalf);
  if (Math.abs(valueDelta) < deadband) return 0;

  const hoursDelta = (meanTs(secondHalf) - meanTs(firstHalf)) / 3_600_000;
  if (hoursDelta <= 0) return 0;
  return valueDelta / hoursDelta;
}

function classify(hoursToCritical: number | null, moisture: number, temp: number): StressCode {
  if (moisture <= config.criticalMoisture || temp >= config.criticalTemp) return 'CRITICAL';

  const tempComfortable = temp < config.criticalTemp - 8;

  // Comfortably healthy — well above the shade-cloth trigger, temp well
  // below critical. No amount of short-window trend wobble should raise an
  // alarm here: a zone at 100% moisture isn't "WATCH" just because a noisy
  // 2-minute window happened to trend downward. Ignore the projection
  // entirely in this band, before it's even looked at.
  if (moisture > config.moistureThreshold * 2 && tempComfortable) return 'OK';

  // Already past the shade-cloth trigger? That's real stress whether or not
  // there's an active trend right now.
  const alreadyStressed = moisture <= config.moistureThreshold || temp >= config.criticalTemp - 8;
  if (hoursToCritical === null) return alreadyStressed ? 'WATCH' : 'OK';

  // A short recent dip (e.g. a sensor drying out after being wet, or a few
  // seconds of noise) can extrapolate into an alarming-looking "critical in
  // 20 minutes" even while the zone is nowhere near critical in absolute
  // terms. Only trust the projection enough to escalate past WATCH once the
  // zone is already in the shade-cloth threshold's neighbourhood.
  const nearCritical = moisture <= config.moistureThreshold * 1.5 || temp >= config.criticalTemp - 4;
  if (!nearCritical) return alreadyStressed || hoursToCritical <= 24 ? 'WATCH' : 'OK';

  if (hoursToCritical <= 1) return 'CRITICAL';
  if (hoursToCritical <= 6) return 'WARNING';
  if (hoursToCritical <= 24) return 'WATCH';
  return alreadyStressed ? 'WATCH' : 'OK';
}

/** Detects how fast a zone is drying/warming and estimates hours until critical stress. */
export function evaluate(telemetry: ZoneTelemetry, source: DataSource): ZoneStatus {
  const allPoints = pushHistory(telemetry, source);
  const points = currentSourceRun(allPoints);
  const windowSpanMs = points.length > 1 ? points[points.length - 1].ts - points[0].ts : 0;
  const haveEnoughHistory = windowSpanMs >= MIN_TREND_WINDOW_MS;

  const moistureRate = haveEnoughHistory
    ? trendPerHour(points.map((p) => ({ ts: p.ts, value: p.soil_moisture })), MOISTURE_DEADBAND_PCT)
    : 0;
  const tempRate = haveEnoughHistory
    ? trendPerHour(points.map((p) => ({ ts: p.ts, value: p.canopy_temp })), TEMP_DEADBAND_C)
    : 0;

  const alreadyCritical = telemetry.soil_moisture <= config.criticalMoisture || telemetry.canopy_temp >= config.criticalTemp;

  // Only project forward when the trend is actually heading toward the critical side.
  // Low ambient humidity speeds up evaporation beyond what the sensor trend
  // alone shows (and vice versa for humid air) — see weather.ts. Only applies
  // to the moisture projection; canopy temp isn't affected by soil humidity.
  const humidityDryingMultiplier = getHumidityDryingMultiplier();
  const hoursFromMoisture =
    moistureRate < 0
      ? (telemetry.soil_moisture - config.criticalMoisture) / -moistureRate / humidityDryingMultiplier
      : null;
  const hoursFromTemp =
    tempRate > 0 ? (config.criticalTemp - telemetry.canopy_temp) / tempRate : null;

  const candidates = [hoursFromMoisture, hoursFromTemp].filter(
    (h): h is number => h !== null && h >= 0,
  );
  const hoursToCritical = alreadyCritical ? 0 : candidates.length ? Math.min(...candidates) : null;

  const label = ZONES.find((z) => z.zone_id === telemetry.zone_id)?.label ?? `Zone ${telemetry.zone_id}`;

  return {
    ...telemetry,
    label,
    moisture_rate_pct_per_hr: Math.round(moistureRate * 100) / 100,
    temp_rate_c_per_hr: Math.round(tempRate * 100) / 100,
    hours_to_critical: hoursToCritical === null ? null : Math.round(hoursToCritical * 10) / 10,
    stress_code: classify(hoursToCritical, telemetry.soil_moisture, telemetry.canopy_temp),
    priority_rank: 0,
  };
}

/** Sorts soonest-to-critical first — "which sides to get water first". */
export function rankZones(statuses: ZoneStatus[]): ZoneStatus[] {
  const sorted = [...statuses].sort((a, b) => {
    const ah = a.hours_to_critical ?? Infinity;
    const bh = b.hours_to_critical ?? Infinity;
    return ah - bh;
  });
  return sorted.map((s, i) => ({ ...s, priority_rank: i + 1 }));
}
