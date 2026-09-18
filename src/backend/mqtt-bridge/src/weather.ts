import { config } from './config.js';
import { broadcastEvent, broadcastWeather } from './broadcast.js';
import type { WeatherSnapshot } from './types.js';

const RAIN_PROBABILITY_THRESHOLD = 0.4; // 40% chance of rain in the next few hours
const RAIN_CONDITION_GROUPS = new Set(['Rain', 'Drizzle', 'Thunderstorm']);

let latest: WeatherSnapshot | null = null;
let intervalHandle: NodeJS.Timeout | null = null;

interface OpenWeatherCurrent {
  main: { temp: number; humidity: number };
  weather: Array<{ main: string }>;
}

interface OpenWeatherForecast {
  list: Array<{
    dt: number;
    pop: number; // probability of precipitation, 0-1
    weather: Array<{ main: string }>;
  }>;
}

async function fetchWeather(): Promise<WeatherSnapshot> {
  const { openWeatherApiKey: key, weatherLat: lat, weatherLon: lon } = config;

  const currentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;
  const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${key}`;

  const [currentRes, forecastRes] = await Promise.all([fetch(currentUrl), fetch(forecastUrl)]);

  if (!currentRes.ok) throw new Error(`current weather request failed: ${currentRes.status}`);
  if (!forecastRes.ok) throw new Error(`forecast request failed: ${forecastRes.status}`);

  const current = (await currentRes.json()) as OpenWeatherCurrent;
  const forecast = (await forecastRes.json()) as OpenWeatherForecast;

  // Look at the next few 3-hour forecast slots (roughly the next 9 hours) —
  // rain far out in the forecast shouldn't stop us watering right now.
  const upcoming = forecast.list.slice(0, 3);
  const maxPop = upcoming.reduce((max, slot) => Math.max(max, slot.pop), 0);
  const anyRainCondition = upcoming.some((slot) =>
    slot.weather.some((w) => RAIN_CONDITION_GROUPS.has(w.main)),
  );

  return {
    temp_c: Math.round(current.main.temp * 10) / 10,
    humidity_pct: Math.round(current.main.humidity),
    condition: current.weather[0]?.main ?? 'Unknown',
    rain_expected: maxPop >= RAIN_PROBABILITY_THRESHOLD || anyRainCondition,
    rain_probability_pct: Math.round(maxPop * 100),
    updated_at: Date.now(),
  };
}

async function poll() {
  if (!config.openWeatherApiKey) {
    console.log('[weather] OPENWEATHER_API_KEY not set, skipping weather polling');
    return;
  }

  try {
    const previousRainExpected = latest?.rain_expected ?? false;
    latest = await fetchWeather();
    broadcastWeather(latest);
    console.log('[weather]', latest);

    if (latest.rain_expected && !previousRainExpected) {
      broadcastEvent({
        message: `Rain expected (${latest.rain_probability_pct}% chance) — simulated irrigation deferred`,
        ts: Date.now(),
      });
    }
  } catch (err) {
    console.error('[weather] fetch failed:', (err as Error).message);
  }
}

export function startWeatherPolling() {
  if (intervalHandle) return;
  poll(); // fetch immediately on boot, don't wait for the first interval
  intervalHandle = setInterval(poll, config.weatherPollIntervalMs);
}

export function stopWeatherPolling() {
  if (intervalHandle) clearInterval(intervalHandle);
  intervalHandle = null;
}

export function getLatestWeather(): WeatherSnapshot | null {
  return latest;
}

/** Simulated zones check this before switching the pump on — real hardware decides locally, unaffected. */
export function isRainExpected(): boolean {
  return latest?.rain_expected ?? false;
}

// Low ambient humidity pulls moisture out of soil faster (higher
// evapotranspiration); high humidity slows it down. This isn't a full
// evapotranspiration model (Penman-Monteith etc.) — just a simple, explainable
// multiplier on the sensor-trend-based drying rate: 50% humidity is the
// neutral baseline (multiplier 1), scaling roughly +/-1% per 1% humidity away
// from that, clamped to a sane range so a single humidity reading can't
// swing the projection wildly.
const NEUTRAL_HUMIDITY_PCT = 50;
const MIN_DRYING_MULTIPLIER = 0.6;
const MAX_DRYING_MULTIPLIER = 1.6;

/**
 * >1 means "drying faster than the sensor trend alone suggests" (dry air),
 * <1 means "drying slower" (humid air) — applied to hours-to-critical
 * projections for every zone, real or simulated, since this only adjusts
 * the backend's predictive display, not any zone's own actuation decision.
 */
export function getHumidityDryingMultiplier(): number {
  if (!latest) return 1;
  const deviation = (NEUTRAL_HUMIDITY_PCT - latest.humidity_pct) / 100;
  const multiplier = 1 + deviation;
  return Math.min(MAX_DRYING_MULTIPLIER, Math.max(MIN_DRYING_MULTIPLIER, multiplier));
}
