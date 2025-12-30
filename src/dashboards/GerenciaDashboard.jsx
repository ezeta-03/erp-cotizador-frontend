import { Link } from "react-router-dom";

export default function GerenciaDashboard() {
  return (
    <div>
      <h1>📈 Dashboard Gerencia</h1>

      <ul>
        <li><Link to="/cotizaciones">Ver Cotizaciones</Link></li>
      </ul>

      <p>Solo lectura – métricas y control</p>
    </div>
  );
}
