import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { getReservasPorCotizacion, createReserva } from "../api/reservas";
import styles from "./convertirReservaModal.module.scss";

const fmtFecha = (str) => new Date(str).toLocaleDateString("es-PE");

const calcFechaFin = (fechaInicioStr, meses) => {
  const d = new Date(`${fechaInicioStr}T00:00:00`);
  d.setMonth(d.getMonth() + Number(meses || 1));
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Agrupa los items de la cotización por panel/mupi, usando la línea "Alquiler"
// de cada uno como referencia de precio mensual y duración.
function gruposPorPanel(cotizacion) {
  const map = new Map();
  for (const item of cotizacion.items || []) {
    if (item.panelId == null || !item.panel) continue;
    if (!map.has(item.panelId)) map.set(item.panelId, { panel: item.panel, alquiler: null });
    if ((item.nombre || "").startsWith("Alquiler")) map.get(item.panelId).alquiler = item;
  }
  return Array.from(map.values()).filter((g) => g.alquiler);
}

function FilaPanel({ cotizacion, grupo, reservaExistente, onCreada }) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [precioMensual, setPrecioMensual] = useState(String(grupo.alquiler.precio));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const meses = grupo.alquiler.cantidad || 1;
  const fechaFin = fechaInicio ? calcFechaFin(fechaInicio, meses) : "";

  if (reservaExistente) {
    return (
      <div className={styles.fila}>
        <div className={styles.filaPanel}>
          <strong>{grupo.panel.codigo}</strong> — {grupo.panel.nombre}
        </div>
        <span className={styles.ok}>
          ✓ Reserva creada ({fmtFecha(reservaExistente.fechaInicio)} → {fmtFecha(reservaExistente.fechaFin)})
        </span>
      </div>
    );
  }

  const handleCrear = async () => {
    if (!fechaInicio) { setError("Selecciona la fecha de inicio."); return; }
    setSaving(true);
    setError("");
    try {
      await createReserva({
        panelId: grupo.panel.id,
        clienteId: cotizacion.clienteId,
        cotizacionId: cotizacion.id,
        fechaInicio,
        fechaFin,
        precioMensual,
        estado: "OCUPADO",
        notas: `Generado desde cotización ${cotizacion.numero}`,
      });
      onCreada();
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al crear la reserva");
      setSaving(false);
    }
  };

  return (
    <div className={styles.fila}>
      <div className={styles.filaPanel}>
        <strong>{grupo.panel.codigo}</strong> — {grupo.panel.nombre}
        <span className={styles.filaMeses}>{meses} mes{meses !== 1 ? "es" : ""}</span>
      </div>
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.filaForm}>
        <div className={styles.formField}>
          <label>Precio mensual (S/)</label>
          <input type="number" step="0.01" min="0" value={precioMensual} onChange={(e) => setPrecioMensual(e.target.value)} />
        </div>
        <div className={styles.formField}>
          <label>Fecha de inicio</label>
          <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
        </div>
        <div className={styles.formField}>
          <label>Fecha de fin</label>
          <input type="date" value={fechaFin} disabled />
        </div>
        <button className={styles.btnPrimary} onClick={handleCrear} disabled={saving}>
          {saving ? "Creando…" : "Crear reserva"}
        </button>
      </div>
    </div>
  );
}

export default function ConvertirReservaModal({ cotizacion, onClose }) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setReservas(await getReservasPorCotizacion(cotizacion.id)); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [cotizacion.id]);

  useEffect(() => { cargar(); }, [cargar]);

  const grupos = gruposPorPanel(cotizacion);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Crear reserva(s) — {cotizacion.numero}</h2>
            <p className={styles.sub}>{cotizacion.cliente?.nombreComercial}</p>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.body}>
          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : grupos.length === 0 ? (
            <p className={styles.empty}>Esta cotización no tiene paneles/mupis para convertir.</p>
          ) : (
            grupos.map((g) => (
              <FilaPanel
                key={g.panel.id}
                cotizacion={cotizacion}
                grupo={g}
                reservaExistente={reservas.find((r) => r.panelId === g.panel.id)}
                onCreada={cargar}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
