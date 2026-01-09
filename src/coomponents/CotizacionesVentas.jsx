import { useEffect, useState } from "react";
import api from "../api/axios";

export default function CotizacionesVentas() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    api
      .get("/cotizaciones", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCotizaciones(res.data));
  }, []);

  const facturar = async (id) => {
    try {
      await api.post(
        `/cotizaciones/${id}/facturar`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Cotización facturada");
      window.location.reload();
    } catch (error) {
      console.error("❌ Error facturando cotización:", error);
      alert("Error facturando cotización");
    }
  };

  if (cotizaciones.length === 0) {
    return <p>No hay cotizaciones registradas</p>;
  }

  return (
    <div>
      <h2>Cotizaciones (Ventas)</h2>
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Total</th>
            <th>Acción</th>
          </tr>
        </thead>
        <tbody>
          {cotizaciones.map((c) => (
            <tr key={c.id}>
              <td>{c.numero}</td>
              <td>{c.cliente?.nombre}</td>
              <td>{c.estado}</td>
              <td>S/. {c.total.toFixed(2)}</td>
              <td>
                {c.estado === "APROBADA" ? (
                  <button
                    className="btn-facturar"
                    onClick={() => facturar(c.id)}
                  >
                    Facturar
                  </button>
                ) : (
                  <span>-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
