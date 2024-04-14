#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h> // https://github.com/tzapu/WiFiManager
#include <PsychicHttp.h>
#include <time.h>
#include <ArduinoOTA.h>
#include <CircularBuffer.hpp>

#include "homieconfig.h"
#include "homieserver.h"
#include "sensormanager.h"
#include "HomieManager.h"
#include "secrets.h"

#define RESISTIVE_SENSOR_PIN IO17  // GPIO pin connected to the resistive water sensor
#define CAPACITIVE_SENSOR_PIN IO35 // GPIO pin connected to the capacitive water sensor
#define CAPACITIVE_OUTPUT_PIN IO26 // GPIO pin connected to the capacitive water sensor output
#define RESISTIVE_OUTPUT_PIN IO25  // GPIO pin connected to the resistive water sensor output

#define PUMP_RELAY_PIN IO14        // GPIO pin connected to the relay controlling the pump

PsychicHttpServer server; // HTTP server on port 80
HomieConfig config;
SensorManager sensorManager(RESISTIVE_SENSOR_PIN, RESISTIVE_OUTPUT_PIN, CAPACITIVE_SENSOR_PIN, CAPACITIVE_OUTPUT_PIN);
HomieManager homieManager(sensorManager, config, PUMP_RELAY_PIN);
HomieServer homieServer(&server, &config, &homieManager);

void initializeTime() {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    // If you need to set a timezone, you can do it with configTime
    // Example for GMT+1: configTime(3600, 3600, "pool.ntp.org");
    Serial.println("Waiting for time");
    while (!time(nullptr)) {
        Serial.print(".");
        delay(1000);
    }
    Serial.println("Time synchronized");
}


void setup() {
  Serial.begin(115200); // Start serial communication at 115200 baud
  // pinMode(PUMP_RELAY_PIN, OUTPUT); // Set the pump relay pin as an output
  // digitalWrite(PUMP_RELAY_PIN, LOW); // Ensure the pump is off initially
  // pinMode(CAPACITIVE_OUTPUT_PIN, OUTPUT); // Set the capacitive sensor output pin as an output
  // pinMode(RESISTIVE_OUTPUT_PIN, OUTPUT); // Set the resistive sensor output pin as an output
  // digitalWrite(CAPACITIVE_OUTPUT_PIN, LOW); // Set the capacitive sensor output pin to HIGH
  // digitalWrite(RESISTIVE_OUTPUT_PIN, LOW); // Set the resistive sensor output pin to HIGH
  // pinMode(RESISTIVE_SENSOR_PIN, INPUT);
  config.begin();
  config.end();
  String mac = WiFi.macAddress();
  String apSuffix = mac.substring(mac.length() - 5, mac.length()); // Last 5 characters include 4 hex digits and a colon
  apSuffix.replace(":", ""); // Remove the colon, leaving just the last 4 hex digits
  String apName = config.getName() !="" ? config.getName() : "HydroHomie-" + apSuffix;
  WiFiManager wifiManager;
  wifiManager.autoConnect(apName.c_str());
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  Serial.println("connected...let's hydrate!");
  initializeTime();
  server.listen(80); // Start the HTTP server on port 80
  server.on("/",  HTTP_GET, [](PsychicRequest *request) {
    return request->reply(200, "text/plain", "Hello, world");
  });

  // construct homieserver
  homieServer.begin();


  // // Example of adding CORS headers
  // DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
  // DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  // DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Content-Type");
  // // ESPAsyncElegantOTA
  // ElegantOTA.begin(&server); // Start ElegantOTA
  Serial.println("HTTP server started");  

  // Initialize OTA
  ArduinoOTA.setPassword(otapwd);
  ArduinoOTA.begin();
}

void loop() {
  ArduinoOTA.handle();  // Listen for OTA events
  // ElegantOTA.loop();
  homieManager.handle();
}