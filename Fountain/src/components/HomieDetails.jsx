import React, { useState, useEffect } from 'react';
import { TextField, Button, Typography, Box, Grid, LinearProgress } from '@mui/material';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';


const calculateTimeUntilNextWatering = (homie) => {
  // Assuming last_watering_time is a Date object or similar
  const lastWateringTime = new Date(homie.last_watering_time);
  const nextWateringTime = new Date(lastWateringTime.getTime() + homie.watering_interval * 1000);
  const currentTime = new Date();
  return Math.max(0, nextWateringTime - currentTime);
};

const calculateRemainingWateringDuration = (homie) => {
  const lastWateringTime = new Date(homie.last_watering_time);
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

const HomieDetails = ({ homie }) => {
  const [history, setHistory] = useState([]);
  const [editName, setEditName] = useState(false);
  const [localName, setLocalName] = useState(homie?.name);
  const [timeUntilNextWatering, setTimeUntilNextWatering] = useState(calculateTimeUntilNextWatering(homie));
  const [remainingWateringDuration, setRemainingWateringDuration] = useState(calculateRemainingWateringDuration(homie));

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
    };

    fetchHistory();
    setConfig({
      name: localName,
      watering_duration: homie.watering_duration || 30,
      watering_interval: homie.watering_interval || 60,
    });
  }, [homie]); // Refetch when homie changes

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Update the state for countdowns

      setTimeUntilNextWatering(calculateTimeUntilNextWatering(homie));
      setRemainingWateringDuration(calculateRemainingWateringDuration(homie));
    }, 1000);
  
    return () => clearInterval(intervalId);
  }, [homie.last_watering_time, homie.watering_interval, homie.watering_duration, homie.is_watering]);
  

  const chartDataTemp = {
    labels: history.map((_, index) => `${index + 1} min ago`).reverse(),
    datasets: [
        {
            label: 'Temperature (°C)',
            data: history.map(entry => entry[0]),
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
        }
    ],
  };

  const chartDataWater = {
    labels: history.map((_, index) => `${index + 1} min ago`).reverse(),
    datasets: [
        {
            label: 'Water Level (%)',
            data: history.map(entry => entry[1]),
            borderColor: 'rgb(53, 162, 235)',
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
            fill: 'start'
        }
    ],
  };

  const handleChangeDuration = (e) => {
    setConfig({ ...config, [e.target.name]: parseInt(e.target.value) });
  };


  const handleChangeInterval = (e) => {
    setConfig({ ...config, [e.target.name]: parseInt(e.target.value)*60 });
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
                handleSubmit()
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setEditName(false);
                if (localName !== homie.name) {
                  // The name has changed - call the update function here
                  setConfig({ ...config, name: localName });
                  handleSubmit()
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
        <Line data={chartDataWater} options={{ 
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
        }} />

        </Box>
      </Grid>
      <Grid item xs={12}>
      <Box sx={{ height: '300px', width: '100%', mb: 4, pr:2 }}>
        <Line data={chartDataTemp} options={{ 
          responsive: true,
          maintainAspectRatio: false,
            scales: {
                x: {
                    reverse: false, // Ensures the chart displays oldest to newest from left to right
                }
            }
        }} />

        </Box>
      </Grid>
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
        label="Watering Duration (seconds)"
        variant="outlined"
        size="small"
        name="watering_duration"
        value={config.watering_duration}
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
    </Grid>

    </Box>
  );
};

export default HomieDetails;
