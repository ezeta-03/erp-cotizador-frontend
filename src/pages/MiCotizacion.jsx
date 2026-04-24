import { useEffect, useState } from "react";
import api from "../api/axios";
import { descargarPDFInteligente } from "../api/pdf";
import styles from "./MiCotizacion.module.scss";

export default function MiCotizacion() {
  const [cotizacion, setCotizacion] = useState(null);
  const [comentario, setComentario] = useState("");
  const [descargando, setDescargando] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;
    api
      .get("/cotizaciones/mia", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setCotizacion(res.data))
      .catch((err) => {
        console.error("Error cargando cotización:", err);
      });
  }, [token]);

  if (!cotizacion) {
    return <p className={styles.label}>No tienes cotizaciones aún</p>;
  }

  const responder = async (estado) => {
    await api.post(
      `/cotizaciones/${cotizacion.id}/responder`,
      { estado, comentario },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    alert("Respuesta enviada");
    window.location.reload();
  };

  return (
    <div className={styles.modal}>
      <h2 className={styles.title}>Mi última cotización</h2>

      <p className={styles.label}>
        <b>Número:</b> {cotizacion.numero}
      </p>
      <p className={styles.label}>
        <b>Estado:</b> {cotizacion.estado}
      </p>
      <p className={styles.total}>
        <b>Total:</b> S/. {cotizacion.total.toFixed(2)}
      </p>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Producto</th>
            <th>Cant.</th>
            <th>Precio</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {cotizacion.items.map((i) => {
            // 👇 glosa de adicionales seleccionados
            const glosa =
              i.adicionales
                ?.filter((a) => a.seleccionado)
                .map((a) => `con ${a.nombre}`)
                .join(", ") || "";

            return (
              <tr key={i.id}>
                <td>{i.producto?.nombre || i.producto?.servicio || i.producto?.material} {glosa}</td>
                <td>{i.cantidad}</td>
                <td>S/. {i.precio.toFixed(2)}</td>
                <td>S/. {i.subtotal.toFixed(2)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <br />

      <button
        className={styles.btnPrimary}
        disabled={descargando}
        onClick={async () => {
          setDescargando(true);
          try { await descargarPDFInteligente(cotizacion, token); }
          catch { alert("Error descargando PDF"); }
          finally { setDescargando(false); }
        }}
      >
        {descargando ? "Descargando…" : "Descargar PDF"}
      </button>

      {cotizacion.estado === "PENDIENTE" && (
        <div className={styles.actions}>
          <textarea
            className={styles.input}
            placeholder="Comentario (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />

          <button
            className={styles.btnPrimary}
            onClick={() => responder("APROBADA")}
          >
            Aprobar
          </button>

          <button
            className={styles.btnSecondary}
            onClick={() => responder("RECHAZADA")}
          >
            Rechazar
          </button>
        </div>
      )}
    </div>
  );
}
