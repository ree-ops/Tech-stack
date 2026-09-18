import 'dotenv/config';

export const config = {
  httpPort: Number(process.env.PORT ?? 8080),
  mqttBrokerUrl: process.env.MQTT_BROKER_URL ?? 'mqtt://broker.hivemq.com:1883',
  mqttTopic: process.env.MQTT_TOPIC ?? 'lowveld-grove/zone04/telemetry',
  simulateOnBoot: (process.env.SIMULATE_ON_BOOT ?? 'true') === 'true',

  // Shade-cloth deploys once moisture drops to this level (or temp exceeds criticalTemp).
  moistureThreshold: Number(process.env.MOISTURE_THRESHOLD ?? 28),
  // Irrigation pump kicks in once moisture drops this low — a more urgent, lower bar than the shade threshold.
  pumpMoistureThreshold: Number(process.env.PUMP_MOISTURE_THRESHOLD ?? 18),
  // "Critical" for the predictive stress code / hours-to-critical estimate.
  criticalMoisture: Number(process.env.CRITICAL_MOISTURE ?? 12),
  criticalTemp: Number(process.env.CRITICAL_TEMP ?? 36),
  // Sliding window used to estimate drying/warming rate via linear regression.
  trendWindowMs: Number(process.env.TREND_WINDOW_MS ?? 10 * 60 * 1000),

  // OpenWeatherMap — used to defer simulated irrigation when rain is
  // already on the way, and to show current conditions on the dashboard.
  openWeatherApiKey: process.env.OPENWEATHER_API_KEY ?? '',
  weatherLat: Number(process.env.WEATHER_LAT ?? -25.4547),
  weatherLon: Number(process.env.WEATHER_LON ?? 30.9694),
  weatherPollIntervalMs: Number(process.env.WEATHER_POLL_INTERVAL_MS ?? 10 * 60 * 1000),

  // Supabase — persists zone history beyond the in-memory prediction
  // window, for real historical charts / reporting later.
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseKey: process.env.SUPABASE_KEY ?? '',
  supabaseLogIntervalMs: Number(process.env.SUPABASE_LOG_INTERVAL_MS ?? 30 * 1000),
};
