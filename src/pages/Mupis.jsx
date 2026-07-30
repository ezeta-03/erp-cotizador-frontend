import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, MapPin, Edit2, Trash2, RefreshCw, X, ExternalLink, Upload, Download } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useAuth from "../auth/useAuth";
import {
  getPaneles, createPanel, updatePanel,
  deletePanel, importarPaneles,
} from "../api/paneles";
import styles from "./paneles.module.scss";
import { ESTADO_META } from "../constants/estados";

/* ── Constantes ────────────────────────────────────────────────────────────── */
const DISTRITOS = ["HUANCAYO", "EL_TAMBO", "CHILCA"];
const DISTRITO_LABEL = { HUANCAYO: "Huancayo", EL_TAMBO: "El Tambo", CHILCA: "Chilca" };

const fmt = (v) =>
  v != null && v !== ""
    ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v)
    : "—";

const FORM_VACIO = {
  codigo: "", nombre: "", distrito: "", tipo: "MUPI",
  ubicacion: "", lat: "", lng: "",
  ancho: "", alto: "", costoProduccion: "0", costoInstalacion: "0",
  precioMes: "",
};

/* ── Datos plantilla CSV (12 mupis — hoja "MUPIS - PALETAS") ───────────────── */
const CSV_FILAS = [
  ["MUPI-01","Giraldez y FFCC","","MUPI"],
  ["MUPI-02","Giraldez y Huancas","","MUPI"],
  ["MUPI-03","FFCC y Centenario","","MUPI"],
  ["MUPI-04","Huancas y Centenario","","MUPI"],
  ["MUPI-05","Solano y Centenario","","MUPI"],
  ["MUPI-06","Solano y Abancay (Parque Tupac)","","MUPI"],
  ["MUPI-07","Uruguay y Leandra Torres (Parque Tupac)","","MUPI"],
  ["MUPI-08","San Carlos y Aurora","","MUPI"],
  ["MUPI-09","FFCC Cdra 01 (Open Plaza)","","MUPI"],
  ["MUPI-10","Prol. San Carlos Cdra 01 (Open Plaza)","","MUPI"],
  ["MUPI-11","Puno y Junin (Hospital El Carmen)","","MUPI"],
  ["MUPI-12","Carrion y Tacna","","MUPI"],
];

const CSV_HEADERS = "codigo,nombre,distrito,tipo,ubicacion,lat,lng,ancho,alto,costoProduccion,costoInstalacion,precioMes,estado";

function descargarPlantilla() {
  const filas = CSV_FILAS.map(([codigo, nombre, distrito, tipo]) =>
    `${codigo},"${nombre}",${distrito},${tipo},,,,,,,,, LIBRE`
  );
  const contenido = [CSV_HEADERS, ...filas].join("\n");
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "mupis.csv"; a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { values.push(cur.trim().replace(/^"|"$/g, "")); cur = ""; }
      else { cur += ch; }
    }
    values.push(cur.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  }).map((fila) => ({ ...fila, tipo: "MUPI" }));
}

/* ── Mapa (Leaflet) ──────────────────────────────────────────────────────── */
function parseCoords(panel) {
  const lat = parseFloat(panel.lat);
  const lng = parseFloat(panel.lng);
  return isFinite(lat) && isFinite(lng) ? { lat, lng } : null;
}

const MARKER_ICON = L.divIcon({
  className: "",
  html: `<svg width="28" height="40" viewBox="0 0 28 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#f97316"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
  </svg>`,
  iconSize: [28, 40],
  iconAnchor: [14, 40],
});

function MapModal({ panel, onClose }) {
  const coords = parseCoords(panel);
  const hasCoords = !!coords;
  const { lat, lng } = coords ?? {};
  const containerRef = useRef(null);

  const gmapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(panel.ubicacion ?? panel.nombre)}`;

  useEffect(() => {
    if (!hasCoords || !containerRef.current) return;
    const el = containerRef.current;
    let map = null;
    const timer = setTimeout(() => {
      if (!el) return;
      map = L.map(el, { center: [lat, lng], zoom: 16, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      L.marker([lat, lng], { icon: MARKER_ICON }).addTo(map);
    }, 320);
    return () => { clearTimeout(timer); if (map) map.remove(); };
  }, [lat, lng, hasCoords]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.mapModal}>
        <div className={styles.mapHeader}>
          <div>
            <p className={styles.mapTitle}>{panel.codigo} — {panel.nombre || "(sin nombre)"}</p>
            <p className={styles.mapSub}>{panel.ubicacion || DISTRITO_LABEL[panel.distrito] || "—"}</p>
          </div>
          <div className={styles.mapHeaderActions}>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer" className={styles.btnMapLink}>
              <ExternalLink size={13} /> Abrir en Maps
            </a>
            <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
          </div>
        </div>
        {hasCoords ? (
          <div ref={containerRef} className={styles.mapIframe} />
        ) : (
          <div className={styles.mapNoCoords}>
            <MapPin size={28} />
            <p>Sin coordenadas GPS registradas.</p>
            <a href={gmapsUrl} target="_blank" rel="noopener noreferrer">
              Buscar en Google Maps →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Formulario ──────────────────────────────────────────────────────────── */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

function MupiFormModal({ inicial, onSave, onCancel }) {
  const [form, setForm]     = useState(inicial ?? FORM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.codigo) { setError("El código es obligatorio."); return; }
    setSaving(true);
    try { await onSave({ ...form, tipo: "MUPI" }); }
    catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{inicial ? "Editar mupi" : "Nuevo mupi"}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formRow}>
            <F label="Código">
              <input value={form.codigo} onChange={set("codigo")} placeholder="MUPI-01" style={{ textTransform: "uppercase" }} />
            </F>
            <F label="Distrito" optional>
              <select value={form.distrito} onChange={set("distrito")}>
                <option value="">Sin distrito</option>
                {DISTRITOS.map(d => <option key={d} value={d}>{DISTRITO_LABEL[d]}</option>)}
              </select>
            </F>
          </div>

          <F label="Nombre / ubicación">
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Giraldez y FFCC" />
          </F>

          <F label="Dirección / referencia" optional>
            <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Ej. Frente a Real Plaza" />
          </F>

          <div className={styles.formRow}>
            <F label="Latitud" optional>
              <input type="text" inputMode="decimal" value={form.lat} onChange={set("lat")} placeholder="-12.093638" />
            </F>
            <F label="Longitud" optional>
              <input type="text" inputMode="decimal" value={form.lng} onChange={set("lng")} placeholder="-76.963586" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Ancho (m)" optional>
              <input type="number" step="0.01" min="0" value={form.ancho} onChange={set("ancho")} placeholder="1.2" />
            </F>
            <F label="Alto (m)" optional>
              <input type="number" step="0.01" min="0" value={form.alto} onChange={set("alto")} placeholder="1.8" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Costo producción (S/)" optional>
              <input type="number" step="0.01" min="0" value={form.costoProduccion} onChange={set("costoProduccion")} placeholder="0" />
            </F>
            <F label="Costo instalación (S/)" optional>
              <input type="number" step="0.01" min="0" value={form.costoInstalacion} onChange={set("costoInstalacion")} placeholder="0" />
            </F>
          </div>

          <F label="Precio de alquiler / mes (S/)" optional>
            <input type="number" step="0.01" min="0" value={form.precioMes} onChange={set("precioMes")} placeholder="562.50" />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Guardar mupi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Badges ──────────────────────────────────────────────────────────────── */
function EstadoBadge({ estado }) {
  const meta = ESTADO_META[estado] ?? { label: estado, cls: "badgeLibre" };
  return <span className={`${styles.badge} ${styles[meta.cls]}`}>{meta.label}</span>;
}

/* ── Página principal ────────────────────────────────────────────────────── */
export default function Mupis() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const fileRef = useRef(null);

  const [mupis, setMupis]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mapPanel, setMapPanel]   = useState(null);
  const [editPanel, setEditPanel] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setMupis((await getPaneles()).filter((p) => p.tipo === "MUPI")); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCrear  = async (form) => { await createPanel(form);              setShowForm(false); cargar(); };
  const handleEditar = async (form) => { await updatePanel(editPanel.id, form); setEditPanel(null); cargar(); };
  const handleEliminar = async (panel) => {
    if (!confirm(`¿Eliminar "${panel.codigo}"? Esta acción no se puede deshacer.`)) return;
    await deletePanel(panel.id);
    cargar();
  };

  const handleImportarCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    setImportMsg(null);
    try {
      const text  = await file.text();
      const filas = parseCSV(text);
      const res   = await importarPaneles(filas);
      setImportMsg({ ok: true, texto: `${res.creados} mupis creados, ${res.actualizados} actualizados${res.errores.length ? `, ${res.errores.length} con error` : ""}.` });
      cargar();
    } catch (err) {
      setImportMsg({ ok: false, texto: err.response?.data?.message ?? "Error al importar" });
    } finally {
      setImporting(false);
    }
  };

  const formInicial = editPanel ? {
    codigo: editPanel.codigo, nombre: editPanel.nombre ?? "",
    distrito: editPanel.distrito ?? "", tipo: "MUPI",
    ubicacion: editPanel.ubicacion ?? "", lat: editPanel.lat ?? "", lng: editPanel.lng ?? "",
    ancho: editPanel.ancho ?? "", alto: editPanel.alto ?? "",
    costoProduccion: editPanel.costoProduccion ?? "0",
    costoInstalacion: editPanel.costoInstalacion ?? "0",
    precioMes: editPanel.precioMes ?? "",
  } : null;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Mupis</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${mupis.length} mupi${mupis.length !== 1 ? "s" : ""} registrado${mupis.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (<>
            <button className={styles.btnOutline} onClick={descargarPlantilla} title="Descargar plantilla CSV">
              <Download size={16} /> Plantilla
            </button>
            <button
              className={styles.btnOutline}
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              title="Importar CSV"
            >
              <Upload size={16} /> {importing ? "Importando…" : "Importar CSV"}
            </button>
            <input ref={fileRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleImportarCSV} />
            <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nuevo mupi
            </button>
          </>)}
        </div>
      </div>

      {/* Mensaje de importación */}
      {importMsg && (
        <div className={importMsg.ok ? styles.alertOk : styles.alertError}>
          {importMsg.texto}
          <button onClick={() => setImportMsg(null)} style={{ marginLeft: "0.75rem", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>✕</button>
        </div>
      )}

      {/* Tabla */}
      <div className={styles.tableContainer}>
        {loading ? (
          <p className={styles.empty}>Cargando mupis…</p>
        ) : mupis.length === 0 ? (
          <p className={styles.empty}>No hay mupis registrados. Usa "Importar CSV" o "Nuevo mupi".</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Mupi</th>
                <th>Distrito</th>
                <th>Medidas</th>
                <th>Precio / mes</th>
                <th>Estado</th>
                <th>Mapa</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {mupis.map((p) => (
                <tr key={p.id}>
                  <td className={styles.tdCodigo}>{p.codigo}</td>

                  <td>
                    <div className={styles.tdUbicacion}>
                      <span className={styles.panelNombre}>{p.nombre || <em style={{ color: "var(--color-text3)", fontStyle: "normal" }}>Sin nombre</em>}</span>
                      {p.ubicacion && <span className={styles.panelDir}>{p.ubicacion}</span>}
                    </div>
                  </td>

                  <td style={{ fontSize: "0.82rem", color: "var(--color-text2)", whiteSpace: "nowrap" }}>
                    {DISTRITO_LABEL[p.distrito] ?? "—"}
                  </td>

                  <td>
                    {p.ancho && p.alto ? (
                      <div className={styles.tdMedidas}>
                        <span className={styles.medidas}>{p.ancho} × {p.alto} m</span>
                        <span className={styles.area}>{(p.ancho * p.alto).toFixed(1)} m²</span>
                      </div>
                    ) : <span style={{ color: "var(--color-text3)", fontSize: "0.8rem" }}>—</span>}
                  </td>

                  <td className={styles.tdPrecio}>{fmt(p.precioMes)}</td>

                  <td>
                    <EstadoBadge estado={p.estado} />
                  </td>

                  <td>
                    <button className={styles.btnMap} onClick={() => setMapPanel(p)} title="Ver en mapa">
                      <MapPin size={13} /> Ver mapa
                    </button>
                  </td>

                  {isAdmin && (
                    <td>
                      <div className={styles.tdActions}>
                        <button className={styles.btnGhost} onClick={() => setEditPanel(p)} title="Editar">
                          <Edit2 size={14} />
                        </button>
                        <button className={`${styles.btnGhost} ${styles.btnDanger}`} onClick={() => handleEliminar(p)} title="Eliminar">
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
      {mapPanel  && <MapModal panel={mapPanel} onClose={() => setMapPanel(null)} />}
      {showForm  && <MupiFormModal inicial={null}       onSave={handleCrear}  onCancel={() => setShowForm(false)} />}
      {editPanel && <MupiFormModal inicial={formInicial} onSave={handleEditar} onCancel={() => setEditPanel(null)} />}
    </div>
  );
}
