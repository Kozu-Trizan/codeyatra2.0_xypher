import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wraps a route so only authenticated users can access it.
 * If logged in but onboarding not done → redirect to /onboarding.
 * If not logged in → redirect to /login, preserve intended destination.
 */
export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (
    requireOnboarding &&
    !user.onboardingDone &&
    location.pathname !== "/onboarding"
  ) {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
