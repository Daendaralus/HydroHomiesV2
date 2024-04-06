import * as React from 'react';
import { styled, useTheme} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import CssBaseline from '@mui/material/CssBaseline';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Button } from '@mui/material';

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
  })(({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
display: 'flex',
alignItems: 'center',
padding: theme.spacing(0, 1),
justifyContent: 'space-between', 
// necessary for content to be below app bar
...theme.mixins.toolbar,
// justifyContent: 'flex-end',
}));

const drawerWidth = 280;

const Menu = ({ homiecards, isOpen, handleDrawerOpen, handleDrawerClose, handleAddHomie}) => {
    const theme = useTheme();
    return (
        <Box sx={{ display: 'flex' }}>
          <AppBar position="fixed" open={isOpen}  id="app-bar">
            <Toolbar>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerOpen}
                edge="start"
                sx={{ mr: 2, ...(isOpen && { display: 'none' }) }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Fountain
              </Typography>
              <Button variant="outlined" onClick={handleAddHomie} sx={{ml:2}}>Add Homie</Button>
            </Toolbar>
          </AppBar>
          <Drawer
            sx={{
              width: drawerWidth,
              flexShrink: 0,
              '& .MuiDrawer-paper': {
                width: drawerWidth,
                boxSizing: 'border-box',
              },
            }}
            variant="persistent"
            anchor="left"
            open={isOpen}
            id="side-bar"
          >
            <DrawerHeader>
            <Typography variant="h6" noWrap component="div"
            sx={{ml:3}}>
              Homies
            </Typography>
              <IconButton onClick={handleDrawerClose}>
                {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
              </IconButton>

            </DrawerHeader>
            <Divider />
            {homiecards}
          </Drawer>
        </Box>
      );
    };

export default Menu;