#ifndef SENSORMANAGER_H
#define SENSORMANAGER_H

#include <Arduino.h>
#include <utility>
#include <numeric>
#include <vector>
#include <CircularBuffer.hpp>

#define HISTORY_LENGTH 1000
#define TEMP_BUFFER_LENGTH 10

class SensorManager {
private:
    const int digitalSensorPin;
    const int digitalSensorPowerPin;
    const int analogSensorPin;
    const int analogSensorPowerPin;

    CircularBuffer<std::pair<int, int>, HISTORY_LENGTH> history;
    CircularBuffer<std::pair<int, int>, TEMP_BUFFER_LENGTH> tempBuffer;
    std::pair<int,int> tmpar[TEMP_BUFFER_LENGTH];
    std::pair<int, int> last_value;

public:
    SensorManager(int digitalPin, int digitalPowerPin, int analogPin, int analogPowerPin)
    : digitalSensorPin(digitalPin), digitalSensorPowerPin(digitalPowerPin), 
      analogSensorPin(analogPin), analogSensorPowerPin(analogPowerPin) {
        pinMode(digitalSensorPin, INPUT);
        pinMode(digitalSensorPowerPin, OUTPUT);
        pinMode(analogSensorPin, INPUT);
        pinMode(analogSensorPowerPin, OUTPUT);
    }

    void activate() {
        // Power on the sensors
        digitalWrite(digitalSensorPowerPin, HIGH);
        digitalWrite(analogSensorPowerPin, HIGH);
    }

    void deactivate() {
        // Power off the sensors
        digitalWrite(digitalSensorPowerPin, LOW);
        digitalWrite(analogSensorPowerPin, LOW);
    }

    void readSensors(bool updateHistory = false, bool averageOut = false) {
        // Read sensor values
        int digitalValue = digitalRead(digitalSensorPin);
        int analogValue = analogRead(analogSensorPin);
        // Transform analog values to percentage
        analogValue = min(max(1000-map(analogValue, 1350, 2000, 0, 1000), (long)0), (long)1000);

        auto values = std::make_pair(analogValue, digitalValue);
        // Always update temp buffers
        tempBuffer.push(values);
        if (updateHistory) {
            // If it's time to update the history, calculate averages from temp buffers
            if (averageOut){
                std::pair<int,int> tmpar[TEMP_BUFFER_LENGTH];
                tempBuffer.copyToArray(tmpar);
                values = calculateAverage(tmpar);
                tempBuffer.clear();
                clearTmpar();
            }
            history.push(values);
        }
        last_value = values;
    }

    // Other public methods...

    std::pair<int, int> getLastValue() const {
        return last_value;
    }

private:
    std::pair<int, int> init = std::make_pair(0, 0);

    std::pair<int, int> calculateAverage(const std::pair<int,int> buffer[]) {
        std::pair<int, int> result = std::accumulate(buffer, buffer + TEMP_BUFFER_LENGTH, init,
        [](const std::pair<int, int>& acc, const std::pair<int, int>& val) {
            return std::make_pair(acc.first + val.first, acc.second + val.second);
        });
        result.first /= TEMP_BUFFER_LENGTH;
        result.second /= TEMP_BUFFER_LENGTH;
        result.second = result.second >=TEMP_BUFFER_LENGTH/2 ? 1 : 0;
        return result;
    }

    void clearTmpar(){
        for (int i = 0; i < TEMP_BUFFER_LENGTH; i++){
            tmpar[i] = std::make_pair(0,0);
        }
    }

    // Optional: Method to retrieve history. Adjust based on your needs.
public:
    std::vector<std::pair<int, int>> getHistory() const {
        std::vector<std::pair<int, int>> tmphistory(history.size());
        history.copyToArray(tmphistory.data());
        return tmphistory;
    }

};


#endif // !SENSORMANAGER_H