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

#define RESISTIVE_SENSOR_PIN 21  // GPIO pin connected to the resistive water sensor
#define CAPACITIVE_SENSOR_PIN 35 // GPIO pin connected to the capacitive water sensor
#define CAPACITIVE_SENSOR1_PIN 34 // GPIO pin connected to the capacitive water sensor
#define CAPACITIVE_OUTPUT_PIN 19 // GPIO pin connected to the capacitive water sensor output
#define RESISTIVE_OUTPUT_PIN 22  // GPIO pin connected to the resistive water sensor output

#define PUMP_RELAY_PIN 23        // GPIO pin connected to the relay controlling the pump

PsychicHttpServer server; // HTTP server on port 80
HomieConfig config;
WiFiManager wifiManager;
SensorManager sensorManager(RESISTIVE_SENSOR_PIN, RESISTIVE_OUTPUT_PIN, 
CAPACITIVE_SENSOR_PIN, CAPACITIVE_OUTPUT_PIN,
CAPACITIVE_SENSOR1_PIN, CAPACITIVE_OUTPUT_PIN, true);
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

String getAPName(){
  String mac = WiFi.macAddress();
  String apSuffix = mac.substring(mac.length() - 5, mac.length()); // Last 5 characters include 4 hex digits and a colon
  apSuffix.replace(":", ""); // Remove the colon, leaving just the last 4 hex digits
  String apName = config.getName() !="" ? config.getName() : "HydroHomie-" + apSuffix;
  return apName;
}


void setup() {
  WiFi.setTxPower(WIFI_POWER_19_5dBm);
  Serial.begin(115200); // Start serial communication at 115200 baud
  config.begin();
  config.end();


  wifiManager.setWiFiAutoReconnect(true);
  wifiManager.setConnectTimeout(60);
  wifiManager.setConnectRetries(5);
  wifiManager.setConfigPortalTimeout(180);
  wifiManager.autoConnect(getAPName().c_str());
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
  if (WiFi.status() != WL_CONNECTED) {
     if (wifiManager.getWiFiIsSaved()) 
      wifiManager.setEnableConfigPortal(false);
    wifiManager.setConnectTimeout(10);
    wifiManager.setConnectRetries(1);
    wifiManager.autoConnect(getAPName().c_str());
    if (WiFi.status() == WL_CONNECTED){
      initializeTime();
    }
  }
  ArduinoOTA.handle();  // Listen for OTA events
  homieManager.handle();
}