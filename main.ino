#include <Wire.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_BME280.h>
#include <bluefruit.h>

#define SEALEVELPRESSURE_HPA (1013.25) // Adjust this to your local sea level pressure (in hPa) for accurate altitude readings
#define BLE_UUID_SERVICE "0000181a-0000-1000-8000-00805f9b34fb"
#define BLE_UUID_TEMPERATURE "00002a6e-0000-1000-8000-00805f9b34fb"    // Temperature characteristic UUID
#define BLE_UUID_PRESSURE "00002a6d-0000-1000-8000-00805f9b34fb"       // Pressure characteristic UUID
#define BLE_UUID_HUMIDITY "00002a6f-0000-1000-8000-00805f9b34fb"       // Humidity characteristic UUID

Adafruit_BME280 bme; // I2C

BLEService bleService(BLE_UUID_SERVICE);
BLECharacteristic temperatureCharacteristic(BLE_UUID_TEMPERATURE);
BLECharacteristic pressureCharacteristic(BLE_UUID_PRESSURE);
BLECharacteristic humidityCharacteristic(BLE_UUID_HUMIDITY);

const int NUM_SAMPLES = 50;  // Number of samples to average
float temperatureSum = 0.0;
float pressureSum = 0.0;
float humiditySum = 0.0;
int sampleCount = 0;

void setup() {
  Serial.begin(9600);

  if (!bme.begin(0x76)) {
    Serial.println("Could not find a valid BME280 sensor, check wiring!");
    while (1);
  }

  // Initialize BLE
  Bluefruit.begin();
  Bluefruit.setTxPower(4);    // Check for your board's valid power settings
  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  // Set up BLE service and characteristics
  bleService.begin();
  
  temperatureCharacteristic.setProperties(CHR_PROPS_READ | CHR_PROPS_NOTIFY);
  temperatureCharacteristic.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  temperatureCharacteristic.setFixedLen(4);
  temperatureCharacteristic.begin();

  pressureCharacteristic.setProperties(CHR_PROPS_READ | CHR_PROPS_NOTIFY);
  pressureCharacteristic.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  pressureCharacteristic.setFixedLen(4);
  pressureCharacteristic.begin();

  humidityCharacteristic.setProperties(CHR_PROPS_READ | CHR_PROPS_NOTIFY);
  humidityCharacteristic.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  humidityCharacteristic.setFixedLen(4);
  humidityCharacteristic.begin();

  // Start advertising BLE service
  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  Bluefruit.Advertising.addService(bleService);
  Bluefruit.setName("nRF52840");

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);    // Check for your board's valid interval settings
  Bluefruit.Advertising.setFastTimeout(30);      // number of seconds in fast mode
  Bluefruit.Advertising.start(0);                // 0 = Don't stop advertising

  Serial.println("-- BME280 Sensor Test --");

  // Set up oversampling and filter initialization
  bme.setSampling(Adafruit_BME280::MODE_NORMAL,
                  Adafruit_BME280::SAMPLING_X1, // temperature
                  Adafruit_BME280::SAMPLING_X1, // pressure
                  Adafruit_BME280::SAMPLING_X1, // humidity
                  Adafruit_BME280::FILTER_OFF);

  Serial.println("BME280 Sensor:");
}

void loop() {
  float temperature = bme.readTemperature();
  float pressure = bme.readPressure() / 100.0F; // Convert to hPa
  float humidity = bme.readHumidity();

  // Accumulate sums
  temperatureSum += temperature;
  pressureSum += pressure;
  humiditySum += humidity;
  sampleCount++;

  // Check if we've reached the desired number of samples
  if (sampleCount >= NUM_SAMPLES) {
    // Calculate averages
    float avgTemperature = temperatureSum / NUM_SAMPLES;
    float avgPressure = pressureSum / NUM_SAMPLES;
    float avgHumidity = humiditySum / NUM_SAMPLES;

    // Print averages to Serial
    Serial.print("Average Temperature: ");
    Serial.print(avgTemperature);
    Serial.print(" °C, Average Pressure: ");
    Serial.print(avgPressure);
    Serial.print(" hPa, Average Humidity: ");
    Serial.print(avgHumidity);
    Serial.println(" %");

    // Send averaged values over BLE
    temperatureCharacteristic.notify32((uint32_t)(avgTemperature * 100));
    pressureCharacteristic.notify32((uint32_t)(avgPressure * 100));
    humidityCharacteristic.notify32((uint32_t)(avgHumidity * 100));

    // Reset sums and sample count for next averaging cycle
    temperatureSum = 0.0;
    pressureSum = 0.0;
    humiditySum = 0.0;
    sampleCount = 0;
  }

  delay(1); // Wait 0.5 seconds between measurements
}

void connect_callback(uint16_t conn_handle) {
  Serial.println("Connected");
}

void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  Serial.println("Disconnected");
}
