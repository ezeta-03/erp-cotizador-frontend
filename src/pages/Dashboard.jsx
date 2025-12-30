import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import { getDashboard } from "../api/dashboard";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    getDashboard().then(setData);
  }, []);

  if (!data) return <p>Cargando...</p>;

  // ADMIN
  if (user.role === "ADMIN") {
    return (
      <div>
        <h2>Dashboard Administrador</h2>
        <ul>
          <li>Clientes: {data.clientes}</li>
          <li>Productos: {data.productos}</li>
          <li>Cotizaciones: {data.cotizaciones}</li>
        </ul>

        <h3>Últimas cotizaciones</h3>
        <ul>
          {data.ultimas.map((c) => (
            <li key={c.id}>
              {c.numero} – {c.cliente.nombre}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // VENTAS
  if (user.role === "VENTAS") {
    return (
      <div>
        <h2>Mis Cotizaciones</h2>
        <p>Total: {data.total}</p>

        <button onClick={() => (window.location.href = "/cotizaciones")}>
          Nueva cotización
        </button>

        <ul>
          {data.recientes.map((c) => (
            <li key={c.id}>{c.numero}</li>
          ))}
        </ul>
      </div>
    );
  }

  // CLIENTE
  if (user.role === "CLIENTE") {
    return (
      <div>
        <h2>Mi Cotización</h2>

        {data.cotizacion ? (
          <>
            <p>Número: {data.cotizacion.numero}</p>
            <p>Total: {data.cotizacion.total}</p>

            <button
              onClick={() =>
                window.open(
                  `${import.meta.env.VITE_API_URL}/cotizaciones/${data.cotizacion.id}/pdf`
                )
              }
            >
              Descargar PDF
            </button>
          </>
        ) : (
          <p>No tienes cotizaciones</p>
        )}
      </div>
    );
  }

  return null;
}
