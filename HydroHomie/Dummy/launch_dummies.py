import subprocess
import os, sys

# Number of dummy instances you want to run
NUM_DUMMIES = 5

# Starting port number
START_PORT = 5000

# Environment setup for Flask app
base_env = os.environ.copy()
base_env["FLASK_APP"] = "app.py"
base_env["FLASK_ENV"] = "development"

processes = []

for i in range(NUM_DUMMIES):
    port = START_PORT + i
    env = base_env.copy()
    env["PORT"] = str(port)
    # Start the Flask app
    process = subprocess.Popen([sys.executable, "app.py", str(port)], env=env)
    processes.append(process)
    print(f"Started dummy instance on port {port}")

# Wait for all processes to complete
try:
    for process in processes:
        process.wait()
except KeyboardInterrupt:
    # Terminate all processes if the script is stopped
    for process in processes:
        process.terminate()
    print("Stopped all dummy instances.")
