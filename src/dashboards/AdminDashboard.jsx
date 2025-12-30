import { Link } from "react-router-dom";

export default function AdminDashboard() {
  return (
    <div>
      <h1>📊 Dashboard Administrador</h1>

      <ul>
        <li><Link to="/clientes">Clientes</Link></li>
        <li><Link to="/productos">Productos</Link></li>
        <li><Link to="/cotizaciones">Cotizaciones</Link></li>
      </ul>

      <p>Acceso completo al sistema</p>
    </div>
  );
}
