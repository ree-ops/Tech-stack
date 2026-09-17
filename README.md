# Lowveld Grove — Domain 2

MICTSETA Hackathon 2026, Domain 2: Smart Agribusiness & Climate Defence for
Macadamia/Citrus. A cyber-physical prototype that monitors soil moisture and
canopy temperature across several orchard sections, detects how fast each is
drying out or heating up, estimates hours until critical stress, and ranks
sections by which needs water first. When a section crosses threshold it
deploys a shade-cloth actuator and, if moisture keeps falling, switches on an
irrigation pump automatically — all shown live on a 3D digital twin. Full
detail: [docs/build-plan.md](docs/build-plan.md).

## Architecture

```
ESP32 edge node (src/edge)  --MQTT publish-->  MQTT broker
                                                    |
                                              MQTT subscribe
                                                    v
                                    mqtt-bridge (src/backend/mqtt-bridge)
                                                    |
                                          WebSocket / REST
                                          /                  \
                             dashboard (src/dashboard)   mobile (src/mobile)
                             React + Vite, 3D twin        Expo React Native
```

A simulator inside `mqtt-bridge` drives several zones with no hardware
attached — the identical dual-demo fallback path described in the build plan.
The real ESP32 rig (zone `04` / West block) can run alongside the simulated
zones, so the demo always has multiple sections to prioritize between even
with one physical rig.

`mqtt-bridge` enriches raw telemetry with a predictive layer before
broadcasting it: drying/warming rate, hours until critical stress, a
`stress_code` (`OK`/`WATCH`/`WARNING`/`CRITICAL`), and a `priority_rank`
across zones. See [src/backend/mqtt-bridge/README.md](src/backend/mqtt-bridge/README.md)
for the full zone status shape and the thresholds behind it.

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

## Repo layout

```
lowveld-grove/
  src/
    edge/                  # ESP32 firmware (Arduino, hand-written by the team)
    backend/mqtt-bridge/   # Node.js/TypeScript MQTT-to-WebSocket bridge + simulator
    dashboard/             # React (Vite) web app — 3D digital twin, chart, controls
    mobile/                # React Native (Expo) companion app
  cad/                     # optional enclosure/mounting designs
  slides/                  # pitch deck
  media/                   # team + build-progress photos
  docs/build-plan.md       # full build plan
```

## Setup

Requires Node.js 18+ and npm. Each project has its own `package.json`; there is
no shared workspace root, so `npm install` in each directory separately:

```bash
# 1. Backend (MQTT bridge + simulator)
cd src/backend/mqtt-bridge
cp .env.example .env
npm install
npm run dev            # http://localhost:8080, ws://localhost:8080/ws

# 2. Web dashboard
cd src/dashboard
cp .env.example .env
npm install
npm run dev            # http://localhost:5173

# 3. Mobile companion app
cd src/mobile
npm install
npx expo start
```

The bridge runs its own simulator by default (`SIMULATE_ON_BOOT=true`), so the
dashboard and mobile app work with no hardware attached. Once
`src/edge/farm_edge_node.ino` is flashed and publishing real MQTT data, set
`SIMULATE_ON_BOOT=false` in the bridge's `.env`.

## Demo script (the Dual-Demo)

1. **Virtual simulation** — open the dashboard, pick a section in the
   priority queue, click "Simulate heat stress" on it and watch it drift into
   stress: the stress code escalates OK → WATCH → WARNING → CRITICAL, "hours
   to critical" counts down, the shade cloth deploys and the pump switches on
   in the 3D twin, and it climbs to #1 in the priority queue. Click "Reset to
   healthy" to show recovery.
2. **Physical hardware** — show the wired ESP32/sensor/servo rig; dry the soil
   sample so the real servo moves on its own; with the simulator off, show the
   dashboard and mobile app updating that section from the real sensor.

Full script, wiring diagram, component list, and calibration steps:
[docs/build-plan.md](docs/build-plan.md).
