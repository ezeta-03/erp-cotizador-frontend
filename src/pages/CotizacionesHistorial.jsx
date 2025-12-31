import { useEffect, useState } from "react";
import { getCotizaciones } from "../api/cotizaciones";
import styles from "./cotizacionesHistorial.module.scss";

export default function CotizacionesHistorial() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [filtro, setFiltro] = useState("TODAS");
  const token = localStorage.getItem("token");
  useEffect(() => {
    getCotizaciones().then(setCotizaciones);
  }, []);

  const filtradas =
    filtro === "TODAS"
      ? cotizaciones
      : cotizaciones.filter((c) => c.estado === filtro);

  return (
    <div className={styles.container}>
      <h2>Historial de Cotizaciones</h2>

      <div className={styles.filtros}>
        {["TODAS", "PENDIENTE", "FACTURADA", "RECHAZADA"].map((f) => (
          <button
            key={f}
            className={filtro === f ? styles.active : ""}
            onClick={() => setFiltro(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className={styles.lista}>
        {filtradas.map((c) => (
          <div key={c.id} className={styles.card}>
            <div className={styles.header}>
              <span className={styles.numero}>{c.numero}</span>
              <span className={`${styles.estado} ${styles[c.estado]}`}>
                {c.estado}
              </span>
            </div>

            <p className={styles.cliente}>{c.cliente.nombre}</p>
            <p className={styles.total}>S/. {c.total.toFixed(2)}</p>
            <p className={styles.fecha}>
              {new Date(c.createdAt).toLocaleDateString()}
            </p>

            <a
              href={`${import.meta.env.VITE_API_URL}/cotizaciones/${c.id}/pdf?token=${token}`}
              target="_blank"
            >
              Ver PDF
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
