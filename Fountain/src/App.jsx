import React, { useState, useEffect } from 'react';
import './App.css'; 
import HomieList from './components/HomieList';
import AddHomieModal from './components/AddHomieModal';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button'; 
import Divider from '@mui/material/Divider';
import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider, Box } from '@mui/material';
import { green, blue } from '@mui/material/colors';
import Menu from './components/Menu';
import HomieDetails from './components/HomieDetails';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: green[500],
    },
    secondary: {
      main: blue[500],
    },
  },
  components: {
    MuiDrawer: {
      styleOverrides: {
        paper: {
          zIndex: 1200, // Value lower than the AppBar
        },
      },
    },
  },
});

const loadHomiesFromLocalStorage = () => {
  const storedHomies = localStorage.getItem('homies');
  return storedHomies ? JSON.parse(storedHomies) : [];
}

function App() {
  const [homieIps, setHomieIps] = useState(loadHomiesFromLocalStorage());
  const [homies, setHomies] = useState([]); // All homies
  const [isAddHomieModalOpen, setIsAddHomieModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedHomie, setSelectedHomie] = useState(null);
  const [homiedetail, setHomieDetail] = useState(null);
  const [homiecards, setHomieCards] = useState(null);
  const [appBarHeight, setAppBarHeight] = useState('64px'); // Default height
  const [sideBarWidth, setSideBarWidth] = useState('0px'); // Default height

  const updateSideBarWidth = () => {
    const sideBarWidth = document.getElementById('side-bar');
    if (sideBarWidth) {
      setSideBarWidth(`${sideBarWidth.clientWidth}px`);
    }
  };

  // Poll for all homies status
  useEffect(() => {
    const fetchHomies = async () => { 
      const homiePromises = homieIps.map(async (ip) => {
        try {
          const statusResponse = await fetch(`http://${ip}/status`);
          const configResponse = await fetch(`http://${ip}/config`);

          const statusData = await statusResponse.json();
          const configData = await configResponse.json();

          return {...statusData, ...configData, ip}; 
        } catch (error) {
          console.error(`Error fetching homie ${ip}:`, error);
          // Handle errors here (e.g., return a placeholder with error)
          return { ip, error: 'Error fetching data' };
        }
      });

      const homies = await Promise.all(homiePromises);
      setHomies(homies);
    };

    fetchHomies();
    const intervalId = setInterval(fetchHomies, 5000);

    return () => clearInterval(intervalId);
  }, [homieIps]);

  useEffect(() => {
    if (selectedHomie) {
      setHomieDetail(<HomieDetails homie={selectedHomie} />);
    }
  }, [selectedHomie]);

  // Update selected homie's detail based on polling
  useEffect(() => {
    if (selectedHomie) {
      const currentDetails = homies.find(homie => homie.ip === selectedHomie.ip);
      setSelectedHomie(currentDetails);
    }
  }, [homies]);

  useEffect(() => {
    const appBarElement = document.getElementById('app-bar');
    if (appBarElement) {
      setAppBarHeight(`${appBarElement.clientHeight}px`);
    }
  }, []);

  const saveHomiesToLocalStorage = () => {
    localStorage.setItem('homies', JSON.stringify(homieIps));
  }

  const handleAddHomie = (newHomieIp) => {
    setHomieIps([...homieIps, newHomieIp]);
  };

  const handleOpenAddHomieModal = () => {
    setIsAddHomieModalOpen(true);
  };

  const handleHomieClick = (homie) => {
    setSelectedHomie(homie);
    setIsDetailsOpen(true);
    updateSideBarWidth();
  }


  const handleDrawerOpen = () => {
    setIsDetailsOpen(true);
    updateSideBarWidth();
  }

  const handleDrawerClose = () => {
    setIsDetailsOpen(false);
    setSelectedHomie(null);
  }

  useEffect(() => {
    saveHomiesToLocalStorage(); 
  }, [homieIps]);

  useEffect(() => {
    saveHomiesToLocalStorage(); 
    setHomieCards(
      <HomieList 
      homies={homies} 
      selectedHomie={selectedHomie?.ip} 
      onHomieClick={handleHomieClick} />
    )
  }, [homies, selectedHomie]);



  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Menu homiecards={homiecards} isOpen={isDetailsOpen} handleDrawerOpen={handleDrawerOpen} handleDrawerClose={handleDrawerClose} handleAddHomie={handleOpenAddHomieModal}/>
      <AddHomieModal isOpen={isAddHomieModalOpen} onRequestClose={() => setIsAddHomieModalOpen(false)} onAddHomie={handleAddHomie} currentHomies={homieIps} />
        <Box 
          sx={{
            marginTop: appBarHeight, // Adjust this value as needed
            marginLeft: isDetailsOpen ? sideBarWidth : '0px', // Adjust this value as needed
            // paddingRight: darkTheme.spacing(2),
            transition: darkTheme.transitions.create('margin', {
              easing: darkTheme.transitions.easing.sharp,
              duration: darkTheme.transitions.duration.leavingScreen,
            }),
            // Add more styling as needed
          }}
          >
        {!isDetailsOpen && (
          homiecards
        )}


        {isDetailsOpen && (
          <Box>
            {homiedetail}
            {/* <Button variant="text" onClick={() => handleDrawerClose()}>Close</Button> */}
          </Box>
         )}
         </Box>
    </ThemeProvider>
  );
}

// const rootElement = document.getElementById('root');
export default App;
