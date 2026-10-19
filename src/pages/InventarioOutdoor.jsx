import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, MapPin, Edit2, Trash2, RefreshCw, X, ExternalLink, Upload, Download, Archive } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import useAuth from "../auth/useAuth";
import {
  getPaneles, createPanel, updatePanel,
  deletePanel, importarPaneles,
} from "../api/paneles";
import styles from "./paneles.module.scss";
import { ESTADO_META } from "../constants/estados";
import PapeleraPanelesModal from "../coomponents/PapeleraPanelesModal";
import { soles } from "../utils/formato";

// Inventario Outdoor: paneles y mupis son el mismo recurso (/paneles) filtrado
// por tipo. Esta página sirve a ambos; lo que cambia está en CONFIG.

/* ── Constantes ────────────────────────────────────────────────────────────── */
const DISTRITOS = ["HUANCAYO", "EL_TAMBO", "CHILCA"];
const DISTRITO_LABEL = { HUANCAYO: "Huancayo", EL_TAMBO: "El Tambo", CHILCA: "Chilca" };
const TIPOS_PANEL = ["ESTATICO", "LED"];

const fmt = (v) =>
  v != null && v !== ""
    ? soles(v)
    : "—";

const FORM_BASE = {
  codigo: "", nombre: "", ubicacion: "", lat: "", lng: "",
  ancho: "", alto: "", costoProduccion: "0", costoInstalacion: "0",
  precioMes: "", propiedad: "PROPIO",
};

const CSV_HEADERS = "codigo,nombre,distrito,tipo,ubicacion,lat,lng,ancho,alto,costoProduccion,costoInstalacion,precioMes,estado,propiedad";

const CONFIG = {
  panel: {
    esMupi: false,
    titulo: "Paneles Publicitarios",
    singular: "panel",
    plural: "paneles",
    columna: "Panel",
    perteneceAlTipo: (p) => p.tipo !== "MUPI",
    tipoFijo: null,
    distritoOpcional: false,
    distritoDefault: "HUANCAYO",
    tipoDefault: "ESTATICO",
    archivoPlantilla: "paneles_huancayo.csv",
    placeholders: {
      codigo: "HYO-01", nombre: "Ej. Portico Giraldez Cara 01", ubicacion: "Ej. Av. Real 340, El Tambo",
      ancho: "6", alto: "3", precioMes: "2500",
    },
    etiquetaNombre: "Nombre del panel",
    nombreOpcional: true,
    etiquetaUbicacion: "Dirección / Ubicación",
    // Plantilla CSV: 36 paneles de Huancayo
    filasPlantilla: [
      ["HYO-01","Portico Giraldez Cara 01","HUANCAYO","ESTATICO"],
    ["HYO-02","Portico Giraldez Cara 02","HUANCAYO","ESTATICO"],
    ["HYO-03","FFCC y Puno","HUANCAYO","ESTATICO"],
    ["HYO-04","Ica y FFCC Cara A","HUANCAYO","ESTATICO"],
    ["HYO-05","Ica y FFCC Cara B","HUANCAYO","ESTATICO"],
    ["HYO-06","Cajamarca y Mantaro Modelo","HUANCAYO","ESTATICO"],
    ["HYO-07","Cajamarca y FFCC Cara A","HUANCAYO","ESTATICO"],
    ["HYO-08","Cajamarca y FFCC Cara B","HUANCAYO","ESTATICO"],
    ["HYO-09","Giraldez y Guido Aguirre","HUANCAYO","ESTATICO"],
    ["HYO-10","Giraldez y Huancas","HUANCAYO","ESTATICO"],
    ["HYO-11","Uruguay y Leandra Torres Cara A","HUANCAYO","ESTATICO"],
    ["HYO-12","Uruguay y Leandra Torres Cara B","HUANCAYO","ESTATICO"],
    ["HYO-13","FFCC y Centenario","HUANCAYO","ESTATICO"],
    ["HYO-14","FFCC y Centenario Torre Cara A","HUANCAYO","ESTATICO"],
    ["HYO-15","FFCC y Centenario Torre Cara B","HUANCAYO","ESTATICO"],
    ["HYOL-01","Panel LED Buho Frente Real Plaza","HUANCAYO","LED"],
    ["HYO-16","Bajada del Tambo","EL_TAMBO","ESTATICO"],
    ["HYO-17","Mariategui","EL_TAMBO","ESTATICO"],
    ["HYO-18","Real Frente a Comisaria del Tambo","EL_TAMBO","ESTATICO"],
    ["HYO-19","Real y Sumar","EL_TAMBO","ESTATICO"],
    ["HYO-20","Real y Circunvalacion Torre Petty Cara A","EL_TAMBO","ESTATICO"],
    ["HYO-21","Real y Circunvalacion Torre Petty Cara B","EL_TAMBO","ESTATICO"],
    ["HYO-22","Real y Circunvalacion Esquina","EL_TAMBO","ESTATICO"],
    ["HYO-23","Real y Evitamiento Torre Cara A","EL_TAMBO","ESTATICO"],
    ["HYO-24","Real y Evitamiento Torre Cara B","EL_TAMBO","ESTATICO"],
    ["HYO-25","Huancavelica y 13 de Nov Cara A JMT","EL_TAMBO","ESTATICO"],
    ["HYO-26","Huancavelica y 13 de Nov Cara B JMT","EL_TAMBO","ESTATICO"],
    ["HYO-27","","EL_TAMBO","ESTATICO"],
    ["HYO-28","","EL_TAMBO","ESTATICO"],
    ["HYO-29","","EL_TAMBO","ESTATICO"],
    ["HYO-30","","EL_TAMBO","ESTATICO"],
    ["HYOL-02","Panel LED Buho Bajada del Tambo","EL_TAMBO","LED"],
    ["HYO-31","Parque Los Heroes (Panel Valla)","CHILCA","ESTATICO"],
    ["HYO-32","Leoncio Prado y Huancavelica","CHILCA","ESTATICO"],
    ["HYO-33","Huancavelica y FFCC (Esquina)","CHILCA","ESTATICO"],
    ["HYO-34","FFCC y Huancavelica (Hacia Pared Cli Mira)","CHILCA","ESTATICO"],
    ],
  },
  mupi: {
    esMupi: true,
    titulo: "Mupis",
    singular: "mupi",
    plural: "mupis",
    columna: "Mupi",
    perteneceAlTipo: (p) => p.tipo === "MUPI",
    tipoFijo: "MUPI",
    distritoOpcional: true,
    distritoDefault: "",
    tipoDefault: "MUPI",
    archivoPlantilla: "mupis.csv",
    placeholders: {
      codigo: "MUPI-01", nombre: "Ej. Giraldez y FFCC", ubicacion: "Ej. Frente a Real Plaza",
      ancho: "1.2", alto: "1.8", precioMes: "562.50",
    },
    etiquetaNombre: "Nombre / ubicación",
    nombreOpcional: false,
    etiquetaUbicacion: "Dirección / referencia",
    // Plantilla CSV: 12 mupis (hoja "MUPIS - PALETAS")
    filasPlantilla: [
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
    ],
  },
};

function descargarPlantilla(cfg) {
  const filas = cfg.filasPlantilla.map(([codigo, nombre, distrito, tipo]) =>
    `${codigo},"${nombre}",${distrito},${tipo},,,,,,,,, LIBRE`
  );
  const contenido = [CSV_HEADERS, ...filas].join("\n");
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = cfg.archivoPlantilla; a.click();
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
  });
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
    <path d="M14 0C6.268 0 0 6.268 0 14C0 24.5 14 40 14 40C14 40 28 24.5 28 14C28 6.268 21.732 0 14 0Z" fill="#ff6600"/>
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

function ItemFormModal({ cfg, inicial, onSave, onCancel }) {
  const [form, setForm] = useState(
    inicial ?? { ...FORM_BASE, distrito: cfg.distritoDefault, tipo: cfg.tipoDefault }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");
  const ph = cfg.placeholders;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.codigo) { setError("El código es obligatorio."); return; }
    setSaving(true);
    try { await onSave(cfg.tipoFijo ? { ...form, tipo: cfg.tipoFijo } : form); }
    catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  const campoDistrito = (
    <F label="Distrito" optional={cfg.distritoOpcional}>
      <select value={form.distrito} onChange={set("distrito")}>
        {cfg.distritoOpcional && <option value="">Sin distrito</option>}
        {DISTRITOS.map(d => <option key={d} value={d}>{DISTRITO_LABEL[d]}</option>)}
      </select>
    </F>
  );

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{inicial ? `Editar ${cfg.singular}` : `Nuevo ${cfg.singular}`}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formRow}>
            <F label="Código">
              <input value={form.codigo} onChange={set("codigo")} placeholder={ph.codigo} style={{ textTransform: "uppercase" }} />
            </F>
            {cfg.tipoFijo ? campoDistrito : (
              <F label="Tipo">
                <select value={form.tipo} onChange={set("tipo")}>
                  {TIPOS_PANEL.map(t => <option key={t} value={t}>{t === "ESTATICO" ? "Estático" : "LED"}</option>)}
                </select>
              </F>
            )}
          </div>

          {!cfg.tipoFijo && campoDistrito}

          <F label={cfg.etiquetaNombre} optional={cfg.nombreOpcional}>
            <input value={form.nombre} onChange={set("nombre")} placeholder={ph.nombre} />
          </F>

          <F label={cfg.etiquetaUbicacion} optional>
            <input value={form.ubicacion} onChange={set("ubicacion")} placeholder={ph.ubicacion} />
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
              <input type="number" step="0.01" min="0" value={form.ancho} onChange={set("ancho")} placeholder={ph.ancho} />
            </F>
            <F label="Alto (m)" optional>
              <input type="number" step="0.01" min="0" value={form.alto} onChange={set("alto")} placeholder={ph.alto} />
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
            <input type="number" step="0.01" min="0" value={form.precioMes} onChange={set("precioMes")} placeholder={ph.precioMes} />
          </F>

          <F label="Propiedad">
            <select value={form.propiedad} onChange={set("propiedad")}>
              <option value="PROPIO">Propio</option>
              <option value="EXTERNO">Externo (gestionado por un tercero)</option>
            </select>
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : `Guardar ${cfg.singular}`}
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
// tipo: "panel" | "mupi"
export default function InventarioOutdoor({ tipo }) {
  const cfg = CONFIG[tipo];
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const fileRef = useRef(null);

  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [mapPanel, setMapPanel]   = useState(null);
  const [editPanel, setEditPanel] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState(null);
  const [showEliminados, setShowEliminados] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try { setItems((await getPaneles()).filter(cfg.perteneceAlTipo)); }
    catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [cfg]);

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
      let filas = parseCSV(text);
      if (cfg.tipoFijo) filas = filas.map((fila) => ({ ...fila, tipo: cfg.tipoFijo }));
      const res   = await importarPaneles(filas);
      setImportMsg({ ok: true, texto: `${res.creados} ${cfg.plural} creados, ${res.actualizados} actualizados${res.errores.length ? `, ${res.errores.length} con error` : ""}.` });
      cargar();
    } catch (err) {
      setImportMsg({ ok: false, texto: err.response?.data?.message ?? "Error al importar" });
    } finally {
      setImporting(false);
    }
  };

  const formInicial = editPanel ? {
    codigo: editPanel.codigo, nombre: editPanel.nombre ?? "",
    distrito: editPanel.distrito ?? cfg.distritoDefault, tipo: cfg.tipoFijo ?? editPanel.tipo ?? cfg.tipoDefault,
    ubicacion: editPanel.ubicacion ?? "", lat: editPanel.lat ?? "", lng: editPanel.lng ?? "",
    ancho: editPanel.ancho ?? "", alto: editPanel.alto ?? "",
    costoProduccion: editPanel.costoProduccion ?? "0",
    costoInstalacion: editPanel.costoInstalacion ?? "0",
    precioMes: editPanel.precioMes ?? "",
    propiedad: editPanel.propiedad ?? "PROPIO",
  } : null;

  const n = items.length;
  const conteo = tipo === "panel"
    ? `${n} panel${n !== 1 ? "es" : ""} registrado${n !== 1 ? "s" : ""}`
    : `${n} mupi${n !== 1 ? "s" : ""} registrado${n !== 1 ? "s" : ""}`;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{cfg.titulo}</h1>
          <p className={styles.subtitle}>{loading ? "Cargando…" : conteo}</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (<>
            <button className={styles.btnOutline} onClick={() => setShowEliminados(true)} title={`Ver ${cfg.plural} eliminados`}>
              <Archive size={16} /> Eliminados
            </button>
            <button className={styles.btnOutline} onClick={() => descargarPlantilla(cfg)} title="Descargar plantilla CSV">
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
              <Plus size={18} /> Nuevo {cfg.singular}
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
          <p className={styles.empty}>Cargando {cfg.plural}…</p>
        ) : n === 0 ? (
          <p className={styles.empty}>No hay {cfg.plural} registrados. Usa "Importar CSV" o "Nuevo {cfg.singular}".</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>{cfg.columna}</th>
                <th>Distrito</th>
                {!cfg.tipoFijo && <th>Tipo</th>}
                <th>Medidas</th>
                <th>Precio / mes</th>
                <th>Estado</th>
                <th>Propiedad</th>
                <th>Mapa</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
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

                  {!cfg.tipoFijo && (
                    <td style={{ fontSize: "0.8rem", whiteSpace: "nowrap" }}>
                      {p.tipo === "LED" ? <span className={styles.badgeLed}>LED</span> : "Estático"}
                    </td>
                  )}

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

                  <td style={{ fontSize: "0.8rem", color: "var(--color-text2)", whiteSpace: "nowrap" }}>
                    {p.propiedad === "EXTERNO" ? "Externo" : "Propio"}
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
      {showForm  && <ItemFormModal cfg={cfg} inicial={null}        onSave={handleCrear}  onCancel={() => setShowForm(false)} />}
      {editPanel && <ItemFormModal cfg={cfg} inicial={formInicial} onSave={handleEditar} onCancel={() => setEditPanel(null)} />}
      {showEliminados && (
        <PapeleraPanelesModal esMupi={cfg.esMupi} styles={styles} onClose={() => setShowEliminados(false)} onRestaurado={cargar} />
      )}
    </div>
  );
}
