import { Box, CssBaseline, Toolbar } from "@mui/material";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import PropTypes from 'prop-types';

import { Outlet } from 'react-router-dom';

const AuthLayout = ({ children }) => {
  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <Header />
      <Sidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          overflow: 'auto',
          height: '100vh',
          marginTop: '64px' // Adjust based on your header height
        }}
      >
        <Toolbar /> {/* This creates space below the app bar */}
        <Outlet />
      </Box>
    </Box>
  );
};

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired
};

export default AuthLayout;