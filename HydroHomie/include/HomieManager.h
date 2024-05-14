#ifndef HOMIEMANAGER_H
#define HOMIEMANAGER_H

#include <Arduino.h>
#include "SensorManager.h"
#include "HomieConfig.h"
#include <time.h>

class HomieManager {
private:
    SensorManager& sensorManager;
    HomieConfig& config;
    unsigned long lastPollTime = 0;
    unsigned long lastHistoryUpdateTime = 0;
    unsigned long lastWateringStartTime = 0;
    time_t lastWateringStartTimestamp = 0;
    bool isWatering = false;
    const unsigned int pumpPin;
    const unsigned long historyUpdateInterval = 60000; // 1 minute in milliseconds
    const unsigned long pollInterval = 10000; // Regular polling interval in milliseconds
    bool useDigitalSensor = false;
    unsigned int readCount = 0;

public:
    HomieManager(SensorManager& sensorMgr, HomieConfig& cfg, unsigned int pumpPin, bool useDigitalSensor = false)
    : sensorManager(sensorMgr), config(cfg), pumpPin(pumpPin), useDigitalSensor(useDigitalSensor) {
        pinMode(pumpPin, OUTPUT);
        digitalWrite(pumpPin, LOW); // Ensure pump is off initially
    }

    SensorManager* getSensorManager() {
        return &sensorManager;
    }

    bool isWateringActive() {
        return isWatering;
    }

    unsigned long getLastWateringStartTime() {
        return lastWateringStartTimestamp;
    }

    void forceStartWatering() {
        Serial.println("Starting watering");
        isWatering = true;
        lastWateringStartTime = millis();
        time(&lastWateringStartTimestamp);
    }

    void forceStopWatering() {
        Serial.println("Stopping watering");
        isWatering = false;
    }

    void handle() {
        unsigned long currentTime = millis();
        unsigned long wateringInterval = static_cast<unsigned long>(config.getWateringInterval()) * 1000; // Convert seconds to milliseconds
        unsigned long wateringDuration = static_cast<unsigned long>(config.getWateringDuration()) * 1000; // Convert seconds to milliseconds

        bool updateHistory = (currentTime - lastHistoryUpdateTime) >= historyUpdateInterval;
        unsigned long pollIntervalCurrent = isWatering ? 500 : pollInterval; // If watering, poll more frequently
        // Check if it's time for regular sensor polling
        if (currentTime - lastPollTime >= pollIntervalCurrent) { // Convert minutes to milliseconds
            lastPollTime = currentTime;

            // Activate sensors, read multiple times, then deactivate
            sensorManager.activate();
            // delay(25);
            for (readCount = 0; readCount < 5; readCount++) {
                sensorManager.readSensors(readCount == 4 && updateHistory, readCount == 4); // Average out on the final read
                if(readCount < 4){
                    delay(5); // Wait 10ms between reads
                }
            }
            sensorManager.deactivate();

            
            // Update history if the interval has elapsed
            if (updateHistory) {
                lastHistoryUpdateTime = currentTime;
            }

        }
        // Manage watering based on interval and duration
        if(lastWateringStartTime == 0 && lastWateringStartTimestamp == 0){
            time(&lastWateringStartTimestamp);
        }
        if (!isWatering && currentTime - lastWateringStartTime >= wateringInterval) {
            // Start watering
            Serial.println("Starting watering");
            isWatering = true;
            lastWateringStartTime = currentTime; // Reset the watering start time
            time(&lastWateringStartTimestamp);
        } else if (isWatering && currentTime - lastWateringStartTime >= wateringDuration) {
            // Stop watering after the duration
            
            Serial.println("Stopping watering");
            isWatering = false;
        }

        manageWatering();
    }

private:
    void manageWatering() {
        // Retrieve sensor thresholds and current water level
        int waterTankThreshold = config.getWaterTankThreshold(); // For the water tank
        auto currentValues = sensorManager.getLastValue(); // Get the last sensor values
        const auto [currentTankLevel, currentPlantLevel, digitalSensorStatus] = currentValues;
        // Serial.print("currentTankLevel: ");
        // Serial.println(currentTankLevel);
        // Serial.print("currentPlantLevel: ");
        // Serial.println(currentPlantLevel);
        // Serial.print("digitalSensorStatus: ");
        // Serial.println(digitalSensorStatus);
        // Serial.println(isWatering);
        // int currentWaterLevel = currentValues.first; // Analog sensor value (0-1000)
        // int digitalSensorStatus = currentValues.second; // Digital sensor status (0 or 1)
        bool digitalSensorBool = useDigitalSensor ? digitalSensorStatus == 0 : true;
        bool shouldPump = currentTankLevel > waterTankThreshold && digitalSensorBool && currentPlantLevel <= 400;
        // Logic to control watering based on water level and digital sensor status
        // Serial.print("shouldPump: ");
        // Serial.println(shouldPump);
        if (isWatering && shouldPump) {
            // Start watering if below threshold and not already watering
            digitalWrite(pumpPin, HIGH);
            delay(50); // Wait for pump to ramp up
        } 
        if (!isWatering || !shouldPump ){//(currentTankLevel <= waterTankThreshold || (useDigitalSensor ? digitalSensorStatus == 1 : false)|| currentPlantLevel > 800)) {
            // Stop watering if water level is sufficient or if digital sensor in the pot is triggered
            digitalWrite(pumpPin, LOW);
            // Serial.println("killing pump");
        }
    }
};

#endif // HOMIEMANAGER_H
