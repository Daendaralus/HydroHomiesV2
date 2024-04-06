from flask import Flask, jsonify, request
from flask_cors import CORS
import threading
import time, sys

# Import your SimulatedDevice class (assuming it's in a 'device.py' file)
from sim import SimulatedDevice

app = Flask(__name__)
CORS(app)
device = SimulatedDevice()  # Create a single instance of your device


def polling_task():
    global device
    while True:  # Adjust this loop if needed
        pdur = device.poll()
        time.sleep(pdur)  # Adjust the polling interval as needed


@app.route('/status')
def get_current_status():
    global device
    # Retrieve data from your device
    status = {
        'current_temp': device.current_temp,
        'current_water_level': device.current_water_level,
        'is_watering': device.is_watering,
        'last_watering_time': int(device.last_watering_time*1000.0)  # Might need formatting
    }
    return jsonify(status)


@app.route('/history')  # Add parameters for range/filtering if needed
def get_history():
    global device
    history_data = list(device.history)
    return jsonify(history_data)


@app.route('/config')
def get_config():
    global device
    return jsonify(device.get_config())


@app.route('/config', methods=['POST'])
def set_config():
    global device
    try:
        new_config = request.get_json()
        device.configure(new_config)
        return 'Config updated', 200  
    except ValueError as e:
        return f'Invalid configuration: {e}', 400  # Bad Request
    except Exception as e:
        return f'Error updating configuration: {e}', 500  # Internal server error

if __name__ == '__main__':
    polling_thread = threading.Thread(target=polling_task)
    polling_thread.start()
    app.run(port=sys.argv[1], debug=True) 
