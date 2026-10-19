import { Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

// Sin sesión → login. Con sesión pero sin permiso → el inicio de su propio rol.
export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/erp" replace />;
  if (!roles.includes(user.role)) return <Navigate to={`/erp/${user.role.toLowerCase()}`} replace />;

  return children;
}
