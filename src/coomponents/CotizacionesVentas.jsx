import { useEffect, useState } from "react";
import api from "../api/axios";
import styles from "./CotizacionesVentas.module.scss"; // 👈 importa estilos

export default function CotizacionesVentas() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");
  // const role = localStorage.getItem("role"); // "ADMIN" o "VENTAS"

  useEffect(() => {
    api
      .get("/cotizaciones", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCotizaciones(res.data))
      .catch((err) => {
        console.error("❌ Error cargando cotizaciones:", err);
        setError("No se pudieron cargar las cotizaciones");
      });
  }, [token]);

  const facturar = async (id) => {
    try {
      await api.post(
        `/cotizaciones/${id}/facturar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("✅ Cotización facturada");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error facturando cotización:", error);
      alert("Error facturando cotización");
    }
  };

  if (error) {
    return <p>{error}</p>;
  }

  if (cotizaciones.length === 0) {
    return <p>No hay cotizaciones registradas</p>;
  }

  return (
    <div>
      <h2>Cotizaciones (Ventas)</h2>
      <table>
        <thead>
          <tr>
            <th scope="col">Número</th>
            <th scope="col">Vendedor</th>
            <th scope="col">Cliente</th>
            <th scope="col">Estado</th>
            <th scope="col">Total</th>
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c.id}>
              <td>{c.numero}</td>
              <td>{c.usuario?.nombre}</td>
              <td>{c.cliente?.nombreComercial}</td>
              <td>{c.estado}</td>
              <td>S/. {c.total.toFixed(2)}</td>
              <td>
                <button
                  className={styles.btnFacturar}
                  onClick={() => facturar(c.id)}
                  disabled={c.estado !== "APROBADA"}
                >
                  Facturar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
