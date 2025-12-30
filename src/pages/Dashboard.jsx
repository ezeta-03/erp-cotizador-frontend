import useAuth from "../auth/useAuth";

import AdminDashboard from "../dashboards/AdminDashboard";
import VentasDashboard from "../dashboards/VentasDashboard";
import GerenciaDashboard from "../dashboards/GerenciaDashboard";
import ClienteDashboard from "../dashboards/ClienteDashboard";

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "ADMIN":
      return <AdminDashboard />;
    case "VENTAS":
      return <VentasDashboard />;
    case "GERENCIA":
      return <GerenciaDashboard />;
    case "CLIENTE":
      return <ClienteDashboard />;
    default:
      return <p>Rol no reconocido</p>;
  }
}
