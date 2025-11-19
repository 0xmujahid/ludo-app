import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
 const isAuthenticated = !!sessionStorage.getItem("token");
  const { isAuth } = useSelector(state => true);

  if (!isAuthenticated && !isAuth) {
    // Redirect to login with return location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;