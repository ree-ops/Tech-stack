# Lowveld Grove — Domain 2 Build Plan

2026-09-17

## Project overview

Lowveld Grove is a cyber-physical prototype for MICTSETA Hackathon 2026, Domain 2:
Smart Agribusiness & Climate Defence for Macadamia/Citrus. It monitors soil moisture
and canopy temperature in a simulated orchard zone, and when a stress threshold is
breached, an edge device automatically deploys a shade-cloth actuator while a live 3D
digital twin shows the zone's state changing in real time.

**Why this domain:** low hardware risk (soil/temp sensors are cheap and reliable), a
self-explanatory threshold-based system with no gap between what's claimed and what's
built, and a strong, easy-to-pitch Mpumalanga story (Lowveld macadamia/citrus exports).

**Winning strategy against the rubric:**

| Rubric criterion | Weight | How this build addresses it |
| --- | --- | --- |
| Dual-Demo Execution | 25% | Software simulation and physical rig run on the identical MQTT schema, so either can drive the demo; simulation is the scored fallback if hardware fails live |
| Systems Integration & Physical Actuation | 20% | Real sensor -> ESP32 edge logic -> real servo, with the decision made locally (no cloud dependency) |
| Spatial Visualization & 3D Twinning | 20% | Farm-zone grid twin recolors live per zone and shows actuator state, not a static scene |
| Problem Relevance & Mpumalanga Impact | 20% | Macadamia/citrus exports are a major, credible Lowveld economic driver |
| Pitch Presentation | 15% | Clear before/after demo narrative: stress detected, actuator responds, twin confirms it |

## Component list

A relay module is intentionally left out: the SG90 draws little enough current to run
straight off the ESP32's 5V pin for demo purposes, which removes one potential point of
failure.

| Part | Spec | Qty | Purpose | SA sourcing | Approx. price |
| --- | --- | --- | --- | --- | --- |
| ESP32 dev board | ESP32-WROOM-32 DevKit | 1 | Edge compute, WiFi, MQTT publish | RS Components, Communica, Mantech Electronics, Takealot | R120-180 |
| Capacitive soil moisture sensor | v1.2, analog output | 1 | Soil moisture reading (corrosion-resistant, unlike resistive probes) | Same suppliers | R40-80 |
| DHT22 (AM2302) | Digital temp/humidity sensor | 1 | Canopy temperature reading | Same suppliers | R80-120 |
| SG90 micro servo | 180deg, 5V | 1 | Shade-cloth flap actuator | Any hobby/electronics supplier | R40-60 |
| Breadboard + jumper wires | Standard prototyping kit | 1 set | Wiring | Any electronics kit | R60-100 |
| USB cable / power bank | 5V micro-USB or USB-C depending on board | 1 | Power the ESP32 untethered on demo day | Already on hand | - |
| Small potted plant or soil tray | Any small pot with soil | 1 | Physical "farm zone" prop for the demo | Home/garden | - |

## Wiring and pin mapping

```
ESP32["ESP32 DevKit"]
SOIL["Soil moisture sensor"]
DHT["DHT22"]
SERVO["SG90 servo"]

SOIL -->|AOUT to GPIO34| ESP32
SOIL -->|VCC to 3V3, GND to GND| ESP32
DHT -->|DATA to GPIO4| ESP32
DHT -->|VCC to 3V3, GND to GND| ESP32
ESP32 -->|PWM signal GPIO13| SERVO
ESP32 -->|5V and GND| SERVO
```

Keep the soil sensor's exposed prongs out of standing water and only in moist soil, to
avoid long-term corrosion even though it is capacitive.

| ESP32 pin | Connects to | Notes |
| --- | --- | --- |
| GPIO34 (ADC1) | Soil sensor AOUT | Analog-only pin, cannot be used as output |
| 3V3 | Soil sensor VCC, DHT22 VCC | Shared 3.3V rail |
| GND | Soil sensor GND, DHT22 GND, servo GND | Common ground for all components |
| GPIO4 | DHT22 DATA | Add a 10k ohm pull-up resistor between DATA and 3V3 if readings are unstable |
| GPIO13 | Servo signal (orange/yellow wire) | PWM output |
| 5V (VIN) | Servo VCC (red wire) | Servo draws more current than a 3.3V pin can safely supply |

## Software architecture

```
A["ESP32 edge node: reads sensors, applies threshold"] -->|MQTT publish| B["MQTT broker: e.g. HiveMQ public or local Mosquitto"]
B -->|MQTT subscribe| C["Backend bridge: Node.js/Python"]
C -->|WebSocket or REST| D["3D digital twin dashboard: farm-twin.html"]
E["Simulated data generator: same JSON schema"] -.->|fallback path| B
```

**Shared MQTT schema** (used by both the real ESP32 and the software simulator, so
either can drive the dashboard without changing it):

```json
{
  "zone_id": "04",
  "soil_moisture": 27.4,
  "canopy_temp": 29.1,
  "actuator_on": true,
  "ts": 1737024000000
}
```

**Components already built (this repo):**

- `src/backend/mqtt-bridge` — Node.js/TypeScript backend: subscribes to the MQTT
  topic, runs a fallback simulator across several zones, and forwards enriched
  state to clients over WebSocket.
- `src/dashboard` — React + Vite web app: live 3D digital twin, priority queue,
  telemetry chart, and Dual-Demo controls.
- `src/mobile` — Expo (React Native) companion app: same live feed, priority
  queue, and controls, for demoing from a phone.

**Still to build (by the team, in the Arduino IDE):**

- `src/edge/farm_edge_node.ino` — ESP32 firmware. See setup instructions below.

### Predictive stress & auto-irrigation (added after the original plan)

`mqtt-bridge` doesn't just relay the raw MQTT reading — for every zone it also:

- **detects the drying/warming rate** (soil moisture %/hr, canopy temp °C/hr)
  from a rolling trend window, once enough history has built up to tell a
  real trend from sensor jitter
- **estimates hours until critical stress** by projecting that rate forward
  to a critical moisture/temperature level
- **assigns a predictive stress code** — `OK` → `WATCH` → `WARNING` → `CRITICAL`
- **ranks every zone by urgency** (soonest-to-critical first) — this is the
  priority queue in the dashboard and mobile app, answering "which side needs
  water first"
- **switches the irrigation pump on automatically** once moisture drops to a
  lower, more urgent threshold than the one that deploys the shade cloth

This is why the software stack simulates four zones (North/East/South/West
block) instead of one: prioritizing between sections only means something
with more than one section to compare. The real ESP32 rig still only wires up
one physical zone (`04` / West block); the rest stay simulator-driven so the
demo always has a full priority queue to show. Full detail, thresholds, and
the zone status JSON shape: [src/backend/mqtt-bridge/README.md](../src/backend/mqtt-bridge/README.md).

## Setup instructions, from scratch

**Note:** this team ended up flashing the ESP32 with **MicroPython and using
Thonny** instead of the Arduino IDE / C++ path below, and later split the
sensors onto a separate **Arduino Uno** (reading soil moisture + DHT22,
handed to the ESP32 over a serial link) once wiring everything onto one
board got unwieldy. If that's your setup, skip to
[src/edge/README.md](../src/edge/README.md) instead — the pin mapping and
calibration steps below still apply to whichever board actually has the
sensors wired to it.

### 1. Arduino IDE setup

1. Install the Arduino IDE (2.x).
2. File > Preferences > add this URL to "Additional boards manager URLs":
   `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
3. Tools > Board > Boards Manager > search "esp32" > install the Espressif package.
4. Tools > Board > select your ESP32 DevKit variant.
5. Library Manager: install `DHT sensor library` (Adafruit), `Adafruit Unified Sensor`,
   `PubSubClient`, `ESP32Servo`.

### 2. Wire the hardware per the pin mapping above.

### 3. Flash the firmware

1. Open `farm_edge_node.ino`.
2. Set `WIFI_SSID` and `WIFI_PASSWORD` to your hotspot or venue WiFi.
3. Leave `MQTT_BROKER` as `broker.hivemq.com` for a quick start, or point it at your
   own Mosquitto instance.
4. Select the correct COM/USB port under Tools > Port.
5. Upload. Open the Serial Monitor at 115200 baud to confirm readings are printing.

### 4. Run the software stack

1. `src/backend/mqtt-bridge`: `cp .env.example .env && npm install && npm run dev`
2. `src/dashboard`: `cp .env.example .env && npm install && npm run dev`, open
   `http://localhost:5173`.
3. `src/mobile`: `npm install && npx expo start` (see its README for pointing at a
   physical phone).

### 5. Test end-to-end

1. With the ESP32 powered and connected, watch the Serial Monitor for `[MQTT]` log
   lines.
2. Use an MQTT client (e.g. MQTT Explorer, or `mosquitto_sub`) to confirm messages
   are arriving on the topic `lowveld-grove/zone04/telemetry`.
3. Confirm the dashboard and mobile app update from real sensor values instead of
   the bridge's built-in simulator (set `SIMULATE_ON_BOOT=false` in the bridge's
   `.env` once the ESP32 is live).

## Calibration and threshold tuning

The capacitive soil sensor outputs a raw analog value (0-4095 on the ESP32's ADC)
that must be mapped to a 0-100% moisture range before the threshold logic means
anything.

1. Upload the firmware and open the Serial Monitor.
2. Hold the sensor in dry air (not touching anything) and note the raw
   `analogRead()` value — this is `SOIL_DRY_RAW`.
3. Submerge the sensor's prongs in a cup of water and note the raw value — this is
   `SOIL_WET_RAW`.
4. Update these two constants at the top of `farm_edge_node.ino` with your measured
   values (the firmware ships with placeholder estimates of 2800 dry / 1200 wet,
   which will likely need adjusting per individual sensor unit).
5. Re-upload and confirm the Serial Monitor now reports sensible percentages in dry
   soil versus wet soil.

**Threshold:** `MOISTURE_THRESHOLD` is set to 28%, matching the dashboard's and
bridge's default threshold and the dashed line on its chart. If the calibration
makes 28% impractical to reach on stage within demo time, lower the threshold
(e.g. to 35-40%) so a normal watering demonstration crosses it quickly — just
update the same value in the firmware and in `MOISTURE_THRESHOLD` /
`VITE_MOISTURE_THRESHOLD` / `app.json`'s `moistureThreshold` so they stay in sync.

## Demo script (the Dual-Demo)

### Part 1 - Virtual simulation (proves the telemetry logic)

1. Open the dashboard (`src/dashboard`, `npm run dev`) on the projector/screen.
2. Narrate the schema and edge-decision logic while the baseline healthy state is
   visible.
3. Click "Simulate heat stress event." Narrate as Zone 04 drifts amber, then red,
   the chart crosses the dashed threshold, the shade cloth deploys in the 3D twin,
   and the event log fires.
4. Click "Reset to healthy" to show recovery and the actuator retracting.

### Part 2 - Physical hardware prototype (proves mechanical actuation)

1. Show the wired ESP32, sensor, and servo rig.
2. Physically dry the soil sample slightly, or wait for it to be below the
   calibrated threshold, so the audience sees the real servo move without you
   touching it.
3. Point out the Serial Monitor or an MQTT client showing the live message stream,
   and — with the bridge's `SIMULATE_ON_BOOT` turned off — show the twin (and the
   mobile app) updating from the real sensor in real time.

**Fallback framing:** state explicitly to the judges that the virtual simulation
runs on the identical schema and threshold logic as the physical rig, so if
anything about the hardware misbehaves live, the simulation is a faithful
stand-in, not a separate demo. This directly answers the rubric's language on
evaluating "how effectively the simulation serves as a fallback if physical
hardware fails."

## GitHub repository structure

Matches the mandatory deliverable requirements exactly, since the brief states
missing elements lead to immediate disqualification.

```
lowveld-grove/
  README.md
  src/
    edge/
      farm_edge_node.ino
    backend/
      mqtt-bridge/        # subscribes to MQTT, forwards to dashboard + mobile
    dashboard/             # React (Vite) web app — 3D digital twin
    mobile/                # React Native (Expo) companion app
  cad/                     # optional: enclosure or mounting designs, if any
  slides/
    lowveld-grove-pitch.pdf
  media/
    team/                  # clear photos of each team member
    build-progress/        # dated photos taken throughout the build, not staged at the end
  docs/
    build-plan.md          # this document
```

`README.md` should cover: problem statement, architecture summary (the diagram
from Software architecture, above), setup instructions (link to or restate Setup
instructions), and the demo script. GitHub username on record: MRNMT.

## Build timeline

### Boot Camp (before Checkpoint 2 - virtual simulation must be mentor-approved before touching hardware)

- [ ] Finalize the MQTT schema and interface contract
- [ ] Confirm the dashboard fully demonstrates the threshold and actuator logic on simulated data
- [ ] Order/source all physical components
- [ ] Draft the README and repo skeleton
- [ ] Present the virtual data flow and interface contract at Checkpoint 2

### Hackathon Sprint, Day 1 (after Checkpoint 2 approval)

- [ ] Wire the ESP32, soil sensor, DHT22, and servo
- [ ] Flash and calibrate the firmware (see Calibration section)
- [ ] Confirm MQTT messages are publishing correctly
- [ ] Build the backend bridge connecting MQTT to the dashboard
- [ ] Confirm the dashboard updates from live sensor data

### Hackathon Sprint, Day 2 / Night

- [ ] Rehearse the full Dual-Demo script end-to-end at least twice
- [ ] Take and organize team and build-progress photos for the media folder
- [ ] Finalize the slide deck (problem statement, methodology, commercialisation pathway, Mpumalanga impact)
- [ ] Push final source code, CAD (if any), slides, and media to the public GitHub repo
- [ ] Audit the repo against the mandatory deliverables list before submission
