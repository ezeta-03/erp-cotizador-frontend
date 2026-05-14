import { useEffect, useState, useCallback } from "react";
import { Plus, MapPin, Edit2, Trash2, RefreshCw, X } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getPaneles,
  createPanel,
  updatePanel,
  cambiarEstadoPanel,
  deletePanel,
} from "../api/paneles";
import styles from "./paneles.module.scss";

const ESTADOS = ["DISPONIBLE", "RESERVADO", "EN_USO", "MANTENIMIENTO"];

const ESTADO_META = {
  DISPONIBLE:   { label: "Disponible",   cls: "badgeDisponible" },
  RESERVADO:    { label: "Reservado",    cls: "badgeReservado"  },
  EN_USO:       { label: "En uso",       cls: "badgeEnUso"      },
  MANTENIMIENTO:{ label: "Mantenimiento",cls: "badgeManto"      },
};

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

const FORM_VACIO = {
  nombre: "", ubicacion: "", lat: "", lng: "",
  ancho: "", alto: "", costoProduccion: "", costoInstalacion: "", precioMes: "",
};

/* ── Sub-componentes ─────────────────────────────────────────────────────── */

function EstadoBadge({ estado }) {
  const meta = ESTADO_META[estado] ?? { label: estado, cls: "badgeDisponible" };
  return <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>;
}

function MapModal({ panel, onClose }) {
  const src = panel.lat && panel.lng
    ? `https://maps.google.com/maps?q=${panel.lat},${panel.lng}&z=16&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(panel.ubicacion)}&z=15&output=embed`;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.mapModal}>
        <div className={styles.mapHeader}>
          <div>
            <p className={styles.mapTitle}>{panel.codigo} — {panel.nombre}</p>
            <p className={styles.mapSub}>{panel.ubicacion}</p>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>
        <iframe
          title="Mapa del panel"
          src={src}
          className={styles.mapIframe}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </div>
  );
}

function PanelFormModal({ inicial, onSave, onCancel }) {
  const [form, setForm] = useState(inicial ?? FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.ubicacion || !form.ancho || !form.alto || !form.precioMes) {
      setError("Nombre, ubicación, medidas y precio son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{inicial ? "Editar panel" : "Nuevo panel"}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formField}>
            <label>Nombre del panel</label>
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Panel Principal Av. Arequipa" />
          </div>

          <div className={styles.formField}>
            <label>Dirección / Ubicación</label>
            <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Ej. Av. Arequipa 340, Miraflores" />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Latitud <span className={styles.opcional}>(opcional)</span></label>
              <input type="number" step="any" value={form.lat} onChange={set("lat")} placeholder="-12.1234" />
            </div>
            <div className={styles.formField}>
              <label>Longitud <span className={styles.opcional}>(opcional)</span></label>
              <input type="number" step="any" value={form.lng} onChange={set("lng")} placeholder="-77.0234" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Ancho (m)</label>
              <input type="number" step="0.1" min="0" value={form.ancho} onChange={set("ancho")} placeholder="6" />
            </div>
            <div className={styles.formField}>
              <label>Alto (m)</label>
              <input type="number" step="0.1" min="0" value={form.alto} onChange={set("alto")} placeholder="3" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Costo producción (S/)</label>
              <input type="number" step="0.01" min="0" value={form.costoProduccion} onChange={set("costoProduccion")} placeholder="0" />
            </div>
            <div className={styles.formField}>
              <label>Costo instalación (S/)</label>
              <input type="number" step="0.01" min="0" value={form.costoInstalacion} onChange={set("costoInstalacion")} placeholder="0" />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Precio de alquiler / mes (S/)</label>
            <input type="number" step="0.01" min="0" value={form.precioMes} onChange={set("precioMes")} placeholder="2500" />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Guardar panel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ────────────────────────────────────────────────────── */

export default function Paneles() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [paneles, setPaneles]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [mapPanel, setMapPanel]     = useState(null);
  const [editPanel, setEditPanel]   = useState(null);
  const [showForm, setShowForm]     = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setPaneles(await getPaneles()); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear = async (form) => {
    await createPanel(form);
    setShowForm(false);
    cargar();
  };

  const handleEditar = async (form) => {
    await updatePanel(editPanel.id, form);
    setEditPanel(null);
    cargar();
  };

  const handleEstado = async (panel, estado) => {
    await cambiarEstadoPanel(panel.id, estado);
    cargar();
  };

  const handleEliminar = async (panel) => {
    if (!confirm(`¿Eliminar "${panel.nombre}"? Esta acción no se puede deshacer.`)) return;
    await deletePanel(panel.id);
    cargar();
  };

  const formInicial = editPanel
    ? {
        nombre: editPanel.nombre, ubicacion: editPanel.ubicacion,
        lat: editPanel.lat ?? "", lng: editPanel.lng ?? "",
        ancho: editPanel.ancho, alto: editPanel.alto,
        costoProduccion: editPanel.costoProduccion,
        costoInstalacion: editPanel.costoInstalacion,
        precioMes: editPanel.precioMes,
      }
    : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Paneles Publicitarios</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${paneles.length} panel${paneles.length !== 1 ? "es" : ""} registrado${paneles.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar">
            <RefreshCw size={16} />
          </button>
          {isAdmin && (
            <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nuevo panel
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableContainer}>
        {loading ? (
          <p className={styles.empty}>Cargando paneles…</p>
        ) : paneles.length === 0 ? (
          <p className={styles.empty}>No hay paneles registrados aún.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Ubicación del Panel</th>
                <th>Medidas</th>
                <th>Costo Prod. / Inst.</th>
                <th>Estado</th>
                <th>Precio / mes</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {paneles.map((p) => (
                <tr key={p.id}>
                  <td className={styles.tdCodigo}>{p.codigo}</td>

                  <td>
                    <div className={styles.tdUbicacion}>
                      <span className={styles.panelNombre}>{p.nombre}</span>
                      <span className={styles.panelDir}>{p.ubicacion}</span>
                      <button
                        className={styles.btnMap}
                        onClick={() => setMapPanel(p)}
                        title="Ver en mapa"
                      >
                        <MapPin size={13} /> Ver mapa
                      </button>
                    </div>
                  </td>

                  <td>
                    <div className={styles.tdMedidas}>
                      <span className={styles.medidas}>{p.ancho} × {p.alto} m</span>
                      <span className={styles.area}>{(p.ancho * p.alto).toFixed(1)} m²</span>
                    </div>
                  </td>

                  <td>
                    <div className={styles.tdCostos}>
                      <span>Prod: {fmt(p.costoProduccion)}</span>
                      <span>Inst: {fmt(p.costoInstalacion)}</span>
                    </div>
                  </td>

                  <td>
                    {isAdmin ? (
                      <select
                        className={styles.selectEstado}
                        value={p.estado}
                        onChange={(e) => handleEstado(p, e.target.value)}
                      >
                        {ESTADOS.map((est) => (
                          <option key={est} value={est}>{ESTADO_META[est].label}</option>
                        ))}
                      </select>
                    ) : (
                      <EstadoBadge estado={p.estado} />
                    )}
                  </td>

                  <td className={styles.tdPrecio}>{fmt(p.precioMes)}</td>

                  {isAdmin && (
                    <td>
                      <div className={styles.tdActions}>
                        <button
                          className={styles.btnGhost}
                          onClick={() => setEditPanel(p)}
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className={`${styles.btnGhost} ${styles.btnDanger}`}
                          onClick={() => handleEliminar(p)}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      {mapPanel && <MapModal panel={mapPanel} onClose={() => setMapPanel(null)} />}

      {showForm && (
        <PanelFormModal
          inicial={null}
          onSave={handleCrear}
          onCancel={() => setShowForm(false)}
        />
      )}

      {editPanel && (
        <PanelFormModal
          inicial={formInicial}
          onSave={handleEditar}
          onCancel={() => setEditPanel(null)}
        />
      )}
    </div>
  );
}
