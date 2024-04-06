import time, random
from collections import deque

class SimulatedDevice:
    def __init__(self, config=None):
        self.default_config = {
            'watering_interval': 60,
            'watering_duration': 30,
            'name': f"HydroHomie{random.randint(1000, 9999)}"
        }
        self.configure(config)  # Apply configuration if provided
        self.current_temp = 20.0  # Initial values
        self.current_water_level = 50.0
        self.last_reading_time = time.time()
        self.last_history_dump = time.time()

        self.history = deque(maxlen=200)
        self.temp_buffer = []
        self.water_level_buffer = []

        self.is_watering = False
        self.last_watering_time = time.time() - self.watering_interval

    def configure(self, config=None):
        if config is None:
            config = self.default_config.copy()  # Use defaults if no config given

        # Load values with validation (optional)
        self.watering_interval = self._validate_int_config(config, 'watering_interval')
        self.watering_duration = self._validate_int_config(config, 'watering_duration')
        self.name = config.get('name', self.default_config['name'])

    def get_config(self):
        return {
            'watering_interval': self.watering_interval,
            'watering_duration': self.watering_duration,
            'name': self.name,
        }

    def _validate_int_config(self, config, key):
        value = config.get(key)
        if not isinstance(value, int) or value <= 0:
            raise ValueError(f"Invalid configuration: '{key}' must be a positive integer")
        return value
    
    def _update_sensors(self):
        # Placeholder for actual sensor reading logic 
        # ... For simulation, you might use random variations 
        self.current_water_level =  max(0, self.current_water_level - 0.05 + (random.uniform(-1, 1)*0.01))
        self.current_temp = max(18.0, min(22.0, self.current_temp + random.uniform(-0.1, 0.1)))
        self.last_reading_time = time.time()

        # Store values in temporary buffers during watering
        if self.is_watering:
            self.temp_buffer.append(self.current_temp)
            self.water_level_buffer.append(self.current_water_level)

    def _check_watering(self):
        if self.is_watering:
            if time.time() - self.last_watering_time > self.watering_duration:
                self.is_watering = False
                self.last_watering_time = time.time()
        else:
            if time.time() - self.last_watering_time > self.watering_interval:
                self.is_watering = True
                self.last_watering_time = time.time()
                

    def _add_to_history(self):
        if self.is_watering:
            temp_avg = sum(self.temp_buffer) / len(self.temp_buffer)
            water_level_avg = sum(self.water_level_buffer) / len(self.water_level_buffer)
            self.temp_buffer.clear()
            self.water_level_buffer.clear()
        else:
            temp_avg = self.current_temp
            water_level_avg = self.current_water_level
        print((temp_avg, water_level_avg))
        self.history.append((temp_avg, water_level_avg))

    def poll(self):
        self._update_sensors()
        self._check_watering()

        if self.is_watering:
            polling_interval = 0.1  # 100ms
        else:
            polling_interval = 60.0  # 1 minute
        if time.time() - self.last_history_dump >= 60:
            self._add_to_history()
            self.last_history_dump = time.time()
        return polling_interval

