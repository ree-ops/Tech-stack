/*
 * Lowveld Grove — Arduino Uno sensor node
 *
 * Reads the soil moisture sensor and DHT22 and sends them to the ESP32
 * over a SoftwareSerial link as a plain CSV line:
 *
 *   <soil_raw_0_to_1023>,<canopy_temp_c>\n
 *
 * The Uno does no threshold logic and no MQTT — it only reads sensors.
 * The ESP32 (farm_edge_node.py) converts the raw value to a moisture
 * percentage, makes the shade/pump decisions, and publishes over MQTT.
 *
 * Wiring:
 *   Soil sensor AOUT -> A0, VCC -> 5V, GND -> GND
 *   DHT22 DATA        -> D4,  VCC -> 5V, GND -> GND
 *   D2 (RX)  <- ESP32 GPIO26 (TX)                — direct, no divider needed
 *   D3 (TX)  -> [1k/2k divider] -> ESP32 GPIO25 (RX) — REQUIRED, do not skip
 *   GND      -> ESP32 GND
 *
 * Needs the "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"
 * installed via the Arduino IDE Library Manager.
 */

#include <SoftwareSerial.h>
#include <DHT.h>

#define SOIL_PIN A0
#define DHT_PIN 4
#define DHT_TYPE DHT22

#define ESP_RX_PIN 2  // Uno D2 <- ESP32 TX
#define ESP_TX_PIN 3  // Uno D3 -> divider -> ESP32 RX

#define PUBLISH_INTERVAL_MS 2000

SoftwareSerial espSerial(ESP_RX_PIN, ESP_TX_PIN);
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);     // USB serial monitor, for local debugging only
  espSerial.begin(9600);  // link to the ESP32
  dht.begin();
  Serial.println("Uno sensor node ready");
}

void loop() {
  int soilRaw = analogRead(SOIL_PIN);
  float tempC = dht.readTemperature();

  if (isnan(tempC)) {
    Serial.println("DHT22 read failed, skipping this cycle");
    delay(PUBLISH_INTERVAL_MS);
    return;
  }

  espSerial.print(soilRaw);
  espSerial.print(",");
  espSerial.println(tempC, 1);

  Serial.print("-> ESP32: soil_raw=");
  Serial.print(soilRaw);
  Serial.print("  temp=");
  Serial.println(tempC);

  delay(PUBLISH_INTERVAL_MS);
}
