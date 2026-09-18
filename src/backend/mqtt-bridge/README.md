# mqtt-bridge

Subscribes to the farm telemetry MQTT topic and forwards zone status to the
dashboard (web) and mobile app over a shared WebSocket feed. Also runs a
fallback simulator across several zones so the dashboard works with no
hardware attached, and exposes the "Simulate heat stress event" / "Reset to
healthy" REST triggers used by both frontends.

On top of raw telemetry, every zone is run through a predictive layer
(`src/prediction.ts`) that:

- **detects drying/warming rate** — soil moisture %/hr and canopy temp °C/hr,
  from a rolling trend window (`TREND_WINDOW_MS`, default 10 min; needs at
  least 3 min of history before it trusts a slope, and ignores swings smaller
  than the sensor-noise deadband — see the comments in `prediction.ts`)
- **estimates hours until critical stress** (`hours_to_critical`) by
  projecting that rate forward to `CRITICAL_MOISTURE` / `CRITICAL_TEMP`
- **assigns a predictive stress code** — `OK` / `WATCH` / `WARNING` / `CRITICAL`
- **ranks zones by urgency** (`priority_rank`) — soonest-to-critical first,
  answering "which side needs water first"

The irrigation pump (`pump_on`) switches on automatically once soil moisture
drops to `PUMP_MOISTURE_THRESHOLD`, independently of the shade-cloth actuator
(`actuator_on`, driven by `MOISTURE_THRESHOLD` / `CRITICAL_TEMP`).

`src/weather.ts` polls OpenWeatherMap every `WEATHER_POLL_INTERVAL_MS` (needs
`OPENWEATHER_API_KEY` set) for the coordinates in `WEATHER_LAT`/`WEATHER_LON`,
and broadcasts it to clients. If rain is expected in the next ~9 hours,
simulated zones defer switching the pump on (no point irrigating right before
the sky does it for free) — the shade cloth still responds to heat/dryness
regardless. Real hardware zones aren't affected by this: they decide locally
on-device, per the no-cloud-dependency design; the weather check only
applies to the simulated fallback.

**Humidity feeds the "hours to critical" projection directly**, for every
zone (real or simulated) — this one *is* a backend analytics adjustment, not
an actuation decision, so it applies uniformly. Low ambient humidity means
faster evaporation than the sensor trend alone would suggest, so
`getHumidityDryingMultiplier()` in `weather.ts` scales the moisture-based
projection: >1 shortens the estimate (drying faster than the raw trend
implies), <1 lengthens it, with 50% humidity as the neutral baseline. It's a
simple, explainable multiplier, not a full evapotranspiration model — good
enough for "does this need water in the next hour or the next day," not
agronomic precision.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Server listens on `http://localhost:8080`, with the live feed at
`ws://localhost:8080/ws`.

## Endpoints

- `GET /api/zones` — every zone's current status, prediction, and priority rank
- `GET /api/weather` — latest weather snapshot (`{ weather: WeatherSnapshot | null }`)
- `POST /api/simulate/heat-stress` — `{ "zone_id": "03" }` drives that simulated zone into a stress event (omit `zone_id` to affect all simulated zones)
- `POST /api/simulate/reset` — same shape, returns a zone (or all) to healthy
- `ws://.../ws` — pushes `{ type: 'zones', payload: ZoneStatus[] }`, `{ type: 'event', payload }`, and `{ type: 'weather', payload: WeatherSnapshot }` messages

## Zone status shape

```json
{
  "zone_id": "04",
  "label": "West block",
  "soil_moisture": 27.4,
  "canopy_temp": 29.1,
  "actuator_on": true,
  "pump_on": false,
  "moisture_rate_pct_per_hr": -3.2,
  "temp_rate_c_per_hr": 0.8,
  "hours_to_critical": 4.5,
  "stress_code": "WARNING",
  "priority_rank": 1,
  "ts": 1737024000000
}
```

The MQTT wire schema from the ESP32 (`src/edge/farm_edge_node.ino`) only needs
`zone_id`, `soil_moisture`, `canopy_temp`, `actuator_on`, `ts` — `pump_on` is
optional on the wire and defaults from `PUMP_MOISTURE_THRESHOLD` if the
firmware doesn't send it yet. Everything else (`label`, the rate/prediction
fields, `priority_rank`) is computed by this bridge, not by the device.

Set `SIMULATE_ON_BOOT=false` in `.env` once the real ESP32 edge node is
publishing to the MQTT topic — its zone (`04` / West block by default, see
`src/zones.ts`) will then be driven by real sensor data while the rest stay
simulated, which is useful for a demo with only one physical rig.
