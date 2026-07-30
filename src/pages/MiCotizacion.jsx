import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { getMisCotizaciones, responderCotizacion } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import CotizacionPDFPreview from "../coomponents/CotizacionPDFPreview";
import { nombreItem } from "../utils/cotizacionItem";
import styles from "./MiCotizacion.module.scss";

const ESTADOS = ["TODAS", "PENDIENTE", "APROBADA", "RENEGOCIACION", "FACTURADA"];

function EstadoBadge({ estado }) {
  return <span className={`${styles.estadoBadge} ${styles[estado]}`}>{estado}</span>;
}

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

export default function MiCotizacion() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [selected, setSelected] = useState(null);
  const [comentario, setComentario] = useState("");
  const [respondiendo, setRespondiendo] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    getMisCotizaciones()
      .then(setCotizaciones)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const ultimaId = cotizaciones.length > 0 ? Math.max(...cotizaciones.map((c) => c.id)) : null;

  const filtradas = cotizaciones.filter(
    (c) => filtroEstado === "TODAS" || c.estado === filtroEstado
  );

  const responder = async (estado) => {
    if (!selected) return;
    setRespondiendo(true);
    try {
      const updated = await responderCotizacion(selected.id, estado, comentario);
      setCotizaciones((prev) =>
        prev.map((c) =>
          c.id === updated.id
            ? { ...c, estado: updated.estado, respuestaComentario: updated.respuestaComentario }
            : c
        )
      );
      setSelected((prev) => ({
        ...prev,
        estado: updated.estado,
        respuestaComentario: updated.respuestaComentario,
      }));
      setComentario("");
    } catch (err) {
      alert(err.response?.data?.message || "Error al responder");
    } finally {
      setRespondiendo(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <p className={styles.empty}>Cargando cotizaciones...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mis Cotizaciones</h1>
          <p className={styles.subtitle}>Historial y estado de tus cotizaciones</p>
        </div>
      </div>

      <div className={styles.filtros}>
        {ESTADOS.map((f) => (
          <button
            key={f}
            className={`${styles.filtroBtn} ${filtroEstado === f ? styles.active : ""}`}
            onClick={() => setFiltroEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filtradas.length === 0 ? (
        <p className={styles.empty}>No hay cotizaciones para mostrar.</p>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.usuario?.nombre}</td>
                  <td className={styles.tdTotal}>{fmt(c.total)}</td>
                  <td>
                    <EstadoBadge estado={c.estado} />
                    {c.respuestaComentario && (
                      <div className={styles.tdComentario}>"{c.respuestaComentario}"</div>
                    )}
                  </td>
                  <td>
                    <div>{new Date(c.createdAt).toLocaleDateString("es-PE")}</div>
                    <div className={styles.tdSub}>
                      {new Date(c.createdAt).toLocaleTimeString("es-PE", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </td>
                  <td>
                    <button
                      className={styles.btnOutline}
                      onClick={() => { setSelected(c); setComentario(""); }}
                      disabled={c.id !== ultimaId}
                      title={c.id !== ultimaId ? "Solo puedes ver la última cotización" : ""}
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (() => {
        const cot = selected;
        const total = cot.total || 0;
        const igvMonto = cot.conIgv ? parseFloat((total - total / 1.18).toFixed(2)) : 0;
        const valorVenta = cot.conIgv ? parseFloat((total / 1.18).toFixed(2)) : total;
        const fecha = new Date(cot.createdAt).toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        });
        const previewItems = (cot.items || []).map((item) => ({
          nombre: nombreItem(item),
          descripcion: item.descripcion,
          medidaAncho: item.medidaAncho,
          medidaAlto: item.medidaAlto,
          medida: item.medida,
          unidad: item.producto?.unidad,
          cantidad: item.cantidad,
          precio: item.precio,
          subtotal: item.subtotal,
        }));

        return (
          <div className={styles.previewOverlay}>
            <div className={styles.previewModal}>
              <div className={styles.previewActions}>
                <button
                  className={styles.btnDescargar}
                  onClick={async () => {
                    try { await descargarPDFInteligente(cot, token); }
                    catch { alert("Error descargando PDF"); }
                  }}
                >
                  <Download size={15} /> Descargar PDF
                </button>
                <button className={styles.btnCerrar} onClick={() => setSelected(null)}>
                  <X size={15} /> Cerrar
                </button>
              </div>

              <CotizacionPDFPreview
                numero={cot.numero}
                fecha={fecha}
                estado={cot.estado}
                cliente={cot.cliente}
                conIgv={cot.conIgv !== false}
                items={previewItems}
                valorVenta={valorVenta}
                igvMonto={igvMonto}
                total={total}
              />

              {cot.estado === "PENDIENTE" && (
                <div className={styles.respondForm}>
                  <textarea
                    className={styles.comentarioInput}
                    placeholder="Comentario (opcional)..."
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    rows={3}
                  />
                  <div className={styles.respondActions}>
                    <button
                      className={styles.btnRechazar}
                      onClick={() => responder("RENEGOCIACION")}
                      disabled={respondiendo}
                    >
                      Rechazar
                    </button>
                    <button
                      className={styles.btnAprobar}
                      onClick={() => responder("APROBADA")}
                      disabled={respondiendo}
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              )}

              {cot.respuestaComentario && !["PENDIENTE"].includes(cot.estado) && (
                <div className={styles.comentarioDisplay}>
                  <span className={styles.comentarioLabel}>Tu comentario</span>
                  <p>"{cot.respuestaComentario}"</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
