import { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, RefreshCw, X, FileText, AlertTriangle, ChevronDown, ChevronUp, Search } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getProveedores, createProveedor, updateProveedor, deleteProveedor, getAlertasPagos, getResumenPagos,
} from "../api/proveedores";
import { ProveedoresKPI } from "../coomponents/Charts";
import FichaProveedorModal from "./FichaProveedorModal";
import styles from "./proveedores.module.scss";

const RELEVANCIA = ["ALTO", "MEDIO", "BAJO"];

/* ── Resumen de módulo proveedores ──────────────────────────────────────── */
function ProveedoresResumen({ data }) {
  if (!data) return null;
  const { anio, totalProveedores, estadoConteo = {}, totalPendiente, totalCancelado } = data;
  const totalAnual = totalPendiente + totalCancelado;
  const pctPagado  = totalAnual > 0 ? Math.round((totalCancelado / totalAnual) * 100) : 0;
  const fmtC = (v) => new Intl.NumberFormat("es-PE", {
    style: "currency", currency: "PEN", notation: "compact", maximumFractionDigits: 1,
  }).format(v);

  const ec = estadoConteo;
  const tiles = [
    { valor: totalProveedores,   label: "Proveedores activos", color: "#6366f1", bg: "rgba(99,102,241,0.08)",  border: "rgba(99,102,241,0.18)"  },
    { valor: ec.VIGENTE    ?? 0, label: "Vigentes",            color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.18)"  },
    { valor: ec.VENCIDO    ?? 0, label: "Vencidos",
      color:  (ec.VENCIDO  ?? 0) > 0 ? "#ef4444" : "#94a3b8",
      bg:     (ec.VENCIDO  ?? 0) > 0 ? "rgba(239,68,68,0.08)"   : "rgba(148,163,184,0.06)",
      border: (ec.VENCIDO  ?? 0) > 0 ? "rgba(239,68,68,0.18)"   : "rgba(148,163,184,0.12)",
    },
    { valor: ec.SUSPENDIDO ?? 0, label: "Suspendidos",
      color:  (ec.SUSPENDIDO ?? 0) > 0 ? "#f59e0b" : "#94a3b8",
      bg:     (ec.SUSPENDIDO ?? 0) > 0 ? "rgba(245,158,11,0.08)" : "rgba(148,163,184,0.06)",
      border: (ec.SUSPENDIDO ?? 0) > 0 ? "rgba(245,158,11,0.18)" : "rgba(148,163,184,0.12)",
    },
    { valor: fmtC(totalPendiente), label: `Por pagar ${anio}`, color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.18)"  },
    { valor: fmtC(totalCancelado), label: `Pagado ${anio}`,    color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.18)"  },
    { valor: `${pctPagado}%`,      label: "Cuotas pagadas",
      color:  pctPagado >= 50 ? "#10b981" : pctPagado >= 25 ? "#f59e0b" : "#ef4444",
      bg:     pctPagado >= 50 ? "rgba(16,185,129,0.08)" : pctPagado >= 25 ? "rgba(245,158,11,0.08)" : "rgba(239,68,68,0.08)",
      border: pctPagado >= 50 ? "rgba(16,185,129,0.18)" : pctPagado >= 25 ? "rgba(245,158,11,0.18)" : "rgba(239,68,68,0.18)",
    },
  ];
  const barColor = pctPagado >= 50 ? "#10b981" : pctPagado >= 25 ? "#f59e0b" : "#ef4444";

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "var(--color-text1)" }}>Módulo Proveedores</h3>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "var(--color-text3)" }}>resumen {anio}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.65rem" }}>
        {tiles.map((t, i) => (
          <div key={i} style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: "10px", padding: "0.875rem 1rem" }}>
            <p style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: t.color, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{t.valor}</p>
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.7rem", color: "var(--color-text2)", fontWeight: 500, lineHeight: 1.3 }}>{t.label}</p>
          </div>
        ))}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.35rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text2)" }}>Progreso de pagos {anio}</span>
          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: barColor }}>{pctPagado}%</span>
        </div>
        <div style={{ height: "6px", background: "var(--color-border)", borderRadius: "99px", overflow: "hidden" }}>
          <div style={{ width: `${pctPagado}%`, height: "100%", background: barColor, borderRadius: "99px", transition: "width 0.4s" }} />
        </div>
      </div>
    </div>
  );
}

const fmtDate = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const CIUDADES_DEFAULT    = ["HUANCAYO", "AREQUIPA", "ICA"];
const CONTRATOS_DEFAULT   = ["ALQUILER"];

const calcFin = (inicio, meses) => {
  if (!inicio || !meses || parseInt(meses) <= 0) return null;
  const d = new Date(inicio + "T00:00:00");
  d.setMonth(d.getMonth() + parseInt(meses));
  return d.toISOString().slice(0, 10);
};

const calcMeses = (inicio, fin) => {
  if (!inicio || !fin) return "12";
  const d1 = new Date(String(inicio).slice(0, 10) + "T00:00:00");
  const d2 = new Date(String(fin).slice(0, 10) + "T00:00:00");
  return String(Math.max(1, (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())));
};

const FORM_VACIO = {
  nombre: "", ciudad: "", ubicacion: "", tipoContrato: "", elementos: "",
  inicio: "", meses: "12", costoMensual: "", costoLuzMes: "",
  numeroCuenta: "", nombreCuenta: "", relevanciaComercial: "ALTO", razonSocial: "",
};

const fmtDMY = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ── Banner de alertas de pagos próximos ─────────────────────────────────── */
function AlertasBanner({ alertas, onAbrirFicha }) {
  const [abierto, setAbierto] = useState(false);
  if (!alertas || alertas.length === 0) return null;

  const rojas     = alertas.filter((a) => a.urgencia === "ROJA");
  const amarillas = alertas.filter((a) => a.urgencia === "AMARILLA");
  const esRojo    = rojas.length > 0;

  const resumen = [
    rojas.length > 0     && `${rojas.length} vence${rojas.length > 1 ? "n" : ""} en 7 días`,
    amarillas.length > 0 && `${amarillas.length} vence${amarillas.length > 1 ? "n" : ""} en 15 días`,
  ].filter(Boolean).join(" · ");

  return (
    <div className={`${styles.alertaBanner} ${esRojo ? styles.alertaBannerRojo : ""}`}>
      <button
        className={`${styles.alertaHeader} ${esRojo ? styles.alertaHeaderRojo : ""}`}
        onClick={() => setAbierto((v) => !v)}
      >
        <span className={styles.alertaIcono}><AlertTriangle size={16} /></span>
        <span className={styles.alertaTexto}>{resumen}</span>
        {abierto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {abierto && (
        <ul className={styles.alertaLista}>
          {alertas.map((a) => (
            <li
              key={a.cuotaId}
              className={`${styles.alertaItem} ${a.urgencia === "ROJA" ? styles.alertaItemRojo : ""}`}
            >
              <span className={styles.alertaCodigo}>{a.proveedor.codigo}</span>
              <span className={styles.alertaUbic}>{a.proveedor.ubicacion}</span>
              <span className={styles.alertaMonto}>{fmtMoney(a.total)}</span>
              <span className={styles.alertaFecha}>{fmtDMY(a.fechaCobro)}</span>
              <span className={`${styles.alertaUrgencia} ${a.urgencia === "ROJA" ? styles.alertaUrgenciaRoja : styles.alertaUrgenciaAmarilla}`}>
                {a.urgencia === "ROJA" ? "≤ 7 días" : "≤ 15 días"}
              </span>
              <button
                className={styles.alertaBtnFicha}
                onClick={() => onAbrirFicha(a.proveedor.id)}
              >
                Ir a cancelar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── Campo de formulario (debe estar fuera del componente para no recrearse) */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

/* ── Formulario ─────────────────────────────────────────────────────────── */
function ProveedorFormModal({ inicial, onSave, onCancel }) {
  const [form, setForm] = useState(() => {
    if (!inicial) return FORM_VACIO;
    return { ...FORM_VACIO, ...inicial, meses: calcMeses(inicial.inicio, inicial.fin) };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const finCalculado = calcFin(form.inicio, form.meses);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.ubicacion || !form.tipoContrato || !form.inicio || !form.meses || !form.costoMensual) {
      setError("Nombre, ubicación, tipo, inicio, duración y costo mensual son obligatorios.");
      return;
    }
    if (!finCalculado) { setError("Inicio y duración inválidos."); return; }
    setSaving(true);
    try {
      await onSave({ ...form, fin: finCalculado });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{inicial ? "Editar proveedor" : "Nuevo proveedor"}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Nombre del proveedor">
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Blanca Vergara" />
          </F>

          <div className={styles.formRow}>
            <F label="Ciudad" optional>
              <input
                list="ciudades-opts"
                value={form.ciudad}
                onChange={set("ciudad")}
                placeholder="Selecciona o escribe una ciudad"
                autoComplete="off"
              />
              <datalist id="ciudades-opts">
                {CIUDADES_DEFAULT.map((c) => <option key={c} value={c} />)}
              </datalist>
            </F>
            <F label="Relevancia comercial">
              <select value={form.relevanciaComercial} onChange={set("relevanciaComercial")}>
                {RELEVANCIA.map((r) => <option key={r}>{r}</option>)}
              </select>
            </F>
          </div>

          <F label="Ubicación / Propiedad">
            <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Ej. Pórtico Puente Giraldez" />
          </F>

          <div className={styles.formRow}>
            <F label="Tipo de contrato">
              <input
                list="contratos-opts"
                value={form.tipoContrato}
                onChange={set("tipoContrato")}
                placeholder="Selecciona o escribe el tipo"
                autoComplete="off"
              />
              <datalist id="contratos-opts">
                {CONTRATOS_DEFAULT.map((c) => <option key={c} value={c} />)}
              </datalist>
            </F>
            <F label="Elementos" optional>
              <input value={form.elementos} onChange={set("elementos")} placeholder="Ej. Torre 10m x 5m" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Inicio del contrato">
              <input type="date" value={form.inicio} onChange={set("inicio")} />
            </F>
            <F label="Duración (meses)">
              <input
                type="number" min="1" max="120" value={form.meses}
                onChange={set("meses")} placeholder="12"
              />
              {finCalculado && (
                <span className={styles.finCalculado}>
                  Fin: {new Date(finCalculado + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              )}
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Costo mensual (S/)">
              <input type="number" step="0.01" min="0" value={form.costoMensual} onChange={set("costoMensual")} placeholder="2500" />
            </F>
            <F label="Costo luz / mes (S/)" optional>
              <input type="number" step="0.01" min="0" value={form.costoLuzMes} onChange={set("costoLuzMes")} placeholder="150" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="N° de cuenta" optional>
              <input value={form.numeroCuenta} onChange={set("numeroCuenta")} placeholder="0011-0237-..." />
            </F>
            <F label="A nombre de" optional>
              <input value={form.nombreCuenta} onChange={set("nombreCuenta")} placeholder="Titular de la cuenta" />
            </F>
          </div>

          <F label="Razón social" optional>
            <input value={form.razonSocial} onChange={set("razonSocial")} placeholder="Razón social del proveedor" />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Guardar proveedor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ───────────────────────────────────────────────────── */
export default function Proveedores() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [fichaPanel, setFichaPanel]   = useState(null);
  const [editProv, setEditProv]       = useState(null);
  const [showForm, setShowForm]       = useState(false);
  const [alertas, setAlertas]         = useState([]);
  const [busqueda, setBusqueda]       = useState("");
  const [pagina, setPagina]           = useState(1);
  const [porPagina, setPorPagina]     = useState(10);
  const [resumenPagos, setResumenPagos] = useState(null);

  const cargarResumen = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await getResumenPagos(new Date().getFullYear());
      setResumenPagos(res);
    } catch { /* silencioso */ }
  }, [isAdmin]);

  const recargarAlertas = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const alts = await getAlertasPagos();
      setAlertas(alts);
    } catch { /* silencioso */ }
  }, [isAdmin]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const provs = await getProveedores();
      setProveedores(provs);
      setPagina(1);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
    recargarAlertas();
    cargarResumen();
  }, [isAdmin, recargarAlertas, cargarResumen]);

  useEffect(() => { cargar(); }, [cargar]);

  const q = busqueda.trim().toLowerCase();
  const provFiltrados = q
    ? proveedores.filter((p) =>
        p.codigo?.toLowerCase().includes(q) ||
        p.nombre?.toLowerCase().includes(q) ||
        p.ubicacion?.toLowerCase().includes(q) ||
        p.ciudad?.toLowerCase().includes(q) ||
        p.tipoContrato?.toLowerCase().includes(q)
      )
    : proveedores;

  const totalPaginas  = Math.ceil(provFiltrados.length / porPagina);
  const provsPagina   = provFiltrados.slice((pagina - 1) * porPagina, pagina * porPagina);

  const handleCrear  = async (form) => { await createProveedor(form); setShowForm(false); cargar(); };
  const handleEditar = async (form) => { await updateProveedor(editProv.id, form); setEditProv(null); cargar(); };
  const handleEliminar = async (p) => {
    if (!confirm(`¿Eliminar proveedor "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteProveedor(p.id);
    cargar();
  };

  const formInicial = editProv ? {
    nombre: editProv.nombre, ciudad: editProv.ciudad ?? "",
    ubicacion: editProv.ubicacion, tipoContrato: editProv.tipoContrato,
    elementos: editProv.elementos ?? "", razonSocial: editProv.razonSocial ?? "",
    inicio: editProv.inicio?.slice(0, 10), fin: editProv.fin?.slice(0, 10),
    costoMensual: editProv.costoMensual, costoLuzMes: editProv.costoLuzMes,
    numeroCuenta: editProv.numeroCuenta ?? "", nombreCuenta: editProv.nombreCuenta ?? "",
    relevanciaComercial: editProv.relevanciaComercial,
  } : null;

  return (
    <div className={styles.container}>
      {/* Widgets de resumen de proveedores */}
      {isAdmin && resumenPagos && (
        <div className={styles.widgetsGrid}>
          <div className={styles.widgetCard}>
            <ProveedoresResumen data={resumenPagos} />
          </div>
          <div className={`${styles.widgetCard} ${styles.widgetCardScroll}`}>
            <ProveedoresKPI data={resumenPagos} anio={resumenPagos.anio} />
          </div>
        </div>
      )}

      {isAdmin && (
        <AlertasBanner
          alertas={alertas}
          onAbrirFicha={(provId) => {
            const prov = proveedores.find((p) => p.id === provId);
            if (prov) setFichaPanel(prov);
          }}
        />
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Proveedores Outdoor</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : q
              ? `${provFiltrados.length} de ${proveedores.length} proveedores`
              : `${proveedores.length} proveedor${proveedores.length !== 1 ? "es" : ""} registrado${proveedores.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar proveedor, ubicación…"
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            />
            {busqueda && (
              <button className={styles.searchClear} onClick={() => { setBusqueda(""); setPagina(1); }}>
                <X size={13} />
              </button>
            )}
          </div>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (
            <button className={styles.btnPrimary} onClick={() => setShowForm(true)}>
              <Plus size={18} /> Nuevo proveedor
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      <div className={styles.tableContainer}>
        {loading ? (
          <p className={styles.empty}>Cargando proveedores…</p>
        ) : proveedores.length === 0 ? (
          <p className={styles.empty}>No hay proveedores registrados aún.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Proveedor</th>
                <th>Propiedad</th>
                <th>Tipo de Contrato</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Vigencia</th>
                <th>Pagado</th>
                <th>Ficha</th>
                {isAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {provsPagina.map((p) => {
                const estadoContrato = p.estadoContrato ?? (new Date(p.fin) >= new Date() ? "VIGENTE" : "VENCIDO");
                const totalPagado = (p.cuotas ?? [])
                  .filter((c) => c.estado === "CANCELADO")
                  .reduce((s, c) => s + c.monto + c.igv, 0);
                const badgeClass = {
                  VIGENTE:    styles.badgeVigente,
                  VENCIDO:    styles.badgeVencido,
                  CANCELADO:  styles.badgeCancelado,
                  SUSPENDIDO: styles.badgeSuspendido,
                }[estadoContrato] ?? styles.badgeVencido;
                return (
                  <tr key={p.id}>
                    <td className={styles.tdCodigo}>{p.codigo}</td>

                    <td>
                      <div className={styles.tdProveedor}>
                        <span className={styles.provNombre}>{p.nombre}</span>
                        {p.razonSocial && <span className={styles.provRazon}>{p.razonSocial}</span>}
                      </div>
                    </td>

                    <td>
                      <div className={styles.tdPropiedad}>
                        {p.ciudad && <span className={styles.propCiudad}>{p.ciudad}</span>}
                        <span className={styles.propUbicacion}>{p.ubicacion}</span>
                      </div>
                    </td>

                    <td className={styles.tdContrato}>{p.tipoContrato}</td>
                    <td className={styles.tdFecha}>{fmtDate(p.inicio)}</td>
                    <td className={styles.tdFecha}>{fmtDate(p.fin)}</td>

                    <td>
                      <span className={`${styles.badge} ${badgeClass}`}>
                        {estadoContrato}
                      </span>
                    </td>

                    <td>
                      {totalPagado > 0 ? (
                        <span className={styles.tdPagado}>{fmtMoney(totalPagado)}</span>
                      ) : (
                        <span style={{ color: 'var(--color-text3)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </td>

                    <td>
                      <button className={styles.btnFicha} onClick={() => setFichaPanel(p)} title="Ver ficha">
                        <FileText size={14} /> Ver ficha
                      </button>
                    </td>

                    {isAdmin && (
                      <td>
                        <div className={styles.tdActions}>
                          <button className={styles.btnGhost} onClick={() => setEditProv(p)} title="Editar">
                            <Edit2 size={14} />
                          </button>
                          <button className={`${styles.btnGhost} ${styles.btnDanger}`} onClick={() => handleEliminar(p)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {!loading && provFiltrados.length > 0 && (
        <div className={styles.pagination}>
          <div className={styles.paginationInfo}>
            Mostrando {(pagina - 1) * porPagina + 1}–{Math.min(pagina * porPagina, provFiltrados.length)} de {provFiltrados.length}
          </div>
          <div className={styles.paginationControls}>
            <button
              className={styles.btnPage}
              disabled={pagina === 1}
              onClick={() => setPagina((p) => p - 1)}
            >‹ Anterior</button>

            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                className={`${styles.btnPage} ${n === pagina ? styles.btnPageActive : ""}`}
                onClick={() => setPagina(n)}
              >{n}</button>
            ))}

            <button
              className={styles.btnPage}
              disabled={pagina === totalPaginas}
              onClick={() => setPagina((p) => p + 1)}
            >Siguiente ›</button>
          </div>
          <div className={styles.paginationSize}>
            <span>Por página:</span>
            <button
              className={`${styles.btnPage} ${porPagina === 10 ? styles.btnPageActive : ""}`}
              onClick={() => { setPorPagina(10); setPagina(1); }}
            >10</button>
            <button
              className={`${styles.btnPage} ${porPagina === 20 ? styles.btnPageActive : ""}`}
              onClick={() => { setPorPagina(20); setPagina(1); }}
            >20</button>
          </div>
        </div>
      )}

      {/* Modales */}
      {fichaPanel && (
        <FichaProveedorModal
          proveedor={fichaPanel}
          isAdmin={isAdmin}
          onClose={() => { setFichaPanel(null); recargarAlertas(); }}
          onCuotaUpdated={(updated) => {
            setProveedores((prev) => prev.map((p) =>
              p.id !== updated.proveedorId ? p :
              { ...p, cuotas: p.cuotas.map((c) => c.id === updated.id ? updated : c) }
            ));
            setFichaPanel((prev) => prev
              ? { ...prev, cuotas: prev.cuotas.map((c) => c.id === updated.id ? updated : c) }
              : null
            );
            recargarAlertas();
          }}
          onEstadoUpdated={(id, nuevoEstado) => {
            const estadoContrato = nuevoEstado ?? (new Date(fichaPanel.fin) >= new Date() ? "VIGENTE" : "VENCIDO");
            setProveedores((prev) => prev.map((p) =>
              p.id === id ? { ...p, estadoContrato, estadoOverride: nuevoEstado } : p
            ));
            setFichaPanel((prev) => ({ ...prev, estadoContrato, estadoOverride: nuevoEstado }));
          }}
        />
      )}

      {showForm && (
        <ProveedorFormModal inicial={null} onSave={handleCrear} onCancel={() => setShowForm(false)} />
      )}

      {editProv && (
        <ProveedorFormModal inicial={formInicial} onSave={handleEditar} onCancel={() => setEditProv(null)} />
      )}
    </div>
  );
}
