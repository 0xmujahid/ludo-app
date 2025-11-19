import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./modules/auth/Login";
import Dashboard from "./modules/dashboard/Dashboard";
import Settings from "./modules/settings/Settings";
import Users from "./modules/users/Users";
import Transactions from "./modules/transactions/Transactions";
import GameTypes from "./modules/game-types/GameTypes";
import Tournaments from "./modules/tournaments/Tournaments";
import Games from "./modules/games/Games";
import PaymentMethods from "./modules/payment-methods/PaymentMethods";
import ProtectedRoute from "./routes/ProtectedRoute";
import AuthLayout from "./layouts/AuthLayout";
import NotificationSnackbar from "./components/NotificationSnackbar";
import { HashRouter } from "react-router-dom";

const App = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* All protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <AuthLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="users" element={<Users />} />
          <Route path="settings" element={<Settings />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="game-types" element={<GameTypes />} />
          <Route path="tournaments" element={<Tournaments />} />
          <Route path="games" element={<Games />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
        </Route>

        {/* Fallback route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <NotificationSnackbar />
    </HashRouter>
  );
};

export default App;
