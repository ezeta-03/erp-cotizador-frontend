import { useEffect, useState } from "react";
import { getCotizaciones } from "../api/cotizaciones";
import styles from "./cotizacionesHistorial.module.scss";
import VistaPreviaCotizacion from "../coomponents/VistaPreviaCotizacion";

export default function CotizacionesHistorial() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    getCotizaciones().then(setCotizaciones);
  }, []);

  const filtradas = cotizaciones.filter((c) => {
    const matchEstado =
      filtroEstado === "TODAS" ? true : c.estado === filtroEstado;
    const matchCliente = filtroCliente
      ? c.cliente.nombreComercial.toLowerCase().includes(filtroCliente.toLowerCase())
      : true;
    const matchVendedor = filtroVendedor
      ? c.usuario?.nombre.toLowerCase().includes(filtroVendedor.toLowerCase())
      : true;
    const matchFecha = filtroFecha
      ? new Date(c.createdAt).toLocaleDateString() === filtroFecha
      : true;

    return matchEstado && matchCliente && matchVendedor && matchFecha;
  });

  const handlePreview = (cotizacion) => {
    setSelectedCotizacion(cotizacion);
  };

  const confirmPdf = () => {
    if (!selectedCotizacion) return;
    const url = `${import.meta.env.VITE_API_URL}/cotizaciones/${selectedCotizacion.id}/pdf?token=${token}`;
    window.open(url, "_blank");
    setSelectedCotizacion(null);
  };

  return (
    <div className={styles.container}>
      <h2>Historial de Cotizaciones</h2>

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

      {/* Filtros inteligentes */}
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

      {/* Lista de cards */}
      <div className={styles.lista}>
        {filtradas.map((c) => (
          <div key={c.id} className={styles.card}>
            <div className={styles.header}>
              <span className={styles.numero}>#{c.numero}</span>
              <span className={`${styles.estado} ${styles[c.estado]}`}>
                {c.estado}
              </span>
            </div>

            <p className={styles.cliente}>{c.cliente.nombreComercial}</p>
            <p className={styles.total}>💰 S/. {c.total.toFixed(2)}</p>
            <p className={styles.fecha}>
              📅 {new Date(c.createdAt).toLocaleDateString()}
            </p>
            <p className={styles.vendedor}>👤 {c.usuario?.nombre}</p>

            <button className={styles.btnPreview} onClick={() => handlePreview(c)}>
              Vista previa PDF
            </button>
          </div>
        ))}
      </div>

      {selectedCotizacion && (
        <VistaPreviaCotizacion
          cotizacion={selectedCotizacion}
          onConfirm={confirmPdf}
          onCancel={() => setSelectedCotizacion(null)}
        />
      )}
    </div>
  );
}
