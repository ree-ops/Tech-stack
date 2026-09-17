# edge

Two boards now, split by job:

- **`uno_sensor_node/`** (Arduino Uno, Arduino IDE / C++) — owns both sensors.
  Reads the soil moisture sensor and DHT22, sends raw readings to the ESP32
  over a serial link. No WiFi, no MQTT, no thresholds — just sensor reads.
- **`farm_edge_node.py`** (ESP32, **MicroPython, flashed and run via Thonny**)
  — receives those readings, converts the raw soil value to a moisture
  percentage, decides shade-cloth and irrigation-pump state locally, drives
  both, and publishes over MQTT to `lowveld-grove/zone04/telemetry` using the
  same schema the backend's simulator produces.

(The build plan in `docs/build-plan.md` describes a single-board Arduino IDE
path instead; this team split sensors onto a Uno and kept WiFi/MQTT/actuation
on the ESP32, which is why the setup below differs from that doc.)

```json
{
  "zone_id": "04",
  "soil_moisture": 27.4,
  "canopy_temp": 29.1,
  "actuator_on": true,
  "pump_on": false,
  "ts": 1737024000000
}
```

## Why two boards, and the one wiring rule that matters

The Uno's own header pins were simpler to wire the sensors into directly
than sharing breadboard rails across everything. The tradeoff: the two
boards now need a serial link between them, and their logic levels don't
match — the Uno runs 5V logic, the ESP32's pins are 3.3V-only and can be
damaged by 5V.

**Uno → ESP32 (the direction that needs protection):**
```
Uno D3 (TX) ──[1kΩ]──●──[2kΩ]──── GND
                      │
                ESP32 GPIO25 (RX)
```
That divider drops 5V to ~3.3V. Don't skip it.

**ESP32 → Uno (the safe direction, no divider needed):**
```
ESP32 GPIO26 (TX) ──────────────── Uno D2 (RX)
```
3.3V is still read as a clear HIGH by the Uno's 5V-logic input, so this one
just needs a direct wire.

**Plus a shared ground:**
```
ESP32 GND ──────────────────────── Uno GND
```

GPIO25/26 (not the more common 16/17) on purpose — those double as PSRAM
lines on WROVER-variant ESP32 boards, so 25/26 sidesteps that conflict
regardless of which variant you have.

## Setup — Uno (Arduino IDE)

1. Install the **DHT sensor library** (Adafruit) and **Adafruit Unified
   Sensor** via Library Manager.
2. Wire the soil sensor to A0 and the DHT22 to D4, both powered from the
   Uno's own 5V/GND pins — no breadboard rail-sharing needed, everything
   plugs straight into the Uno's header.
3. Wire the serial link and divider to the ESP32 as above.
4. Open `uno_sensor_node/uno_sensor_node.ino`, upload it, then open the
   Serial Monitor (9600 baud) to confirm it prints `-> ESP32: soil_raw=...
   temp=...` every 2 seconds. Note the raw value dry, then in a cup of
   water — you'll need both for calibration.

## Setup — ESP32 (Thonny)

1. Flash MicroPython onto the ESP32 if you haven't already (Thonny:
   **Tools → Options → Interpreter → Install or update firmware**), then
   confirm the bottom-right of Thonny shows `MicroPython (ESP32)` connected
   over USB serial.
2. Wire the servo signal to GPIO13 and the pump relay's signal pin to
   GPIO27 (the relay/MOSFET module switches the pump itself — a GPIO pin
   can't drive a pump's current directly).
3. Install the MQTT client library (needs WiFi connected first):

   ```python
   import network
   wlan = network.WLAN(network.STA_IF)
   wlan.active(True)
   wlan.connect("YOUR_SSID", "YOUR_PASSWORD")
   # wait until wlan.isconnected() is True, then:
   import mip
   mip.install("umqtt.simple")
   ```

   Or via Thonny's menu: **Tools → Manage Packages** → search
   `umqtt.simple` → install.
4. Open `farm_edge_node.py`, fill in `WIFI_SSID` / `WIFI_PASSWORD`, and set
   `SOIL_DRY_RAW` / `SOIL_WET_RAW` from the raw values you noted on the
   Uno's Serial Monitor in step 4 above. Check the threshold constants
   match the backend's `.env` (`src/backend/mqtt-bridge/.env.example`).
5. Save it onto the device as `main.py` (Thonny: **File → Save As...** →
   pick the MicroPython device → filename `main.py`) so it runs
   automatically on power-up for an untethered demo. Running it via the
   editor's ▶ button first (as `<untitled>` / any other filename) is fine
   for testing — it just won't survive a reboot until it's saved as
   `main.py`.

## Testing against the software stack

With both boards powered and wired together, and `src/backend/mqtt-bridge`
running (`npm run dev`), watch the Thonny Shell for `[MQTT] {...}` print
lines, then open the dashboard (`http://localhost:5173`) — zone `04` ("West
block") should switch from the backend's simulator to these real readings
automatically; the other three zones stay simulator-driven so the priority
queue still has multiple sections to compare.

If the ESP32 keeps printing "No (recent) data from Uno yet": check the Uno's
own Serial Monitor is still printing lines (confirms the Uno side is fine),
then check the divider and the TX/RX wires aren't swapped — the single most
common mistake here is connecting TX to TX instead of TX to RX.
