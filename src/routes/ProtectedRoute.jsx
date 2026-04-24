import { Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/cotizador" />;
  if (!roles.includes(user.role)) return <Navigate to="/cotizador" />;

  return children;
}
