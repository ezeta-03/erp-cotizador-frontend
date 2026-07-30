import { useEffect, useState } from "react";
import api from "../api/axios";
import styles from "./CotizacionesVentas.module.scss";
import { useToast } from "./Toast";
import Spinner from "./Spinner";

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

export default function CotizacionesVentas() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [facturando, setFacturando] = useState(null);
  const { show: showToast, ToastNode } = useToast();

  useEffect(() => {
    api
      .get("/cotizaciones")
      .then((res) => setCotizaciones(res.data))
      .catch((err) => {
        console.error("❌ Error cargando cotizaciones:", err);
        setError("No se pudieron cargar las cotizaciones");
      })
      .finally(() => setLoading(false));
  }, []);

  const facturar = async (id) => {
    if (!confirm("¿Marcar esta cotización como FACTURADA?")) return;
    setFacturando(id);
    try {
      await api.post(`/cotizaciones/${id}/facturar`, {});
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: "FACTURADA" } : c))
      );
    } catch (err) {
      console.error("❌ Error facturando cotización:", err);
      showToast("Error al facturar la cotización.");
    } finally {
      setFacturando(null);
    }
  };

  const filtradas = cotizaciones.filter((c) => {
    const matchEstado = filtroEstado === "TODAS" || c.estado === filtroEstado;
    const matchCliente = !filtroCliente || c.cliente?.nombreComercial?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchVendedor = !filtroVendedor || c.usuario?.nombre?.toLowerCase().includes(filtroVendedor.toLowerCase());
    return matchEstado && matchCliente && matchVendedor;
  });

  if (loading) return (
    <div className={styles.info} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
      <Spinner size={18} /> Cargando cotizaciones...
    </div>
  );
  if (error) return <p className={styles.info}>{error}</p>;

  return (
    <>
    {ToastNode}
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Facturar</h2>
          <p className={styles.subtitle}>
            {filtradas.length} cotizacion{filtradas.length !== 1 ? "es" : ""}
          </p>
        </div>
      </div>

      {/* Chips de estado */}
      <div className={styles.filtros}>
        {["TODAS", "PENDIENTE", "APROBADA", "RENEGOCIACION", "FACTURADA"].map((f) => (
          <button
            key={f}
            className={`${styles.filtroBtn} ${filtroEstado === f ? styles.active : ""}`}
            onClick={() => setFiltroEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Buscadores */}
      <div className={styles.filtrosAvanzados}>
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className={styles.inputFiltro}
        />
        <input
          type="text"
          placeholder="Buscar por vendedor..."
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className={styles.inputFiltro}
        />
      </div>

      {filtradas.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <strong>Sin cotizaciones</strong>
          <span>No hay resultados para los filtros seleccionados.</span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.cliente?.nombreComercial}</td>
                  <td>{c.usuario?.nombre}</td>
                  <td>
                    <span className={`${styles.estado} ${styles[c.estado]}`}>{c.estado}</span>
                  </td>
                  <td>{fmt(c.total)}</td>
                  <td>
                    <button
                      className={styles.btnFacturar}
                      onClick={() => facturar(c.id)}
                      disabled={c.estado !== "APROBADA" || facturando === c.id}
                    >
                      {facturando === c.id ? "Facturando..." : "Facturar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
