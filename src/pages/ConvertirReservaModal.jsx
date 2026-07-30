import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { getReservasPorCotizacion, createReserva } from "../api/reservas";
import styles from "./convertirReservaModal.module.scss";

const fmtFecha = (str) => new Date(str).toLocaleDateString("es-PE");

const calcFechaFin = (fechaInicioStr, meses) => {
  const [y, m, day] = fechaInicioStr.split("-").map(Number);
  const totalMeses = m - 1 + Number(meses || 1);
  const targetYear = y + Math.floor(totalMeses / 12);
  const targetMonth = ((totalMeses % 12) + 12) % 12; // 0-indexado
  // Si el día de inicio (ej. 31) no existe en el mes destino (ej. febrero),
  // se usa el último día real de ese mes en vez de desbordar al mes siguiente.
  const ultimoDiaMesDestino = new Date(targetYear, targetMonth + 1, 0).getDate();
  const d = new Date(targetYear, targetMonth, Math.min(day, ultimoDiaMesDestino));
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

// Agrupa las líneas "Alquiler" de la cotización por panel/mupi. Si el mismo
// panel aparece más de una vez (dos líneas de Alquiler para el mismo panel),
// se conservan TODAS — antes se perdía silenciosamente todas menos la última.
function itemsAlquilerPorPanel(cotizacion) {
  const map = new Map();
  for (const item of cotizacion.items || []) {
    if (item.panelId == null || !item.panel) continue;
    if (!(item.nombre || "").startsWith("Alquiler")) continue;
    if (!map.has(item.panelId)) map.set(item.panelId, []);
    map.get(item.panelId).push(item);
  }
  return map;
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

  // Empareja cada línea "Alquiler" con su reserva ya creada, por orden, dentro
  // de su mismo panel — el modelo de Reserva no guarda a qué item exacto de
  // la cotización corresponde, así que cuando un panel se repite se empareja
  // la 1ra línea con la 1ra reserva de ese panel, la 2da con la 2da, etc.
  const itemsPorPanel = itemsAlquilerPorPanel(cotizacion);
  const grupos = [];
  for (const itemsAlquiler of itemsPorPanel.values()) {
    const reservasPanel = reservas.filter((r) => r.panelId === itemsAlquiler[0].panelId);
    itemsAlquiler.forEach((alquiler, idx) => {
      grupos.push({ panel: alquiler.panel, alquiler, reservaExistente: reservasPanel[idx] || null });
    });
  }

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
                key={g.alquiler.id}
                cotizacion={cotizacion}
                grupo={g}
                reservaExistente={g.reservaExistente}
                onCreada={cargar}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
