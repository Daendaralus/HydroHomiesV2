import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import { FormControl, Input, InputLabel, Button, FormHelperText} from '@mui/material';
// import './AddDeviceModal.css'; // Your CSS file

const AddHomieModal = ({ isOpen, onRequestClose, onAddHomie: onAddHomie, currentHomies: currentHomies }) => {
  const [homieIp, setHomieIp] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
  

    // 1. Check if device already exists in currentDevices prop
    if (currentHomies.includes(homieIp)) {
        setErrorMessage('Device already exists.');
        return;
      }
  
    // 2. Check if the device API is accessible
    try {
      const response = await fetch(`http://${homieIp}/status`);
      if (!response.ok) {
        setErrorMessage('Device not reachable.');
        return; 
      }
  
      // Device is valid, clear any previous error
      setErrorMessage(null);
  
      // 3. Call onAddDevice function (passed as props) with deviceIp
      onAddHomie(homieIp);
  
      // 4. Close modal
      onRequestClose(); 
  
    } catch (error) {
      setErrorMessage('Device not reachable.'); 
    }
  };

  return (
    <Dialog onClose={onRequestClose} open={isOpen}> 
        <DialogTitle>Add a New Homie</DialogTitle>
        <form onSubmit={handleSubmit}>
            <FormControl error={!!errorMessage} sx={{  margin: 1 }}>
            <InputLabel htmlFor="ip-input">Homie IP Address</InputLabel>
            <Input sx={{ml: 0.1, mr: 0.1}}
            id="ip-input"
            value={homieIp} 
            onChange={(e) => {
                setErrorMessage(null);
                setHomieIp(e.target.value)
            }}
            aria-describedby="component-error-text"
            />
            {errorMessage && <FormHelperText id="component-error-text">{errorMessage}</FormHelperText>}
            <Button variant="contained" type="submit" sx={{mt:1, mb:1}}>Add Homie</Button>
            <Button variant="outlined" onClick={onRequestClose}>Cancel</Button>
        </FormControl>
        </form>
    </Dialog>
  );
};

export default AddHomieModal;
