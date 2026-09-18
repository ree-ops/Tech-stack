/*
 * Lowveld Grove — Arduino Uno standalone sensor node (USB only)
 *
 * This is what's actually running on your Uno right now, extended with the
 * DHT22 for real temperature and humidity (previously only the soil sensor
 * was read, and the bridge script filled in a fake 24C placeholder).
 *
 * No ESP32 link — this prints over USB only, read by
 * tools/uno-serial-bridge/index.js on your Mac.
 *
 * Wiring:
 *   Soil sensor AOUT -> A0, VCC -> 5V, GND -> GND
 *   DHT22 DATA        -> D4,  VCC -> 5V, GND -> GND
 *
 * Needs the "DHT sensor library" (Adafruit) + "Adafruit Unified Sensor"
 * installed via the Arduino IDE Library Manager (Sketch > Include Library >
 * Manage Libraries).
 */

#include <DHT.h>

#define SOIL_PIN A0
#define DHT_PIN 4
#define DHT_TYPE DHT22

DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  int soilValue = analogRead(SOIL_PIN);
  float tempC = dht.readTemperature();
  float humidityPct = dht.readHumidity();

  Serial.print("Soil Moisture Value: ");
  Serial.print(soilValue);

  if (isnan(tempC) || isnan(humidityPct)) {
    Serial.println("  DHT22 read failed");
  } else {
    Serial.print("  Temp: ");
    Serial.print(tempC, 1);
    Serial.print("  Humidity: ");
    Serial.println(humidityPct, 1);
  }

  delay(1000);
}
