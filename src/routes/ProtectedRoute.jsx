import { Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (!roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return children;
}
