import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, RefreshCw, X, ChevronLeft, ChevronRight, BarChart2, CalendarDays, Search } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import useAuth from "../auth/useAuth";
import { getPaneles } from "../api/paneles";
import { getClientes, createCliente } from "../api/clientes";
import { getReservas, createReserva, updateReserva, deleteReserva } from "../api/reservas";
import styles from "./ocupacion.module.scss";
import { ESTADOS_PANEL, ESTADO_META, esEstadoExterno } from "../constants/estados";

/* ── Constantes ─────────────────────────────────────────────────────────────── */
const MESES   = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_L = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DISTRITOS = ["", "HUANCAYO", "EL_TAMBO", "CHILCA"];
const DIST_L    = { "": "Todos", HUANCAYO: "Huancayo", EL_TAMBO: "El Tambo", CHILCA: "Chilca" };
const TIPOS     = ["", "ESTATICO", "LED"];
const TIPO_L    = { "": "Todos", ESTATICO: "Estático", LED: "LED" };

const COLORES_CLIENTE = [
  "#3b82f6","#8b5cf6","#ec4899","#0891b2","#6366f1","#84cc16",
  "#dc2626","#059669","#f59e0b","#14b8a6","#d946ef","#0ea5e9",
];
const clienteColor = (id) => COLORES_CLIENTE[(id - 1) % COLORES_CLIENTE.length];

const fmt = (v) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(v ?? 0);

/* ── Helpers de fecha (siempre en hora local para consistencia con drag) ──── */
const parseD = (str) => {
  const [y, m, d] = String(str).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const snapD = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
const fmtDMY = (str) => {
  if (!str) return "";
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
};

/* ── Posición de barra en el timeline ──────────────────────────────────────── */
function barPos(reserva, anio) {
  const ys = new Date(anio, 0, 1);
  const ye = new Date(anio, 11, 31, 23, 59, 59);
  const s  = new Date(Math.max(parseD(reserva.fechaInicio), ys));
  const e  = new Date(Math.min(parseD(reserva.fechaFin),   ye));
  if (s > e) return null;
  const total = ye - ys;
  return { left: `${(s - ys) / total * 100}%`, width: `${(e - s) / total * 100}%` };
}

/* ── Stats para dashboard ───────────────────────────────────────────────────── */
function computeStats(reservas, paneles, anio) {
  const now = new Date();
  const cm  = now.getFullYear() === anio ? now.getMonth() : 11;

  const byMonth  = Array.from({ length: 12 }, (_, m) => ({ mes: MESES[m], ingreso: 0, ocupados: 0 }));
  const clienteMap = {};

  for (const r of reservas) {
    // Libre y los estados *_EXTERNO (paneles de terceros, sin cliente/precio propio)
    // no cuentan como ingreso nuestro.
    if (r.estado === "LIBRE" || esEstadoExterno(r.estado)) continue;
    const s = new Date(r.fechaInicio);
    const e = new Date(r.fechaFin);

    // Duración en meses de calendario (mes de inicio inclusive, mes de fin exclusivo,
    // igual que el cálculo de cuotas de proveedores). Mínimo 1 mes.
    const mesInicioAbs = s.getFullYear() * 12 + s.getMonth();
    const mesFinAbs     = Math.max(mesInicioAbs + 1, e.getFullYear() * 12 + e.getMonth());
    const meses = mesFinAbs - mesInicioAbs;

    for (let m = 0; m < 12; m++) {
      const mAbs = anio * 12 + m;
      if (mAbs >= mesInicioAbs && mAbs < mesFinAbs) {
        byMonth[m].ingreso  += r.precioMensual;
        byMonth[m].ocupados += 1;
      }
    }

    const cid = r.clienteId;
    if (!clienteMap[cid]) clienteMap[cid] = { nombre: r.cliente.nombreComercial, total: 0, color: clienteColor(cid) };
    clienteMap[cid].total += r.precioMensual * meses;
  }

  const ingresoAnual = byMonth.reduce((s, m) => s + m.ingreso, 0);
  const ingresoMes   = byMonth[cm]?.ingreso ?? 0;
  const ocupadosMes  = byMonth[cm]?.ocupados ?? 0;
  const pct          = paneles.length > 0 ? Math.round(ocupadosMes / paneles.length * 100) : 0;
  const topClientes  = Object.values(clienteMap).sort((a, b) => b.total - a.total).slice(0, 6);

  return { byMonth, ingresoAnual, ingresoMes, pct, topClientes, mesMostrado: MESES_L[cm] };
}

/* ── Modal de reserva ───────────────────────────────────────────────────────── */
const FORM0 = { clienteId: "", fechaInicio: "", fechaFin: "", precioMensual: "", estado: "OCUPADO", notas: "" };

const NC0 = { nombreComercial: "", documento: "", nombreContacto: "" };

function ReservaModal({ panel, reserva, defaults, clientes: clientesProp, onSave, onDelete, onClose, onClienteCreado }) {
  const esEdicion = !!reserva;
  // "Externo" describe la PROPIEDAD del panel (no es nuestro), no la reserva: igual podemos
  // conseguirlo para un cliente propio (Ocupado/Libre normales, con cliente y precio) o solo
  // llevar registro de su estado mientras lo gestiona el tercero (Libre/Ocupado externo).
  // Por eso las 4 opciones siempre están disponibles; solo cambia cuál viene preseleccionada.
  const panelEsExterno = panel.propiedad === "EXTERNO";

  const [form, setForm]     = useState(esEdicion ? {
    clienteId:     reserva.clienteId ? String(reserva.clienteId) : "",
    fechaInicio:   reserva.fechaInicio.slice(0, 10),
    fechaFin:      reserva.fechaFin.slice(0, 10),
    precioMensual: reserva.precioMensual != null ? String(reserva.precioMensual) : "",
    estado:        reserva.estado,
    notas:         reserva.notas ?? "",
  } : { ...FORM0, estado: panelEsExterno ? "LIBRE_EXTERNO" : FORM0.estado, ...defaults });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // El campo que realmente decide si hace falta cliente/precio es el ESTADO elegido en
  // el formulario (reactivo), no la propiedad fija del panel.
  const estadoEsExterno = esEstadoExterno(form.estado);

  /* ── Nuevo cliente inline ── */
  const [clientes,      setClientes]      = useState(clientesProp);
  const [creando,       setCreando]       = useState(false);
  const [nc,            setNc]            = useState(NC0);
  const [savingNc,      setSavingNc]      = useState(false);
  const [errorNc,       setErrorNc]       = useState("");

  const setf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleCrearCliente = async () => {
    if (!nc.nombreComercial.trim() || !nc.documento.trim() || !nc.nombreContacto.trim())
      return setErrorNc("Nombre comercial, contacto y documento son obligatorios.");
    setSavingNc(true);
    setErrorNc("");
    try {
      const nuevo = await createCliente(nc);
      const lista = [...clientes, nuevo].sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));
      setClientes(lista);
      setForm(f => ({ ...f, clienteId: String(nuevo.id) }));
      setCreando(false);
      setNc(NC0);
      onClienteCreado?.();
    } catch (e) {
      setErrorNc(e.response?.data?.message ?? "Error al crear cliente");
    } finally {
      setSavingNc(false);
    }
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError("");
    if (!form.fechaInicio || !form.fechaFin)
      return setError("Las fechas son obligatorias.");
    if (!estadoEsExterno && (!form.clienteId || !form.precioMensual))
      return setError("Cliente y precio son obligatorios.");
    if (new Date(form.fechaFin) <= new Date(form.fechaInicio))
      return setError("La fecha de fin debe ser posterior al inicio.");
    setSaving(true);
    try { await onSave({ ...form, panelId: panel.id }); }
    catch (err) { setError(err.response?.data?.message ?? "Error al guardar"); setSaving(false); }
  };

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div>
            <h2 className={styles.modalTitle}>{esEdicion ? "Editar reserva" : "Nueva reserva"}</h2>
            <p className={styles.modalSub}>{panel.codigo} — {panel.nombre || panel.ubicacion || ""}</p>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <form className={styles.modalBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          {panelEsExterno && (
            <p className={styles.hintExterno}>
              Este panel es de un tercero. Si ya lo conseguiste para un cliente propio, elige
              "Libre" u "Ocupado" y complétalo normal; si solo llevas registro de su estado
              mientras lo gestiona el tercero, usa "Libre externo" / "Ocupado externo".
            </p>
          )}

          {/* Cliente y precio no aplican cuando el estado elegido es *_EXTERNO */}
          {!estadoEsExterno && (
            <div className={styles.formField}>
              <label>Cliente</label>
              <div className={styles.clienteRow}>
                <select value={form.clienteId} onChange={setf("clienteId")}>
                  <option value="">— Seleccionar cliente —</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombreComercial} ({c.documento})</option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`${styles.btnAddCliente} ${creando ? styles.btnAddClienteActive : ""}`}
                  onClick={() => { setCreando(v => !v); setErrorNc(""); setNc(NC0); }}
                  title={creando ? "Cancelar" : "Crear nuevo cliente"}
                >
                  <Plus size={15} />
                </button>
              </div>

              {creando && (
                <div className={styles.nuevoClienteBox}>
                  <p className={styles.nuevoClienteTitle}>Nuevo cliente</p>
                  <input
                    className={styles.nuevoClienteInput}
                    placeholder="Nombre comercial *"
                    value={nc.nombreComercial}
                    onChange={e => setNc(n => ({ ...n, nombreComercial: e.target.value }))}
                  />
                  <input
                    className={styles.nuevoClienteInput}
                    placeholder="Nombre de contacto *"
                    value={nc.nombreContacto}
                    onChange={e => setNc(n => ({ ...n, nombreContacto: e.target.value }))}
                  />
                  <input
                    className={styles.nuevoClienteInput}
                    placeholder="RUC / Documento *"
                    value={nc.documento}
                    onChange={e => setNc(n => ({ ...n, documento: e.target.value }))}
                  />
                  {errorNc && <p className={styles.formError}>{errorNc}</p>}
                  <div className={styles.nuevoClienteActions}>
                    <button type="button" className={styles.btnOutline} onClick={() => { setCreando(false); setNc(NC0); }}>
                      Cancelar
                    </button>
                    <button type="button" className={styles.btnPrimary} disabled={savingNc} onClick={handleCrearCliente}>
                      {savingNc ? "Creando…" : "Crear y seleccionar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Inicio del contrato</label>
              <input type="date" value={form.fechaInicio} onChange={setf("fechaInicio")} />
            </div>
            <div className={styles.formField}>
              <label>Fin del contrato</label>
              <input type="date" value={form.fechaFin} onChange={setf("fechaFin")} />
            </div>
          </div>

          <div className={styles.formRow}>
            {!estadoEsExterno && (
              <div className={styles.formField}>
                <label>Precio mensual (S/)</label>
                <input type="number" step="0.01" min="0" value={form.precioMensual} onChange={setf("precioMensual")} placeholder="2500" />
              </div>
            )}
            <div className={styles.formField}>
              <label>Estado</label>
              <select value={form.estado} onChange={setf("estado")}>
                {ESTADOS_PANEL.map(e => <option key={e} value={e}>{ESTADO_META[e].label}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formField}>
            <label>Notas <span className={styles.opcional}>(opcional)</span></label>
            <input value={form.notas} onChange={setf("notas")} placeholder="Observaciones del contrato" />
          </div>

          <div className={styles.formActions}>
            {esEdicion && (
              <button type="button" className={styles.btnDanger} onClick={() => onDelete(reserva)}>
                Eliminar
              </button>
            )}
            <button type="button" className={styles.btnOutline} onClick={onClose}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Timeline con drag ──────────────────────────────────────────────────────── */
function Timeline({ paneles, reservas, anio, isAdmin, onClickBar, onClickCelda, onBarUpdate }) {
  const drag      = useRef(null);
  const dragMoved = useRef(false);
  const [preview, setPreview] = useState(null); // { id, fechaInicio, fechaFin, mouseX, mouseY }

  useEffect(() => {
    const ys      = new Date(anio, 0, 1);
    const ye      = new Date(anio, 11, 31, 23, 59, 59);
    const totalMs = ye - ys;
    const DAY     = 86400000;

    const calcDates = (clientX) => {
      if (!drag.current) return null;
      const { type, startX, cellWidth, origIni, origFin } = drag.current;
      const deltaMs = ((clientX - startX) / cellWidth) * totalMs;
      const iniMs   = parseD(origIni).getTime();
      const finMs   = parseD(origFin).getTime();
      if (type === 'move') return { fechaInicio: snapD(iniMs + deltaMs), fechaFin: snapD(finMs + deltaMs) };
      if (type === 'R')    return { fechaInicio: origIni, fechaFin: snapD(Math.max(finMs + deltaMs, iniMs + DAY)) };
      /* L */              return { fechaInicio: snapD(Math.min(iniMs + deltaMs, finMs - DAY)), fechaFin: origFin };
    };

    const onMove = (e) => {
      if (!drag.current) return;
      if (Math.abs(e.clientX - drag.current.startX) > 3) dragMoved.current = true;
      const dates = calcDates(e.clientX);
      if (dates) setPreview({ id: drag.current.reserva.id, ...dates, mouseX: e.clientX, mouseY: e.clientY });
    };

    const onUp = (e) => {
      if (!drag.current) return;
      const { reserva } = drag.current;
      const moved = dragMoved.current;
      const dates = calcDates(e.clientX);
      drag.current = null;
      document.body.style.cursor = '';
      setPreview(null);
      if (moved && dates) onBarUpdate(reserva.id, dates);
      // Resetear DESPUÉS de que el evento click se procese
      setTimeout(() => { dragMoved.current = false; }, 0);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [anio, onBarUpdate]);

  const startDrag = useCallback((type, reserva, e) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.stopPropagation();
    const cellEl = e.currentTarget.closest('[data-celdas]');
    if (!cellEl) return;
    document.body.style.cursor = type === 'move' ? 'grabbing' : 'ew-resize';
    drag.current = {
      reserva, type,
      startX:    e.clientX,
      cellWidth: cellEl.getBoundingClientRect().width,
      origIni:   reserva.fechaInicio.slice(0, 10),
      origFin:   reserva.fechaFin.slice(0, 10),
    };
    dragMoved.current = false;
  }, [isAdmin]);

  return (
    <>
      <div className={styles.tlWrap}>
        <div className={styles.tlHead}>
          <div className={styles.tlPanelCol} />
          <div className={styles.tlMeses}>
            {MESES.map(m => <div key={m} className={styles.tlMes}>{m}</div>)}
          </div>
        </div>

        {paneles.length === 0 && <p className={styles.empty}>Sin paneles para los filtros seleccionados.</p>}

        {paneles.map(panel => {
          const panelReservas = reservas.filter(r => r.panelId === panel.id);
          return (
            <div key={panel.id} className={styles.tlRow}>
              <div className={styles.tlPanelCol}>
                <span className={styles.tlCodigo}>{panel.codigo}</span>
                <span className={styles.tlNombre}>{panel.nombre || "—"}</span>
              </div>

              <div
                className={styles.tlCeldas}
                data-celdas="true"
                onClick={isAdmin ? (e) => {
                  if (dragMoved.current) return;
                  if (e.target === e.currentTarget || e.target.dataset.celdas) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mes  = Math.floor((e.clientX - rect.left) / rect.width * 12);
                    const fechaInicio = `${anio}-${String(mes+1).padStart(2,'0')}-01`;
                    const fechaFin    = `${anio}-${String(mes+1).padStart(2,'0')}-${new Date(anio, mes+1, 0).getDate()}`;
                    onClickCelda(panel, { fechaInicio, fechaFin });
                  }
                } : undefined}
              >
                {Array.from({ length: 11 }, (_, i) => (
                  <div key={i} className={styles.tlLinea} style={{ left: `${(i+1)/12*100}%` }} />
                ))}

                {panelReservas.map(r => {
                  const activeR = preview?.id === r.id
                    ? { fechaInicio: preview.fechaInicio, fechaFin: preview.fechaFin }
                    : { fechaInicio: r.fechaInicio,       fechaFin: r.fechaFin       };
                  const pos = barPos(activeR, anio);
                  if (!pos) return null;
                  const color = ESTADO_META[r.estado]?.color ?? "#94a3b8";

                  return (
                    <div
                      key={r.id}
                      className={`${styles.tlBar} ${preview?.id === r.id ? styles.tlBarDragging : ""}`}
                      style={{ left: pos.left, width: pos.width, background: color, cursor: isAdmin ? 'grab' : 'default' }}
                      onMouseDown={isAdmin ? (e) => { if (!e.target.dataset.handle) startDrag('move', r, e); } : undefined}
                      onClick={isAdmin ? (e) => { e.stopPropagation(); if (!dragMoved.current) onClickBar(r); } : undefined}
                      title={r.cliente
                        ? `${r.cliente.nombreComercial} · ${fmt(r.precioMensual)}/mes · ${ESTADO_META[r.estado]?.label ?? r.estado}`
                        : `${ESTADO_META[r.estado]?.label ?? r.estado} (externo)`}
                    >
                      {isAdmin && (
                        <div className={styles.tlHandleL} data-handle="L" onMouseDown={(e) => startDrag('L', r, e)} />
                      )}
                      <span className={styles.tlBarLabel}>{r.cliente?.nombreComercial ?? ESTADO_META[r.estado]?.label ?? "Externo"}</span>
                      {isAdmin && (
                        <div className={styles.tlHandleR} data-handle="R" onMouseDown={(e) => startDrag('R', r, e)} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tooltip flotante durante drag */}
      {preview && (
        <div
          className={styles.dragTooltip}
          style={{ left: preview.mouseX, top: preview.mouseY - 12 }}
        >
          {fmtDMY(preview.fechaInicio)} → {fmtDMY(preview.fechaFin)}
        </div>
      )}
    </>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────────── */
function Dashboard({ stats, anio }) {
  const { byMonth, ingresoAnual, ingresoMes, pct, topClientes, mesMostrado } = stats;

  return (
    <div className={styles.dash}>
      <div className={styles.cards}>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Ingreso {anio}</p>
          <p className={styles.cardValue}>{fmt(ingresoAnual)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Ingreso {mesMostrado}</p>
          <p className={styles.cardValue}>{fmt(ingresoMes)}</p>
        </div>
        <div className={styles.card}>
          <p className={styles.cardLabel}>Ocupación {mesMostrado}</p>
          <p className={styles.cardValue}>{pct}%</p>
        </div>
      </div>

      <div className={styles.chartBox}>
        <h3 className={styles.chartTitle}>Ingresos mensuales {anio}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byMonth} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border2)" />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-text2)" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => `S/${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: "var(--color-text2)" }} axisLine={false} tickLine={false} width={52} />
            <Tooltip
              formatter={(v) => [fmt(v), "Ingresos"]}
              contentStyle={{ borderRadius: 8, border: "1px solid var(--color-border)", fontSize: 12 }}
            />
            <Bar dataKey="ingreso" radius={[4, 4, 0, 0]}>
              {byMonth.map((_, i) => <Cell key={i} fill={i % 2 === 0 ? "#3b82f6" : "#6366f1"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.topClientes}>
        <h3 className={styles.chartTitle}>Top clientes {anio}</h3>
        <div className={styles.topList}>
          {topClientes.length === 0 && <p className={styles.empty}>Sin datos aún.</p>}
          {topClientes.map((c, i) => (
            <div key={i} className={styles.topItem}>
              <div className={styles.topBullet} style={{ background: c.color }} />
              <span className={styles.topNombre}>{c.nombre}</span>
              <span className={styles.topTotal}>{fmt(c.total)}</span>
              <div className={styles.topBar}>
                <div
                  className={styles.topBarFill}
                  style={{ width: `${(c.total / topClientes[0].total) * 100}%`, background: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ────────────────────────────────────────────────────────── */
const FILTROS0 = { tipo: "", distrito: "", cliente: "", precioMin: "", precioMax: "", fechaIni: "", fechaFin: "" };

export default function Ocupacion() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "ADMIN";

  const [tab,     setTab]     = useState("timeline");
  const [seccion, setSeccion] = useState("paneles");
  const [anio,    setAnio]    = useState(new Date().getFullYear());
  const [paneles, setPaneles] = useState([]);
  const [clientes,setClientes]= useState([]);
  const [reservas,setReservas]= useState([]);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(null);
  const [filtros, setFiltros] = useState(FILTROS0);

  const setF = (k) => (e) => setFiltros(f => ({ ...f, [k]: e.target.value }));
  const limpiar = () => setFiltros(FILTROS0);
  const hayFiltros = Object.values(filtros).some(v => v !== "");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [p, c, r] = await Promise.all([getPaneles(), getClientes(), getReservas(anio)]);
      setPaneles(p.filter(x => x.activo !== false));
      setClientes(c.filter(x => x.activo !== false));
      setReservas(r);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [anio]);

  useEffect(() => { cargar(); }, [cargar]);

  /* ── Filtrado ── */
  const panelesFiltrados = paneles.filter(p => {
    const esMupi = p.tipo === "MUPI";
    if (seccion === "mupis" ? !esMupi : esMupi) return false;
    if (filtros.distrito && p.distrito !== filtros.distrito) return false;
    if (seccion === "paneles" && filtros.tipo && p.tipo !== filtros.tipo) return false;
    return true;
  });

  const hayFiltroReserva = filtros.cliente || filtros.precioMin || filtros.precioMax || filtros.fechaIni || filtros.fechaFin;

  const reservasFiltradas = reservas.filter(r => {
    if (!panelesFiltrados.some(p => p.id === r.panelId)) return false;
    if (filtros.cliente) {
      const q = filtros.cliente.toLowerCase();
      if (!(r.cliente?.nombreComercial ?? "").toLowerCase().includes(q)) return false;
    }
    if (filtros.precioMin && (r.precioMensual ?? 0) < Number(filtros.precioMin)) return false;
    if (filtros.precioMax && (r.precioMensual ?? 0) > Number(filtros.precioMax)) return false;
    if (filtros.fechaIni && new Date(r.fechaFin)    < new Date(filtros.fechaIni)) return false;
    if (filtros.fechaFin && new Date(r.fechaInicio) > new Date(filtros.fechaFin)) return false;
    return true;
  });

  const panelesMostrados = hayFiltroReserva
    ? panelesFiltrados.filter(p => reservasFiltradas.some(r => r.panelId === p.id))
    : panelesFiltrados;

  const reservasSeccion = reservas.filter(r => panelesFiltrados.some(p => p.id === r.panelId));

  /* ── Acciones ── */
  const handleSave = async (form) => {
    if (modal.reserva) await updateReserva(modal.reserva.id, form);
    else               await createReserva(form);
    setModal(null);
    cargar();
  };

  const handleDelete = async (reserva) => {
    const quien = reserva.cliente?.nombreComercial ?? ESTADO_META[reserva.estado]?.label ?? "este registro";
    if (!confirm(`¿Eliminar esta reserva de ${quien}?`)) return;
    await deleteReserva(reserva.id);
    setModal(null);
    cargar();
  };

  const handleBarUpdate = useCallback(async (id, dates) => {
    try {
      await updateReserva(id, dates);
    } catch (err) {
      alert(err.response?.data?.message ?? "Error al mover la reserva");
    } finally {
      cargar();
    }
  }, [cargar]);

  const stats = computeStats(reservasFiltradas, panelesMostrados, anio);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Ocupación de {seccion === "mupis" ? "Mupis" : "Paneles"}</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${reservasSeccion.filter(r => r.estado === "OCUPADO").length} contratos activos · ${panelesMostrados.length} ${seccion === "mupis" ? "mupis" : "paneles"}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.anioSelector}>
            <button className={styles.btnIcon} onClick={() => setAnio(a => a - 1)}><ChevronLeft size={16} /></button>
            <span className={styles.anioLabel}>{anio}</span>
            <button className={styles.btnIcon} onClick={() => setAnio(a => a + 1)}><ChevronRight size={16} /></button>
          </div>
          <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
        </div>
      </div>

      {/* Sección: Paneles / Mupis */}
      <div className={styles.seccionTabs}>
        <button
          className={`${styles.seccionTab} ${seccion === "paneles" ? styles.seccionTabActive : ""}`}
          onClick={() => setSeccion("paneles")}
        >
          Paneles
        </button>
        <button
          className={`${styles.seccionTab} ${seccion === "mupis" ? styles.seccionTabActive : ""}`}
          onClick={() => setSeccion("mupis")}
        >
          Mupis
        </button>
      </div>

      {/* Barra de filtros */}
      <div className={styles.filtros}>
        {/* Tipo (solo aplica a Paneles: Estático/LED) */}
        {seccion === "paneles" && (
          <div className={styles.filtroGroup}>
            <span className={styles.filtroLabel}>Tipo</span>
            <div className={styles.filtroBtns}>
              {TIPOS.map(t => (
                <button
                  key={t}
                  className={`${styles.filtroBtn} ${filtros.tipo === t ? styles.filtroBtnActive : ""}`}
                  onClick={() => setFiltros(f => ({ ...f, tipo: t }))}
                >
                  {TIPO_L[t]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Ciudad */}
        <div className={styles.filtroGroup}>
          <span className={styles.filtroLabel}>Ciudad</span>
          <div className={styles.filtroBtns}>
            {DISTRITOS.map(d => (
              <button
                key={d}
                className={`${styles.filtroBtn} ${filtros.distrito === d ? styles.filtroBtnActive : ""}`}
                onClick={() => setFiltros(f => ({ ...f, distrito: d }))}
              >
                {DIST_L[d]}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className={styles.filtroGroup}>
          <span className={styles.filtroLabel}>Cliente</span>
          <div className={styles.filtroSearch}>
            <Search size={13} />
            <input
              placeholder="Buscar cliente…"
              value={filtros.cliente}
              onChange={setF("cliente")}
            />
            {filtros.cliente && (
              <button className={styles.filtroSearchClear} onClick={() => setFiltros(f => ({ ...f, cliente: "" }))}><X size={12} /></button>
            )}
          </div>
        </div>

        {/* Precio */}
        <div className={styles.filtroGroup}>
          <span className={styles.filtroLabel}>Precio/mes (S/)</span>
          <div className={styles.filtroRango}>
            <input type="number" placeholder="Mín" value={filtros.precioMin} onChange={setF("precioMin")} />
            <span className={styles.filtroSep}>—</span>
            <input type="number" placeholder="Máx" value={filtros.precioMax} onChange={setF("precioMax")} />
          </div>
        </div>

        {/* Fechas */}
        <div className={styles.filtroGroup}>
          <span className={styles.filtroLabel}>Rango de fechas</span>
          <div className={styles.filtroRango}>
            <input type="date" value={filtros.fechaIni} onChange={setF("fechaIni")} />
            <span className={styles.filtroSep}>—</span>
            <input type="date" value={filtros.fechaFin} onChange={setF("fechaFin")} />
          </div>
        </div>

        {hayFiltros && (
          <button className={styles.btnLimpiar} onClick={limpiar}>
            <X size={13} /> Limpiar filtros
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === "timeline" ? styles.tabActive : ""}`}
          onClick={() => setTab("timeline")}
        >
          <CalendarDays size={15} /> Timeline
        </button>
        <button
          className={`${styles.tab} ${tab === "dashboard" ? styles.tabActive : ""}`}
          onClick={() => setTab("dashboard")}
        >
          <BarChart2 size={15} /> Dashboard
        </button>
      </div>

      {/* Contenido */}
      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : tab === "timeline" ? (
        <Timeline
          paneles={panelesMostrados}
          reservas={reservasFiltradas}
          anio={anio}
          isAdmin={isAdmin}
          onClickBar={(r) => setModal({ panel: paneles.find(p => p.id === r.panelId), reserva: r })}
          onClickCelda={(panel, defaults) => setModal({ panel, defaults })}
          onBarUpdate={handleBarUpdate}
        />
      ) : (
        <Dashboard stats={stats} anio={anio} />
      )}

      {/* Modal */}
      {modal && (
        <ReservaModal
          panel={modal.panel}
          reserva={modal.reserva ?? null}
          defaults={modal.defaults ?? {}}
          clientes={clientes}
          onSave={handleSave}
          onDelete={handleDelete}
          onClose={() => setModal(null)}
          onClienteCreado={cargar}
        />
      )}
    </div>
  );
}
