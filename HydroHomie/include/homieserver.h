#ifndef HOMIESERVER_H
#define HOMIESERVER_H

// #include <PsychicHttp.h>
#include "HomieConfig.h"
#include "HomieManager.h"

class HomieServer {
public:
    HomieServer(PsychicHttpServer* server, HomieConfig* config, HomieManager* homieManager)
    : _server(server), _config(config), _homieManager(homieManager) {}

    void begin() {
        // Setting CORS headers for all responses
        DefaultHeaders::Instance().addHeader("Access-Control-Allow-Origin", "*");
        DefaultHeaders::Instance().addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        DefaultHeaders::Instance().addHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

        // Set up handlers for specific routes
        setupHandlers();

    }

private:
    PsychicHttpServer* _server;
    HomieConfig* _config;
    HomieManager* _homieManager; // Assuming this class exists

    bool isLocalIPAddress(IPAddress ip) {
        IPAddress localSubnet(255, 255, 255, 0);  // Your subnet mask
        IPAddress localIP = WiFi.localIP();
        return ((ip & localSubnet) == (localIP & localSubnet));
    }

    esp_err_t handleIpFilter(PsychicRequest *request) {
        if (!isLocalIPAddress(request->client()->remoteIP())) {
            return request->reply(403, "application/json", "{\"error\":\"Forbidden\"}");
        }
        return ESP_OK;
    }

    void setupHandlers() {
        // Handler for OPTIONS on any URL (general preflight handling)
        _server->on("/config", HTTP_OPTIONS, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            return request->reply(204); // No Content, but headers should be sent
        });

        // Handlers for specific routes
        _server->on("/config", HTTP_GET, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            return handleGetConfig(request);
        });

        // // Send a POST request to <IP>/post with a form field message set to <message>
        _server->on("/config", HTTP_POST, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            if (request->body().length() > 0) {
                // Update configuration using parsed JSON
                if (_config->setConfigFromJson(request->body())) {
                    return request->reply(200, "application/json", "{\"message\":\"Configuration updated successfully\"}");
                } else {
                    return request->reply(500, "application/json", "{\"error\":\"Failed to update configuration\"}");
                }
            } else {
                return request->reply(400, "application/json", "{\"error\":\"No JSON payload\"}");
            }
        });

        // // Send a POST request to <IP>/post with a form field message set to <message>
        // _server->on("/config", HTTP_OPTIONS, [this](AsyncWebServerRequest *request){
        //     Serial.println("Received request body");
        //     request->send(200, "text/plain", "Hello");
        // });

        // _server->onRequestBody([this](AsyncWebServerRequest *request, uint8_t *data, size_t len, size_t index, size_t total) {
        //     Serial.println("Received request body");
        //     // Check if the URL matches the endpoint for configuration update
        //     if (request->url() == "/config") {
        //         if (request->method() == HTTP_OPTIONS) {
        //             request->send(200);
        //         } else {
        //             request->send(404, "application/json", "{\"message\":\"Not found\"}");
        //         }
        //         // Ensure the entire request body is contained in the current call
        //         if (index + len == total) {
        //             JsonDocument doc; // Ensure JSON_DOCUMENT_SIZE is adequately sized for your JSON payload
        //             DeserializationError error = deserializeJson(doc, data, len);

        //             if (error) {
        //                 request->send(400, "application/json", "{\"error\":\"Failed to parse JSON\"}");
        //                 return;
        //             }

        //             // Assuming `HomieConfig` instance is accessible as `homieConfig` here
        //             // You might need to capture it with a lambda capture or make it globally accessible
        //             _config->setConfigFromJson(doc.as<String>());
        //             request->send(200, "application/json", "{\"message\":\"Configuration updated successfully\"}");
        //         }
        //     }
        // });

        

        _server->on("/status", HTTP_GET, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            return handleGetStatus(request);
        });

        _server->on("/history", HTTP_GET, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            return handleGetHistory(request);
        });

        _server->on("/water", HTTP_POST, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            _homieManager->forceStartWatering();
            return request->reply(200, "application/json", "{\"message\":\"Watering started\"}");
        });

        _server->on("/stop", HTTP_POST, [this](PsychicRequest *request) {
            auto res = handleIpFilter(request);
            if (res != ESP_OK) {
                return res;
            }
            _homieManager->forceStopWatering();
            return request->reply(200, "application/json", "{\"message\":\"Watering started\"}");
        });
    }

    esp_err_t handleGetConfig(PsychicRequest *request) {
        String configJson = _config->getConfigAsJson();
        return request->reply(200, "application/json", configJson.c_str());
    }


    esp_err_t handleGetStatus(PsychicRequest *request) {
        auto currentValues = _homieManager->getSensorManager()->getLastValue(); // Get the last sensor values
        const auto [tank, plant, dig]  = currentValues;

        DynamicJsonDocument doc(1024);
        doc["current_plant_level"] = plant;
        doc["current_water_level"] = tank;
        doc["is_watering"] = _homieManager->isWateringActive();
        doc["last_watering_time"] = _homieManager->getLastWateringStartTime();
        String output;
        serializeJson(doc, output);
        return request->reply(200, "application/json", output.c_str());
    }

    esp_err_t handleGetHistory(PsychicRequest *request) {
        auto history = _homieManager->getSensorManager()->getHistory();
        DynamicJsonDocument doc(4096);
        JsonArray array = doc.to<JsonArray>();
        for (const auto& entry : history) {
            JsonArray nestedArray = array.createNestedArray();
            const auto [tank, plant, dig] = entry;
            nestedArray.add(plant);
            nestedArray.add(tank);
        }
        String output;
        serializeJson(doc, output);
        return request->reply(200, "application/json", output.c_str());
    }
};

#endif // HOMIESERVER_H