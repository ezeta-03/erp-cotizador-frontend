import { useEffect, useState } from "react";
import FiltrosClientes from "./FiltrosClientes";
import { getActividadClientes } from "../api/clientes";
import useAuth from "../auth/useAuth";

export default function ActividadClientes() {
  const { user } = useAuth();
  const [actividad, setActividad] = useState([]);

  const buscarActividad = async (filtros) => {
    try {
      const data = await getActividadClientes(filtros);
      setActividad(data);
    } catch (error) {
      console.error("❌ Error cargando actividad de clientes:", error);
      setActividad([]);
    }
  };

  useEffect(() => {
    if (user) {
      buscarActividad({});
    }
  }, [user]);

  if (!user) { return <p>Cargando usuario...</p>; }

  return (
    <div>
      <h2>Actividad de Clientes</h2>
      <FiltrosClientes onBuscar={buscarActividad} />

      {actividad.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>N° Cotización</th>
              <th>Productos</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Estado</th>
              {user?.role === "ADMIN" && <th>Vendedor</th>}
            </tr>
          </thead>
          <tbody>
            {actividad.map((c) => (
              <tr key={c.id}>
                <td>{c.cliente?.nombreComercial}</td>
                <td>{c.numero}</td>
                <td>{c.items.map((i) => i.producto.material).join(", ")}</td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td>S/. {c.total.toFixed(2)}</td>
                <td>{c.estado}</td>
                {user?.role === "ADMIN" && <td>{c.usuario?.nombre}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No hay actividad registrada</p>
      )}
    </div>
  );
}
