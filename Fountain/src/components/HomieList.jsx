import React, { useState, useEffect } from 'react';
import HomieCard from './HomieCard';
import {Grid} from '@mui/material';

const HomieList = ({ homies: homies, selectedHomie, onHomieClick }) => { // Receive deviceIps as props

  return (
    <Grid container spacing={2}
    justifyContent="center"
    alignItems="flex-start"
    sx={{mt:1}}>
      {homies.map((homie) => (
        <Grid item xs="auto" key={homie.ip}> {/* Adjust column widths as needed */}
        <div onClick={() => onHomieClick(homie)}>
          <HomieCard homie={homie} isSelected={selectedHomie === homie.ip}/>
        </div>
        </Grid>
      ))}
    </Grid>
  );
};

export default HomieList;
