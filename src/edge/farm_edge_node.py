"""
Lowveld Grove — ESP32 edge node (MicroPython / Thonny)

Sensors live on a separate Arduino Uno (src/edge/uno_sensor_node), which
sends raw readings over a UART link as "<soil_raw>,<canopy_temp_c>\\n".
This board: receives those readings, converts the raw soil value to a
moisture percentage, decides shade-cloth and irrigation pump state locally
(no cloud dependency), and publishes telemetry over MQTT using the same
JSON schema the software simulator uses — so the mqtt-bridge backend and
the dashboard/mobile apps don't need to know or care whether a zone's data
is coming from real hardware or the simulator.

Wiring to the Uno (see docs/build-plan.md for the full diagram):
  ESP32 GPIO26 (TX) -> Uno D2 (RX)                      — direct, no divider
  ESP32 GPIO25 (RX) <- [1k/2k divider] <- Uno D3 (TX)    — REQUIRED, do not skip
  ESP32 GND         -- Uno GND

Before running for real:
  1. Fill in WIFI_SSID / WIFI_PASSWORD below.
  2. Calibrate SOIL_DRY_RAW / SOIL_WET_RAW (see docs/build-plan.md) — read
     them off the Uno's Serial Monitor (USB), not the ESP32's.
  3. Install umqtt.simple: `import mip; mip.install("umqtt.simple")`
     (needs WiFi connected first) or via Thonny's Tools > Manage Packages.
  4. Save this file as main.py on the device (File > Save As > MicroPython
     device) so it runs automatically on power-up, untethered.
"""

from machine import UART, Pin, PWM
import network
import ntptime
import ujson
import utime
from time import sleep

from umqtt.simple import MQTTClient

# ---- WiFi / MQTT ----
WIFI_SSID = "YOUR_WIFI_SSID"
WIFI_PASSWORD = "YOUR_WIFI_PASSWORD"

MQTT_BROKER = "broker.hivemq.com"
MQTT_TOPIC = b"lowveld-grove/zone04/telemetry"
ZONE_ID = "04"

# ---- Calibration (see docs/build-plan.md "Calibration and threshold tuning") ----
SOIL_DRY_RAW = 312    # measured: ~308-316 in dry air
SOIL_WET_RAW = 34     # measured: ~32-36 in a cup of water

# ---- Thresholds — keep in sync with the backend's .env (mqtt-bridge) ----
MOISTURE_THRESHOLD = 28        # shade cloth deploys at/below this
PUMP_MOISTURE_THRESHOLD = 18   # pump switches on at/below this (more urgent)
CRITICAL_TEMP = 36             # shade cloth also deploys above this

PUBLISH_INTERVAL_S = 2
# If no line has ever arrived from the Uno within this long, stop actuating
# on stale/absent data rather than silently reusing old readings forever.
SENSOR_TIMEOUT_S = 15

# Seconds between the MicroPython epoch (2000-01-01) and the Unix epoch
# (1970-01-01), so published timestamps line up with the simulator's
# JS Date.now() (ms since 1970) instead of reading as a 1970-ish date
# in the dashboard's event log / chart.
UNIX_EPOCH_OFFSET_S = 946684800

# ---- Hardware ----
# UART2 on GPIO25/26 rather than the more common 16/17 — those double as
# PSRAM lines on WROVER boards, so 25/26 avoids that conflict either way.
uno_uart = UART(2, baudrate=9600, tx=26, rx=25)

servo = PWM(Pin(13), freq=50)
# Pump is driven through a relay/MOSFET module (unlike the servo, it draws
# far more current than a GPIO pin can source directly) — GPIO27 here is
# just the logic-level signal to that module, not the pump itself.
pump = Pin(27, Pin.OUT)

SERVO_RETRACTED_DUTY = 40   # tune for your SG90/FS90 (~0deg)
SERVO_DEPLOYED_DUTY = 115   # tune for your SG90/FS90 (~90deg)

_last_reading = None       # (soil_raw, canopy_temp) — most recent line from the Uno
_last_reading_at = None    # utime.ticks_ms() when it arrived


def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        print("Connecting to WiFi...")
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        while not wlan.isconnected():
            sleep(0.5)
    print("WiFi connected:", wlan.ifconfig())
    return wlan


def sync_clock():
    try:
        ntptime.settime()
        print("Clock synced via NTP")
    except OSError as e:
        print("NTP sync failed, timestamps will be wrong:", e)


def now_ms():
    return (utime.time() + UNIX_EPOCH_OFFSET_S) * 1000


def poll_uno():
    """Drains the UART buffer and keeps the newest well-formed reading."""
    global _last_reading, _last_reading_at

    while uno_uart.any():
        line = uno_uart.readline()
        if not line:
            break
        try:
            text = line.decode().strip()
            raw_str, temp_str = text.split(",")
            _last_reading = (int(raw_str), float(temp_str))
            _last_reading_at = utime.ticks_ms()
        except (ValueError, UnicodeError):
            print("Malformed line from Uno:", line)


def get_reading():
    """Returns (soil_moisture_pct, canopy_temp_c), or None if no fresh data."""
    if _last_reading is None:
        return None
    if utime.ticks_diff(utime.ticks_ms(), _last_reading_at) > SENSOR_TIMEOUT_S * 1000:
        return None

    soil_raw, temp = _last_reading
    pct = (SOIL_DRY_RAW - soil_raw) / (SOIL_DRY_RAW - SOIL_WET_RAW) * 100
    moisture = max(0, min(100, round(pct, 1)))
    return moisture, round(temp, 1)


def set_shade(deployed):
    servo.duty(SERVO_DEPLOYED_DUTY if deployed else SERVO_RETRACTED_DUTY)


def set_pump(on):
    pump.value(1 if on else 0)


def main():
    connect_wifi()
    sync_clock()

    client = MQTTClient("lowveld-grove-edge-04", MQTT_BROKER)
    client.connect()
    print("MQTT connected to", MQTT_BROKER)
    print("Waiting for readings from the Uno over UART2...")

    while True:
        try:
            poll_uno()
            reading = get_reading()

            if reading is None:
                print("No (recent) data from Uno yet — check the serial link and divider")
                sleep(PUBLISH_INTERVAL_S)
                continue

            moisture, temp = reading

            actuator_on = moisture <= MOISTURE_THRESHOLD or temp >= CRITICAL_TEMP
            pump_on = moisture <= PUMP_MOISTURE_THRESHOLD

            set_shade(actuator_on)
            set_pump(pump_on)

            payload = ujson.dumps({
                "zone_id": ZONE_ID,
                "soil_moisture": moisture,
                "canopy_temp": temp,
                "actuator_on": actuator_on,
                "pump_on": pump_on,
                "ts": now_ms(),
            })
            client.publish(MQTT_TOPIC, payload)
            print("[MQTT]", payload)

        except OSError as e:
            print("MQTT error:", e)

        sleep(PUBLISH_INTERVAL_S)


main()
