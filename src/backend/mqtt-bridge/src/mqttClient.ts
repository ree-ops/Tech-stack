import mqtt from 'mqtt';
import { config } from './config.js';
import { broadcastEvent } from './broadcast.js';
import { recomputeAndBroadcast } from './recompute.js';
import { markRealUpdate, upsertTelemetry } from './zoneRegistry.js';
import type { ZoneTelemetry } from './types.js';

// The ESP32 firmware (src/edge) doesn't publish pump_on yet — the build plan's
// current rig only drives the shade-cloth servo. Default it from the same
// threshold the pump would use once wired, so the field is always present.
type RawZoneTelemetry = Omit<ZoneTelemetry, 'pump_on'> & { pump_on?: boolean };

function normalize(raw: RawZoneTelemetry): ZoneTelemetry {
  return {
    ...raw,
    pump_on: raw.pump_on ?? raw.soil_moisture <= config.pumpMoistureThreshold,
  };
}

export function connectMqtt() {
  const client = mqtt.connect(config.mqttBrokerUrl);

  client.on('connect', () => {
    console.log(`[mqtt] connected to ${config.mqttBrokerUrl}`);
    client.subscribe(config.mqttTopic, (err) => {
      if (err) console.error('[mqtt] subscribe failed', err);
      else console.log(`[mqtt] subscribed to ${config.mqttTopic}`);
    });
    broadcastEvent({ message: 'MQTT bridge connected to broker', ts: Date.now() });
  });

  client.on('message', (_topic, payload) => {
    try {
      const raw = JSON.parse(payload.toString()) as RawZoneTelemetry;
      const telemetry = normalize(raw);
      upsertTelemetry(telemetry);
      markRealUpdate(telemetry.zone_id);
      console.log('[mqtt] received', payload.toString());
      recomputeAndBroadcast();
    } catch (err) {
      console.error('[mqtt] failed to parse payload', err);
    }
  });

  client.on('error', (err) => {
    console.error('[mqtt] error', err.message);
  });

  return client;
}
