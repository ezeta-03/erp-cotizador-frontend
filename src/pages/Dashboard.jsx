import useAuth from "../auth/useAuth";

import AdminDashboard from "../dashboards/AdminDashboard";
import VentasDashboard from "../dashboards/VentasDashboard";
import ClienteDashboard from "../dashboards/ClienteDashboard";
import ContableDashboard from "../dashboards/ContableDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "VENTAS":
      return <VentasDashboard />;
    case "CLIENTE":
      return <ClienteDashboard />;
    case "CONTABLE":
      return <ContableDashboard />;
    default:
      return <p>Rol no reconocido: {user.role}</p>;
  }
}
