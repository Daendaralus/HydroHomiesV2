#ifndef HOMIECONFIG_H
#define HOMIECONFIG_H

#include <Preferences.h>
#include <ArduinoJson.h> // Include the ArduinoJson library
#define JSON_DOCUMENT_SIZE 1024

class HomieConfig {
private:
    Preferences preferences;
    bool active = false;
    const String namespaceName = "homieConfig"; // Namespace for Preferences
    // In-memory cache
    struct ConfigCache {
        int watering_interval = 60*60;
        int watering_duration = 10*60;
        String name = "";
        int water_tank_threshold = 100;
        int plant_flood_buffer = 0;
    } cache;

public:
    HomieConfig() {}

    void begin() {
        preferences.begin(namespaceName.c_str(), false); // Initialize Preferences with namespace. RW-mode (false).
        active = true;
        // Load initial values into cache
        cache.watering_interval = preferences.getInt("watering_int", 0);
        cache.watering_duration = preferences.getInt("watering_dur", 0);
        cache.name = preferences.getString("name", "");
        cache.water_tank_threshold = preferences.getInt("w_tank_thr", 0);
        cache.plant_flood_buffer = preferences.getInt("plnt_fld_buff", 0);
    }

    void end() {
        preferences.end(); // Close the Preferences
        active = false;
    }

    void setWateringInterval(int interval) {
        cache.watering_interval = interval;
        preferences.putInt("watering_int", interval);
    }

    int getWateringInterval() {
        return cache.watering_interval;
    }

    void setWateringDuration(int duration) {
        cache.watering_duration = duration;
        preferences.putInt("watering_dur", duration);
    }

    int getWateringDuration() {
        return cache.watering_duration;
    }

    void setName(const String& name) {
        cache.name = name;
        preferences.putString("name", name);
    }

    String getName() {
        return cache.name;
    }

    void setWaterTankThreshold(int threshold) {
        cache.water_tank_threshold = threshold;
        preferences.putInt("w_tank_thr", threshold);
    }

    int getWaterTankThreshold() {
        return cache.water_tank_threshold;
    }

    void setPlantFloodBuffer(int buffer) {
        cache.plant_flood_buffer = buffer;
        preferences.putInt("plnt_fld_buff", buffer);
    }

    int getPlantFloodBuffer() {
        return cache.plant_flood_buffer;
    }

    bool setConfigFromJson(const String& jsonConfig) {
        if(!active) {
            begin();
        }
        StaticJsonDocument<JSON_DOCUMENT_SIZE> doc;
        DeserializationError error = deserializeJson(doc, jsonConfig);
        if (error) {
            Serial.print(F("deserializeJson() failed: "));
            Serial.println(error.c_str());
            return false; // Add appropriate error handling
        }
        // Assuming all configuration keys are known and fixed
        setName(doc["name"]);
        setWateringInterval(doc["watering_interval"]);
        setWateringDuration(doc["watering_duration"]);
        setWaterTankThreshold(doc["water_tank_threshold"]);
        setPlantFloodBuffer(doc["plant_flood_buffer"]);
        end();
        return true;
    }

    String getConfigAsJson() {
        StaticJsonDocument<JSON_DOCUMENT_SIZE> doc;

        doc["name"] = cache.name;
        doc["watering_interval"] = cache.watering_interval;
        doc["watering_duration"] = cache.watering_duration;
        doc["water_tank_threshold"] = cache.water_tank_threshold;
        doc["plant_flood_buffer"] = cache.plant_flood_buffer;

        String output;
        serializeJson(doc, output);
        return output;
    }
};

#endif // HOMIECONFIG_H