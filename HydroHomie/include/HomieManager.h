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
    time_t lastWateringStartTimestamp;
    bool isWatering = false;
    const unsigned int pumpPin;
    const unsigned long historyUpdateInterval = 60000; // 1 minute in milliseconds
    const unsigned long pollInterval = 10000; // Regular polling interval in milliseconds

    unsigned int readCount = 0;

public:
    HomieManager(SensorManager& sensorMgr, HomieConfig& cfg, unsigned int pumpPin)
    : sensorManager(sensorMgr), config(cfg), pumpPin(pumpPin) {
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
            delay(50);
            for (readCount = 0; readCount < 5; readCount++) {
                sensorManager.readSensors(readCount == 4 && updateHistory, readCount == 4); // Average out on the final read
                if(readCount < 4){
                    delay(10); // Wait 10ms between reads
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
        int waterLevelThreshold = config.getWaterTankThreshold(); // For the water tank
        auto currentValues = sensorManager.getLastValue(); // Get the last sensor values
        int currentWaterLevel = currentValues.first; // Analog sensor value (0-1000)
        int digitalSensorStatus = currentValues.second; // Digital sensor status (0 or 1)
        bool shouldPump = currentWaterLevel > waterLevelThreshold && digitalSensorStatus == 0;
        // Logic to control watering based on water level and digital sensor status
        if (isWatering && shouldPump) {
            // Start watering if below threshold and not already watering
            digitalWrite(pumpPin, HIGH);
        } 
        if ((currentWaterLevel <= waterLevelThreshold || digitalSensorStatus == 1) || !isWatering) {
            // Stop watering if water level is sufficient or if digital sensor in the pot is triggered
            digitalWrite(pumpPin, LOW);
        }
    }
};

#endif // HOMIEMANAGER_H
