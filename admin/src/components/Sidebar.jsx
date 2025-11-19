import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Toolbar,
  Collapse,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import SettingsIcon from "@mui/icons-material/Settings";
import PaymentIcon from "@mui/icons-material/Payment";
import VideogameAssetIcon from "@mui/icons-material/VideogameAsset";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import SportsEsportsIcon from "@mui/icons-material/SportsEsports";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import { Link as RouterDomLink, useLocation } from "react-router-dom";
import React from "react";

const RouterLink = React.forwardRef(function RouterLink(props, ref) {
  return <RouterDomLink ref={ref} {...props} />;
});
import { useState } from "react";
import { ExpandLess, ExpandMore } from "@mui/icons-material";

const Sidebar = () => {
  const location = useLocation();
  const [gameManagementOpen, setGameManagementOpen] = useState(false);
  const [paymentManagementOpen, setPaymentManagementOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const handleGameManagementClick = () => {
    setGameManagementOpen(!gameManagementOpen);
  };

  const handlePaymentManagementClick = () => {
    setPaymentManagementOpen(!paymentManagementOpen);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 280,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: 280,
          boxSizing: "border-box",
          backgroundColor: "#000000ff",
          borderRight: "1px solid #e0e0e0",
        },
      }}
    >
      <Toolbar />
      <Divider />
      <List sx={{ pt: 1 }}>
        {/* Dashboard */}
        <ListItem 
            component={RouterLink} 
          to="/dashboard"
          sx={{
            backgroundColor: isActive("/dashboard") ? "primary.light" : "transparent",
            color: isActive("/dashboard") ? "primary.contrastText" : "inherit",
            "&:hover": {
              backgroundColor: isActive("/dashboard") ? "primary.main" : "action.hover",
            },
            mb: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon sx={{ color: isActive("/dashboard") ? "primary.contrastText" : "inherit" }}>
            <DashboardIcon />
          </ListItemIcon>
          <ListItemText primary="Dashboard" />
        </ListItem>

        {/* User Management */}
        <ListItem 
            component={RouterLink} 
          to="/users"
          sx={{
            backgroundColor: isActive("/users") ? "primary.light" : "transparent",
            color: isActive("/users") ? "primary.contrastText" : "inherit",
            "&:hover": {
              backgroundColor: isActive("/users") ? "primary.main" : "action.hover",
            },
            mb: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon sx={{ color: isActive("/users") ? "primary.contrastText" : "inherit" }}>
            <PeopleIcon />
          </ListItemIcon>
          <ListItemText primary="User Management" />
        </ListItem>

        {/* Game Management Section */}
        <ListItem 
          button={true} 
          onClick={handleGameManagementClick}
          sx={{
            mb: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon>
            <SportsEsportsIcon />
          </ListItemIcon>
          <ListItemText primary="Game Management" />
          {gameManagementOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={gameManagementOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem 
                component={RouterLink} 
              to="/games"
              sx={{
                backgroundColor: isActive("/games") ? "primary.light" : "transparent",
                color: isActive("/games") ? "primary.contrastText" : "inherit",
                "&:hover": {
                  backgroundColor: isActive("/games") ? "primary.main" : "action.hover",
                },
                pl: 4,
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive("/games") ? "primary.contrastText" : "inherit" }}>
                <VideogameAssetIcon />
              </ListItemIcon>
              <ListItemText primary="Active Games" />
            </ListItem>
            
            <ListItem 
                component={RouterLink} 
              to="/game-types"
              sx={{
                backgroundColor: isActive("/game-types") ? "primary.light" : "transparent",
                color: isActive("/game-types") ? "primary.contrastText" : "inherit",
                "&:hover": {
                  backgroundColor: isActive("/game-types") ? "primary.main" : "action.hover",
                },
                pl: 4,
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive("/game-types") ? "primary.contrastText" : "inherit" }}>
                <VideogameAssetIcon />
              </ListItemIcon>
              <ListItemText primary="Game Types" />
            </ListItem>
            
            <ListItem 
                component={RouterLink} 
              to="/tournaments"
              sx={{
                backgroundColor: isActive("/tournaments") ? "primary.light" : "transparent",
                color: isActive("/tournaments") ? "primary.contrastText" : "inherit",
                "&:hover": {
                  backgroundColor: isActive("/tournaments") ? "primary.main" : "action.hover",
                },
                pl: 4,
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive("/tournaments") ? "primary.contrastText" : "inherit" }}>
                <EmojiEventsIcon />
              </ListItemIcon>
              <ListItemText primary="Tournaments" />
            </ListItem>
          </List>
        </Collapse>

        {/* Payment Management Section */}
        <ListItem 
          button={true} 
          onClick={handlePaymentManagementClick}
          sx={{
            mb: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon>
            <AccountBalanceIcon />
          </ListItemIcon>
          <ListItemText primary="Payment Management" />
          {paymentManagementOpen ? <ExpandLess /> : <ExpandMore />}
        </ListItem>
        
        <Collapse in={paymentManagementOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItem 
                component={RouterLink} 
              to="/transactions"
              sx={{
                backgroundColor: isActive("/transactions") ? "primary.light" : "transparent",
                color: isActive("/transactions") ? "primary.contrastText" : "inherit",
                "&:hover": {
                  backgroundColor: isActive("/transactions") ? "primary.main" : "action.hover",
                },
                pl: 4,
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive("/transactions") ? "primary.contrastText" : "inherit" }}>
                <PaymentIcon />
              </ListItemIcon>
              <ListItemText primary="Transactions" />
            </ListItem>
            
            <ListItem 
                component={RouterLink} 
              to="/payment-methods"
              sx={{
                backgroundColor: isActive("/payment-methods") ? "primary.light" : "transparent",
                color: isActive("/payment-methods") ? "primary.contrastText" : "inherit",
                "&:hover": {
                  backgroundColor: isActive("/payment-methods") ? "primary.main" : "action.hover",
                },
                pl: 4,
                mb: 0.5,
                mx: 1,
                borderRadius: 1,
              }}
            >
              <ListItemIcon sx={{ color: isActive("/payment-methods") ? "primary.contrastText" : "inherit" }}>
                <AccountBalanceIcon />
              </ListItemIcon>
              <ListItemText primary="Payment Methods" />
            </ListItem>
          </List>
        </Collapse>

        {/* System Settings */}
        <ListItem 
            component={RouterLink} 
          to="/settings"
          sx={{
            backgroundColor: isActive("/settings") ? "primary.light" : "transparent",
            color: isActive("/settings") ? "primary.contrastText" : "inherit",
            "&:hover": {
              backgroundColor: isActive("/settings") ? "primary.main" : "action.hover",
            },
            mb: 0.5,
            mx: 1,
            borderRadius: 1,
          }}
        >
          <ListItemIcon sx={{ color: isActive("/settings") ? "primary.contrastText" : "inherit" }}>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="System Settings" />
        </ListItem>
      </List>
    </Drawer>
  );
};

export default Sidebar;
