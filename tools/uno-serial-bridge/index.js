/**
 * Temporary stand-in for the ESP32.
 *
 * The Uno is already printing readings over USB (the Arduino Serial
 * Monitor). This script reads that same USB serial port directly and
 * publishes to the same MQTT topic the ESP32 will eventually use — so the
 * dashboard shows real sensor data now, before the Uno<->ESP32 link and
 * its voltage divider are wired up.
 *
 * IMPORTANT: only one program can hold a serial port open at a time.
 * Close the Arduino IDE's Serial Monitor before running this.
 *
 * Usage:
 *   npm install
 *   node index.js --list                  # find your port
 *   node index.js /dev/cu.usbserial-1410   # run the bridge
 */

import mqtt from 'mqtt';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';

const MQTT_BROKER = 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = 'lowveld-grove/zone04/telemetry';
const ZONE_ID = '04';

// Measured from the actual sensor (reproduced across two dry/wet cycles):
// ~1023 (ADC ceiling) in dry air, ~470-474 in water.
const SOIL_DRY_RAW = 1023;
const SOIL_WET_RAW = 472;
const MOISTURE_THRESHOLD = 28;
const PUMP_MOISTURE_THRESHOLD = 18;
const CRITICAL_TEMP = 36;

// Matches uno_sensor_node.ino's debug line: "-> ESP32: soil_raw=812  temp=24.6"
const FULL_LINE_PATTERN = /soil_raw=(\d+)\s+temp=([\d.]+)/;

// Matches uno_standalone_node.ino's line with real DHT22 readings:
// "Soil Moisture Value: 465  Temp: 24.6  Humidity: 52.3"
const SOIL_TEMP_HUMIDITY_PATTERN =
  /Soil Moisture Value:\s*(\d+)\s+Temp:\s*([\d.]+)\s+Humidity:\s*([\d.]+)/i;

// Matches the older soil-only tutorial sketch's line: "Soil Moisture Value: 308"
// (no DHT22 in that sketch, so there's no real temperature/humidity to report).
const SOIL_ONLY_LINE_PATTERN = /Soil Moisture Value:\s*(\d+)/i;
const PLACEHOLDER_TEMP_C = 24;

async function listPorts() {
  const ports = await SerialPort.list();
  if (ports.length === 0) {
    console.log('No serial ports found. Is the Uno plugged in?');
    return;
  }
  console.log('Available serial ports:');
  for (const p of ports) {
    console.log(` - ${p.path}${p.manufacturer ? ` (${p.manufacturer})` : ''}`);
  }
}

function moistureFromRaw(raw) {
  const pct = ((SOIL_DRY_RAW - raw) / (SOIL_DRY_RAW - SOIL_WET_RAW)) * 100;
  return Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
}

function run(portPath) {
  const port = new SerialPort({ path: portPath, baudRate: 9600 });
  const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

  port.on('error', (err) => {
    console.error('[serial] error:', err.message);
    console.error('If this says the port is busy, close the Arduino IDE Serial Monitor first.');
  });
  port.on('open', () => console.log(`[serial] listening on ${portPath}`));

  const client = mqtt.connect(MQTT_BROKER);
  client.on('connect', () => console.log('[mqtt] connected to', MQTT_BROKER));
  client.on('error', (err) => console.error('[mqtt] error:', err.message));

  parser.on('data', (line) => {
    const fullMatch = line.match(FULL_LINE_PATTERN);
    const dhtMatch = line.match(SOIL_TEMP_HUMIDITY_PATTERN);
    const soilOnlyMatch = line.match(SOIL_ONLY_LINE_PATTERN);

    if (!fullMatch && !dhtMatch && !soilOnlyMatch) {
      console.log('[serial]', line.trim());
      return;
    }

    let soilRaw;
    let temp;
    let humidity;

    if (dhtMatch) {
      soilRaw = Number(dhtMatch[1]);
      temp = Number(dhtMatch[2]);
      humidity = Number(dhtMatch[3]);
    } else if (fullMatch) {
      soilRaw = Number(fullMatch[1]);
      temp = Number(fullMatch[2]);
    } else {
      soilRaw = Number(soilOnlyMatch[1]);
      temp = PLACEHOLDER_TEMP_C;
      console.log('[bridge] no DHT22 in this sketch — using a placeholder temp of', PLACEHOLDER_TEMP_C, 'C');
    }

    const moisture = moistureFromRaw(soilRaw);

    const payload = JSON.stringify({
      zone_id: ZONE_ID,
      soil_moisture: moisture,
      canopy_temp: temp,
      ...(humidity !== undefined ? { humidity_pct: humidity } : {}),
      actuator_on: moisture <= MOISTURE_THRESHOLD || temp >= CRITICAL_TEMP,
      pump_on: moisture <= PUMP_MOISTURE_THRESHOLD,
      ts: Date.now(),
    });

    client.publish(MQTT_TOPIC, payload);
    console.log('[published]', payload);
  });
}

const arg = process.argv[2];

if (!arg || arg === '--list') {
  await listPorts();
  if (!arg) {
    console.log('\nRun again with a port path, e.g.:');
    console.log('  node index.js /dev/cu.usbserial-1410');
  }
} else {
  run(arg);
}
