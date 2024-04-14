// src/components/DeviceCard.jsx 
import React, {useState, useEffect} from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import {Box, List, ListItem, ListItemIcon} from '@mui/material';
import WaterIcon from '@mui/icons-material/LocalDrink';
import OpacityIcon from '@mui/icons-material/Opacity'; // For water level
import ThermostatIcon from '@mui/icons-material/Thermostat'; // For temperature
import Divider from '@mui/material/Divider';

const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const getTemperatureColor = (temperature) => {
  // Define your colors in RGB
  const red = [255, 0, 0]; // Red for 30°C or above
  const neutral = [0, 255, 255]; // Neutral, light blue for example
  const purple = [128, 0, 128]; // Purple for 0°C
  let resultColor;

  if (temperature >= 20 && temperature <= 30) {
    // Temperatures in the 20s towards red
    const mix = (temperature - 20) / 10; // Normalize between 0 and 1
    resultColor = neutral.map((component, index) => 
      Math.round(component + (red[index] - component) * mix)
    );
  } else if (temperature < 20 && temperature >= 0) {
    // Temperatures below 20 towards purple
    const mix = temperature / 20; // Normalize between 0 and 1
    resultColor = purple.map((component, index) => 
      Math.round(component + (neutral[index] - component) * mix)
    );
  } else if (temperature > 30) {
    // Above 30, use red
    resultColor = red;
  } else {
    // Below 0, use purple
    resultColor = purple;
  }

  return `rgb(${resultColor.join(',')})`;
};

const getWaterLevelColor = (waterLevel) => {
  // Assuming waterLevel is between 0 and 100
  const green = [0, 255, 0]; // RGB for green
  const red = [255, 0, 0]; // RGB for red
  waterLevel = waterLevel/10.0;
  let mix;
  if (waterLevel > 25) {
    // If above 25%, calculate mix on a scale from 0.5 to 1 (where 1 is fully green)
    mix = 0.5 + (waterLevel - 25) / (100 - 25) * 0.5;
  } else {
    // If 25% or below, scale mix from 0 to 0.5
    mix = waterLevel / 25 * 0.5;
  }

  // Linearly interpolate between red and green based on waterLevel
  const resultColor = green.map((component, index) =>
    Math.round(component + (red[index] - component) * (1 - mix)) // Move from green to red as water level decreases
  );

  return `rgb(${resultColor.join(',')})`;
};

const HomieCard = ({ homie: homie, isSelected }) => {
    const [timeRemaining, setTimeRemaining] = useState(''); 
    useEffect(() => {
        const calculateRemainingTime = () => {
          if (homie.is_watering) {
            setTimeRemaining('Hydrating');
          } else {
            const nextWateringTime = homie.last_watering_time + (homie.watering_interval*1000);
            let diff = Math.max(0, nextWateringTime - Date.now()); // Milliseconds
            // console.log(diff)
            setTimeRemaining("Hydrating in: "+ formatTime(new Date(diff-(60*60*1000)))); // Formats the remaining time
          }
        };
        calculateRemainingTime(); // Initial calculation

        const intervalId = setInterval(calculateRemainingTime, 1000); // Update every second
    
        return () => clearInterval(intervalId); // Cleanup on unmount
      }, [homie]);

    // const nextWatering = device.is_watering 
    //                      ? ': Watering' 
    //                      : ' in: ' + timeRemaining;

    return (
        <Box sx={{ minWidth: 100, width: '100%', maxWidth: '100%',
        '&:hover': {
          transform: 'scale(1.03)',
          transition: 'transform 0.3s ease-in-out',
        }, }}>
        <Card variant="outlined" sx={{ 
                bgcolor: isSelected ? 'primary.darker' : 'background.paper', // Highlight background if selected
                borderColor: isSelected ? 'primary.main' : 'divider', // Different border color for selected card
            }}
            // elevation={isSelected ? 8 : 3}
            >
        <CardContent>
            <Typography variant="h5" component="div" textAlign="center">
            {homie.name || homie.ip}
            </Typography>
            <Divider />
            <Typography variant="body2">
                <List>
                    <ListItem>
                      <ListItemIcon>
                      <WaterIcon sx={{ color: homie.is_watering ? 'primary.main':'text.secondary', }} />
                      </ListItemIcon>
                      {timeRemaining}

                    </ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <OpacityIcon sx={{ color: getWaterLevelColor(homie.current_water_level) }} />
                      </ListItemIcon>
                      Water Level: {(homie.current_water_level/10.0).toFixed(2)}%</ListItem>
                    <ListItem>
                      <ListItemIcon>
                        <ThermostatIcon sx={{ color: getTemperatureColor(homie.current_temp) }} />
                      </ListItemIcon>
                      Temperature: {homie.current_temp.toFixed(2)}°C</ListItem>
                </List>
            </Typography>
        </CardContent>
        </Card>
        </Box>
  );
};

export default HomieCard;
