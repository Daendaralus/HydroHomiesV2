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
    const int analogSensor1PowerPin;
    const int analogSensor1Pin;
    const int analogSensorPin;
    const int analogSensorPowerPin;
    const bool keepSensorsPowered;

    CircularBuffer<std::tuple<int, int, int>, HISTORY_LENGTH> history;
    CircularBuffer<std::tuple<int, int, int>, TEMP_BUFFER_LENGTH> tempBuffer;
    std::tuple<int, int, int> tmpar[TEMP_BUFFER_LENGTH];
    std::tuple<int, int, int> last_value;

public:
    SensorManager(int digitalPin, int digitalPowerPin,int analogPin, int analogPowerPin, int analogPin1, int analogPowerPin1, bool keepSensorsPowered = false)
    : digitalSensorPin(digitalPin), digitalSensorPowerPin(digitalPowerPin), 
      analogSensorPin(analogPin), analogSensorPowerPin(analogPowerPin), analogSensor1Pin(analogPin1), analogSensor1PowerPin(analogPowerPin1), keepSensorsPowered(keepSensorsPowered) {
        // pinMode(digitalSensorPin, INPUT);
        // pinMode(digitalSensorPowerPin, OUTPUT);
        pinMode(analogSensorPin, INPUT);
        pinMode(analogSensorPowerPin, OUTPUT);
        pinMode(analogSensor1Pin, INPUT);
        pinMode(analogSensor1PowerPin, OUTPUT);
        activate();
    }

    void activate() {
        // Power on the sensors
        // digitalWrite(digitalSensorPowerPin, HIGH);
        digitalWrite(analogSensorPowerPin, HIGH);
        digitalWrite(analogSensor1PowerPin, HIGH);
    }

    void deactivate() {
        // Power off the sensors
        if(keepSensorsPowered) return;
        // digitalWrite(digitalSensorPowerPin, LOW);
        digitalWrite(analogSensorPowerPin, LOW);
        digitalWrite(analogSensor1PowerPin, LOW);
    }

    void readSensors(bool updateHistory = false, bool averageOut = false) {
        // Read sensor values
        int digitalValue = 0;//digitalRead(digitalSensorPin);
        int analogValue = analogRead(analogSensorPin);
        int analogValue1 = analogRead(analogSensor1Pin);

        // Transform analog values to percentage
        analogValue = min(max(1000-map(analogValue, 1350, 2000, 0, 1000), (long)0), (long)1000);
        analogValue1 = min(max(1000-map(analogValue1, 1350, 2000, 0, 1000), (long)0), (long)1000);

        auto values = std::make_tuple(analogValue, analogValue1, digitalValue);
        // Always update temp buffers
        tempBuffer.push(values);
        if (updateHistory) {
            // If it's time to update the history, calculate averages from temp buffers
            if (averageOut){
                std::tuple<int, int, int> tmpar[TEMP_BUFFER_LENGTH];
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

    std::tuple<int, int, int> getLastValue() const {
        return last_value;
    }

private:
    std::tuple<int, int, int> init = std::make_tuple(0, 0, 0);

    std::tuple<int, int, int> calculateAverage(const std::tuple<int, int, int> buffer[]) {
        std::tuple<int, int, int> result = std::accumulate(buffer, buffer + TEMP_BUFFER_LENGTH, init,
        [](const std::tuple<int, int, int>& acc, const std::tuple<int, int, int>& val) {
            const auto [acc_a1, acc_a2, acc_d] = acc;
            const auto [val_a1, val_a2, val_d] = val;
            return std::make_tuple(acc_a1 + val_a1, acc_a2 + val_a2, acc_d + val_d);
        });
        const auto [a1, a2, d] = result;
        return {a1/TEMP_BUFFER_LENGTH, a2/TEMP_BUFFER_LENGTH, d>=TEMP_BUFFER_LENGTH/2 ? 1 : 0};
    }

    void clearTmpar(){
        for (int i = 0; i < TEMP_BUFFER_LENGTH; i++){
            tmpar[i] = std::make_tuple(0, 0, 0);
        }
    }

    // Optional: Method to retrieve history. Adjust based on your needs.
public:
    std::vector<std::tuple<int, int, int>> getHistory() const {
        std::vector<std::tuple<int, int, int>> tmphistory(history.size());
        history.copyToArray(tmphistory.data());
        return tmphistory;
    }

};


#endif // !SENSORMANAGER_H