import { Navigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../context/AuthContext";

// Shows the page only to logged-in users. Everyone else is sent to /login.
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p>Checking your session...</p>;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname, message: "Please log in to see this page." }} />;
  }
  return children;
}

ProtectedRoute.propTypes = { children: PropTypes.node.isRequired };
