import { useEffect, useState } from "react";
import api from "../api/axios";
import styles from "./CotizacionesVentas.module.scss";

export default function CotizacionesVentas() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [error, setError] = useState(null);

  // filtros
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");

  const token = localStorage.getItem("token");

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

  // aplicar filtros
  const filtradas = cotizaciones.filter((c) => {
    const matchEstado =
      filtroEstado === "TODAS" ? true : c.estado === filtroEstado;
    const matchCliente = filtroCliente
      ? c.cliente?.nombreComercial
          ?.toLowerCase()
          .includes(filtroCliente.toLowerCase())
      : true;
    const matchVendedor = filtroVendedor
      ? c.usuario?.nombre
          ?.toLowerCase()
          .includes(filtroVendedor.toLowerCase())
      : true;
    const matchFecha = filtroFecha
      ? new Date(c.createdAt).toLocaleDateString() === filtroFecha
      : true;

    return matchEstado && matchCliente && matchVendedor && matchFecha;
  });

  if (error) {
    return <p>{error}</p>;
  }

  if (cotizaciones.length === 0) {
    return <p>No hay cotizaciones registradas</p>;
  }

  return (
    <div className={styles.container}>
      <h2>Cotizaciones (Ventas)</h2>

      {/* Filtros por estado */}
      <div className={styles.filtros}>
        {["TODAS", "PENDIENTE", "FACTURADA", "RECHAZADA", "APROBADA"].map((f) => (
          <button
            key={f}
            className={filtroEstado === f ? styles.active : ""}
            onClick={() => setFiltroEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filtros avanzados */}
      <div className={styles.filtrosAvanzados}>
        <input
          type="text"
          placeholder="Filtrar por cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por vendedor..."
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por fecha (dd/mm/aaaa)..."
          value={filtroFecha}
          onChange={(e) => setFiltroFecha(e.target.value)}
        />
      </div>

      {/* Tabla de cotizaciones */}
      <table className={styles.table}>
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
          {filtradas.map((c) => (
            <tr key={c.id}>
              <td>{c.numero}</td>
              <td>{c.usuario?.nombre}</td>
              <td>{c.cliente?.nombreComercial}</td>
              <td>
                <span className={`${styles.estado} ${styles[c.estado]}`}>
                  {c.estado}
                </span>
              </td>
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
