import { Link } from "react-router-dom";

export default function VentasDashboard() {
  return (
    <div>
      <h1>🧾 Dashboard Ventas</h1>

      <ul>
        <li><Link to="/cotizaciones">Nueva Cotización</Link></li>
        <li><Link to="/clientes">Clientes</Link></li>
        <li><Link to="/productos">Productos</Link></li>
      </ul>

      <p>Generación rápida de cotizaciones</p>
    </div>
  );
}
