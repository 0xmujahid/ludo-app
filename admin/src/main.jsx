import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { store } from "./store";
import App from "./App.jsx";
import AppTheme from "./theme/AppTheme.jsx";
import "./index.css";
import { CssBaseline } from "@mui/material";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <AppTheme>
        <CssBaseline enableColorScheme />
        <App />
      </AppTheme>
    </Provider>
  </StrictMode>
);
