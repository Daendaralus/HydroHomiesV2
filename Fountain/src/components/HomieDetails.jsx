import React, { useState, useEffect, useRef } from 'react';
import { TextField, Button, Typography, Box, Grid, LinearProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import Chart from 'chart.js/auto';
import 'chartjs-adapter-date-fns'; // Import this adapter


const calculateTimeUntilNextWatering = (homie) => {
  // Assuming last_watering_time is a Date object or similar
  const lastWateringTime = new Date(homie.last_watering_time*1000);
  const nextWateringTime = new Date(lastWateringTime.getTime() + homie.watering_interval * 1000);
  const currentTime = new Date();
  return Math.max(0, nextWateringTime - currentTime);
};

const calculateRemainingWateringDuration = (homie) => {
  const lastWateringTime = new Date(homie.last_watering_time*1000);
  const wateringEndTime = new Date(lastWateringTime.getTime() + homie.watering_duration * 1000);
  const currentTime = new Date();
  return Math.max(0, wateringEndTime - currentTime);
};

const formatTime = (ms) => {
  let seconds = Math.floor(ms / 1000);
  let minutes = Math.floor(seconds / 60);
  let hours = Math.floor(minutes / 60);

  seconds = seconds % 60;
  minutes = minutes % 60;

  // Pad to 2 digits
  hours = String(hours).padStart(2, '0');
  minutes = String(minutes).padStart(2, '0');
  seconds = String(seconds).padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
};

const HomieDetails = ({ homie, homieUpdateCallback }) => {
  const [history, setHistory] = useState([]);
  const [editName, setEditName] = useState(false);
  const [localName, setLocalName] = useState(homie?.name || homie.ip);
  const [timeUntilNextWatering, setTimeUntilNextWatering] = useState(calculateTimeUntilNextWatering(homie));
  const [remainingWateringDuration, setRemainingWateringDuration] = useState(calculateRemainingWateringDuration(homie));
  const [shouldSubmit, setShouldSubmit] = useState(false);
  const chartRef = useRef(null);  // Ref to hold the chart instance
  const chartRef2 = useRef(null);  // Ref to hold the chart instance

  const [config, setConfig] = useState({
    name: localName,
    watering_duration: homie.watering_duration || 30,
    watering_interval: homie.watering_interval || 60,
  });

  useEffect(() => {
    const fetchHistory = async () => {
        const response = await fetch(`http://${homie.ip}/history`); // Assuming each homie has a unique ID
        const data = await response.json();
        setHistory(data);
        const waterdata = data.map((entry, index) => ({
          time: new Date(new Date().getTime() - ((data.length - index) * 60 * 1000)),  // Subtract minutes
          value: entry[1] / 10.0
        }));
        const plantdata = data.map((entry, index) => ({
          time: new Date(new Date().getTime() - ((data.length - index) * 60 * 1000)),  // Subtract minutes
          value: entry[0] / 10.0
        }));  
        // if (chartRef.current === null) {
          initializeChart(waterdata, 'waterChart', chartRef);
          initializeChart(plantdata, 'plantChart', chartRef2);
        // }
    };

    fetchHistory();
    setConfig({
      name: localName,
      watering_duration: config.watering_duration || homie.watering_duration || 30,
      watering_interval: config.watering_interval || homie.watering_interval || 60,
    });
  }, [homie.ip]); // Refetch when homie changes

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the state for countdowns

      setTimeUntilNextWatering(calculateTimeUntilNextWatering(homie));
      setRemainingWateringDuration(calculateRemainingWateringDuration(homie));
    }, 1000);
  
    return () => clearInterval(intervalId);
  }, [homie.last_watering_time, homie.watering_interval, homie.watering_duration, homie.is_watering]);
  
  useEffect(() => {
    if (chartRef.current && homie.current_water_level !== undefined) {
      const newLevel = {
        x: new Date(),  // Use current date for the new data point
        y: homie.current_water_level / 10.0
      };
      addDataToChart(newLevel, chartRef);
    }
  }, [homie.current_water_level]);
  
  useEffect(() => {
    if (chartRef2.current && homie.current_plant_level !== undefined) {
      const newLevel = {
        x: new Date(),  // Use current date for the new data point
        y: homie.current_plant_level / 10.0
      };
      addDataToChart(newLevel, chartRef2);
    }
  }, [homie.current_plant_level]);
  
  // UseEffect to handle the form submission
  useEffect(() => {
    if (shouldSubmit) {
      handleSubmit();
      setShouldSubmit(false);  // Reset the flag after submitting
    }
  }, [config]);  // Now this only runs when config changes and submission is required

  const addDataToChart = (newData, chartref) => {
    const chart = chartRef.current;
    chart.data.datasets[0].data.push(newData);
    chart.update();
  };


  const chartDataSpillSensor = {
    labels: history.map((_, index) => `${index + 1} min ago`).reverse(),
    datasets: [
        {
            label: 'Triggered',
            data: history.map(entry => entry[0]),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
    ],
  };


  // Initialize chart with historical data
  const initializeChart = (historicalData, chartname, chartref) => {
    const ctx = document.getElementById(chartname).getContext('2d');    
    // Check if chart instance already exists
    if (chartref.current !== null) {
      chartref.current.destroy(); // Destroy the existing chart instance
    }

    chartref.current = new Chart(ctx, {
      type: 'line',
      data: {
        // labels: historicalData.map((_, index) => `${index + 1} min ago`).reverse(),
        datasets: [{
          label: 'Water Level (%)',
          data: historicalData.map(entry => ({x: entry.time, y: entry.value})),
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
          fill: 'start',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            time: {
              unit: 'minute',
              displayFormats: {
                minute: 'h:mm a'
              }
            },
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            min: 0,
            max: 100,
            title: {
              display: true,
              text: 'Water Level (%)'
            }
          }
        }
      }
    });
  };


  const handleChangeDuration = (e) => {
    if (e.target.value !== '' && !isNaN(e.target.value)) {
      setConfig({ ...config, [e.target.name]: parseInt(e.target.value)*60 });
    }
    else {
      setConfig({ ...config, [e.target.name]: 0 });
    }
  };


  const handleChangeInterval = (e) => {
    if (e.target.value !== '' && !isNaN(e.target.value)) {
      setConfig({ ...config, [e.target.name]: parseInt(e.target.value)*60 });
    }
    else {
      setConfig({ ...config, [e.target.name]: 0 });
    }
  };

  const handleForceWatering = async () => {
    try {
      const response = await fetch(`http://${homie.ip}/water`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to force watering:', error);
    }
  };

  const handleForceStopWatering = async () => {
    try {
      const response = await fetch(`http://${homie.ip}/stop`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to force stop watering:', error);
    }
  };


  const handleSubmit = async () => {
    // Perform validation, then update
    try {
      const response = await fetch(`http://${homie.ip}/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Update config in homie object
      homieUpdateCallback(homie.ip, config);
      // Handle a successful response
      console.log('Config updated successfully');
      // Here you can also update the local state to reflect the successful update
      // or trigger a re-fetch of the homie data to get the updated config
  
    } catch (error) {
      // Handle any errors here
      console.error('Failed to update config:', error);
    }
  };
// Calculate the progress as a percentage
  const wateringProgress = (remainingWateringDuration / (homie.watering_duration * 1000)) * 100;
  const nextWateringProgress = ((homie.watering_interval * 1000 - timeUntilNextWatering) / (homie.watering_interval * 1000)) * 100;
  
  return (
    <Box sx={{pl:2, pt:2}}>
            <Typography variant="h4" gutterBottom>
        {editName ? (
          <TextField
            size="small"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={() => {
              setEditName(false);
              if (localName !== homie.name) {
                // The name has changed - call the update function here
                setConfig({ ...config, name: localName });
                setShouldSubmit(true);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditName(false);
                if (localName !== homie.name) {
                  // The name has changed - call the update function here
                  setConfig({ ...config, name: localName });
                  setShouldSubmit(true);
                }
              }
            }}
            autoFocus
          />
        ) : (
          <span onClick={() => setEditName(true)}>{localName}</span>
        )}
      </Typography>
    <Grid container spacing={2}
    justifyContent="center"
    alignItems="flex-start"
    sx={{mt:1}}>

      <Grid item xs={12}>
      <Box sx={{ height: '300px', width: '100%', mb: 4, pr:2 }}>
      <canvas id="waterChart"></canvas>
        {/* <Line data={chartDataWater} options={{ 
          responsive: true,
          maintainAspectRatio: false,
            scales: {
                x: {
                    reverse: false, // Ensures the chart displays oldest to newest from left to right
                },
                y: {
                    min: 0,
                    max: 100,
                }
            }
        }} /> */}

        </Box>
      </Grid>
      <Grid item xs={12}>
      <Box sx={{ height: '300px', width: '100%', mb: 4, pr:2 }}>
      <canvas id="plantChart"></canvas>
        {/* <Line data={chartDataWater} options={{ 
          responsive: true,
          maintainAspectRatio: false,
            scales: {
                x: {
                    reverse: false, // Ensures the chart displays oldest to newest from left to right
                },
                y: {
                    min: 0,
                    max: 100,
                }
            }
        }} /> */}

        </Box>
      </Grid>
      {/* <Grid item xs={12}>
      <Box sx={{ height: '300px', width: '100%', mb: 4, pr:2 }}>
        <Line data={chartDataSpillSensor} options={{ 
          responsive: true,
          maintainAspectRatio: false,
            scales: {
                x: {
                    reverse: false, // Ensures the chart displays oldest to newest from left to right
                },
                y: {
                    min: 0,
                    max: 1,
                }
            }
        }} />

        </Box>
      </Grid> */}
      <Grid item xs={12}>
      <Box sx={{ width: '100%', pr: 2 }}>
        <Typography variant="body2">
          {homie.is_watering
          ? `Hydrating: ${formatTime(remainingWateringDuration)} remaining`
          : `Hydrating in: ${formatTime(timeUntilNextWatering)}`}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={homie.is_watering ? wateringProgress : nextWateringProgress} />
      </Box>
      </Grid>
      {/* Configuration Fields */}
      <Grid item xs="auto">
      <TextField
        label="Watering Duration (minutes)"
        variant="outlined"
        size="small"
        name="watering_duration"
        value={config.watering_duration/60.0}
        onChange={handleChangeDuration}
        fullWidth
        margin="dense"
      />
      </Grid>
      <Grid item xs="auto">
      <TextField
        label="Watering Interval (minutes)"
        variant="outlined"
        size="small"
        name="watering_interval"
        value={config.watering_interval/60.0}
        onChange={handleChangeInterval}
        fullWidth
        margin="dense"
      />
      </Grid>
      <Grid item xs={12} sx={{mt: 2, pr: 2}}>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        fullWidth
        margin="dense"
        sx={{ py: 1}}
      >
        Update Configuration
      </Button>
      </Grid>
      <Grid item xs={6} sx={{mt: 2, pr: 2}}>
      <Button
        variant="contained"
        color="secondary"
        onClick={handleForceWatering}
        margin="dense"
        fullWidth
        sx={{ py: 1}}
      >
        Force Watering
      </Button>
      </Grid>    
      <Grid item xs={6} sx={{mt: 2, pr: 2, mb:2}}>
      <Button
        variant="contained"
        color="error"
        onClick={handleForceStopWatering}
        margin="dense"
        fullWidth
        sx={{ py: 1}}
      >
        Stop Watering
      </Button>
      </Grid>
    </Grid>


    </Box>
  );
};

export default HomieDetails;
