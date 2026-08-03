import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, X, ChevronLeft, ChevronRight } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getRentabilidadMupis,
  getOportunidadPerdida,
  getParametrosCostoMupi,
  updateParametrosCostoMupi,
  updatePanelPrecioMes,
  updateReservaPrecioMensual,
} from "../api/rentabilidad";
import { getEventosProduccion, crearEventoProduccion, eliminarEventoProduccion } from "../api/eventosProduccion";
import styles from "./rentabilidad.module.scss";

const MESES_LABEL = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const fmt = (v) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);
const pct = (value, base) => (base ? `${((value / base) * 100).toFixed(1)}%` : "—");
const mesLabel = (fecha) =>
  new Intl.DateTimeFormat("es-PE", { month: "short", year: "numeric" }).format(new Date(fecha));

// Recalcula los derivados de una fila (rentabilidad, % y total del contrato) en memoria,
// a partir del costo unitario vigente de su panel. Misma fórmula que el backend.
function derivarFila(fila, costoMes1, costoMes2) {
  const mesesRecurrentes = Math.max(fila.meses - 1, 0);
  const rentabilidadMes1 = fila.precioContratado - costoMes1;
  const rentabilidadMes2 = fila.precioContratado - costoMes2;
  const ingresoTotalContrato = fila.precioContratado * fila.meses;
  const costoTotalContrato = costoMes1 + costoMes2 * mesesRecurrentes;
  return {
    ...fila,
    costoMes1: parseFloat(costoMes1.toFixed(2)),
    costoMes2: parseFloat(costoMes2.toFixed(2)),
    bajoMinimo: fila.precioContratado < fila.precioMinimo,
    rentabilidadMes1: parseFloat(rentabilidadMes1.toFixed(2)),
    rentabilidadMes2: parseFloat(rentabilidadMes2.toFixed(2)),
    ingresoTotalContrato: parseFloat(ingresoTotalContrato.toFixed(2)),
    costoTotalContrato: parseFloat(costoTotalContrato.toFixed(2)),
    rentabilidadTotalContrato: parseFloat((ingresoTotalContrato - costoTotalContrato).toFixed(2)),
  };
}

function calcularResumen(filas) {
  const ingresoMensualContratado = filas.reduce((s, f) => s + f.precioContratado, 0);
  const costoMensualMes2 = filas.reduce((s, f) => s + f.costoMes2, 0);
  const utilidadMensualMes2 = filas.reduce((s, f) => s + f.rentabilidadMes2, 0);
  return {
    nMupis: filas.length,
    ingresoMensualContratado: parseFloat(ingresoMensualContratado.toFixed(2)),
    costoMensualMes2: parseFloat(costoMensualMes2.toFixed(2)),
    utilidadMensualMes2: parseFloat(utilidadMensualMes2.toFixed(2)),
    utilidadTotalContrato: parseFloat(filas.reduce((s, f) => s + f.rentabilidadTotalContrato, 0).toFixed(2)),
    margenPromedioMes2: ingresoMensualContratado > 0 ? parseFloat(((utilidadMensualMes2 / ingresoMensualContratado) * 100).toFixed(1)) : 0,
    contratosBajoPrecioMinimo: filas.filter((f) => f.bajoMinimo).length,
  };
}

// Mes absoluto (año*12+mes) a partir del string ISO tal cual llega del backend,
// sin pasar por new Date().getMonth() (hora local) para no correr la fecha de día/mes.
const mesAbsISO = (fechaISO) => {
  const [y, m] = String(fechaISO).slice(0, 10).split("-").map(Number);
  return y * 12 + m;
};

// Línea de tiempo mensual calculada en el cliente a partir de las filas ya cargadas
// (y ya filtradas): instantánea al cambiar de año y siempre respeta los filtros activos.
function calcularMensual(filas, anio) {
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, ingreso: 0, costo: 0 }));
  for (const f of filas) {
    const inicioAbs = mesAbsISO(f.fechaInicio);
    const finAbs = mesAbsISO(f.fechaFin);
    for (let i = 0; i < 12; i++) {
      const mAbs = anio * 12 + (i + 1);
      if (mAbs < inicioAbs || mAbs > finAbs) continue;
      meses[i].ingreso += f.precioContratado;
      meses[i].costo += mAbs === inicioAbs ? f.costoMes1 : f.costoMes2;
    }
  }
  return meses.map((m) => ({
    mes: m.mes,
    ingreso: parseFloat(m.ingreso.toFixed(2)),
    costo: parseFloat(m.costo.toFixed(2)),
    rentabilidad: parseFloat((m.ingreso - m.costo).toFixed(2)),
  }));
}

function FilaResumen({ label, value, isPercent, colored, plain, unidad }) {
  const cls = colored ? (value >= 0 ? styles.positivo : styles.negativo) : "";
  let texto;
  if (isPercent) texto = `${value}%`;
  else if (plain) texto = unidad ? `${value} ${unidad}` : `${value}`;
  else texto = fmt(value);
  return (
    <div className={styles.resumenFila}>
      <span className={styles.resumenLabel}>{label}</span>
      <span className={`${styles.resumenValor} ${cls}`}>{texto}</span>
    </div>
  );
}

function ResumenGrid({ resumen }) {
  return (
    <div className={styles.resumenForm}>
      <div className={styles.resumenGrupo}>
        <FilaResumen label="N° registrados" value={resumen.nMupis} plain />
        <FilaResumen label="Ingreso mensual contratado" value={resumen.ingresoMensualContratado} />
        <FilaResumen label="Costo mensual Mes 02+" value={resumen.costoMensualMes2} />
      </div>
      <div className={styles.resumenGrupo}>
        <FilaResumen label="Utilidad mensual Mes 02+" value={resumen.utilidadMensualMes2} colored />
        <FilaResumen label="Utilidad total del contrato" value={resumen.utilidadTotalContrato} colored />
        <FilaResumen label="Margen promedio Mes 02+" value={resumen.margenPromedioMes2} isPercent colored />
      </div>
      <div className={styles.resumenGrupo}>
        <FilaResumen label="Contratos bajo el precio mínimo" value={resumen.contratosBajoPrecioMinimo} plain />
      </div>
    </div>
  );
}

const CAMPOS_PARAMETROS = [
  { key: "luz", label: "Luz (S/ por mes)" },
  { key: "costoHoraManoObra", label: "Costo hora mano de obra (S/)" },
  { key: "horasMantenimiento", label: "Horas de mantenimiento (por mes)" },
  { key: "horasInstalacion", label: "Horas de instalación (solo Mes 01)" },
  { key: "costoLona", label: "Costo lona (S/ por m²)" },
  { key: "anchoLona", label: "Ancho lona (m)" },
  { key: "altoLona", label: "Alto lona (m)" },
  { key: "numeroCaras", label: "N° de caras" },
];

function ParametrosPanel({ panelId, isAdmin, onGuardado }) {
  const [parametros, setParametros] = useState(null);
  const [costos, setCostos] = useState(null);
  const [form, setForm] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getParametrosCostoMupi(panelId);
      setParametros(data.parametros);
      setCostos(data.costos);
      setForm(data.parametros);
      setDirty(false);
    } catch (e) {
      setError(e.response?.data?.message ?? "No se pudieron cargar los parámetros");
    } finally {
      setLoading(false);
    }
  }, [panelId]);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <p className={styles.empty}>Cargando parámetros…</p>;
  if (error) return <p className={styles.errorMsg}>{error}</p>;

  const guardar = async () => {
    setSaving(true);
    try {
      const data = await updateParametrosCostoMupi(panelId, form);
      setParametros(data.parametros);
      setCostos(data.costos);
      setDirty(false);
      onGuardado(panelId, data.costos);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.resumenForm}>
      <div className={styles.parametrosGrid}>
        {CAMPOS_PARAMETROS.map((c) => (
          <label key={c.key} className={styles.formField}>
            <span>{c.label}</span>
            {isAdmin ? (
              <input
                type="number"
                step="0.01"
                value={form[c.key]}
                onChange={(e) => { setForm((f) => ({ ...f, [c.key]: e.target.value })); setDirty(true); }}
              />
            ) : (
              <span className={styles.resumenValor}>{parametros[c.key]}</span>
            )}
          </label>
        ))}
        {isAdmin && (
          <div className={styles.parametrosGuardar}>
            <button className={styles.btnPrimary} disabled={!dirty || saving} onClick={guardar}>
              {saving ? "Guardando…" : "Guardar parámetros"}
            </button>
          </div>
        )}
      </div>

      <div className={styles.resumenGrupo}>
        <h3 className={styles.resumenGrupoTitulo}>Costo unitario calculado</h3>
        <FilaResumen label="Área de lona" value={costos.areaLona} plain unidad="m²" />
        <FilaResumen label="Luz" value={costos.luz} />
        <FilaResumen label="Mantenimiento" value={costos.mantenimiento} />
        <FilaResumen label="Producción (Mes 01)" value={costos.produccion} />
        <FilaResumen label="Instalación (Mes 01)" value={costos.instalacion} />
        <FilaResumen label="Costo Mes 01" value={costos.costoMes1} />
        <FilaResumen label="Costo Mes 02 en adelante" value={costos.costoMes2} />
      </div>
    </div>
  );
}

function ModalParametros({ fila, isAdmin, onGuardado, onClose }) {
  return (
    <div className={styles.formOverlay} onClick={onClose}>
      <div className={styles.wizardCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.wizardHeader}>
          <div>
            <h3>{fila.panel.codigo} · {fila.panel.nombre}</h3>
            <p className={styles.wizardSubtitle}>{fila.panel.tipo} · {fila.cliente}</p>
          </div>
          <button className={styles.btnGhost} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.formModalBody}>
          <ParametrosPanel panelId={fila.panelId} isAdmin={isAdmin} onGuardado={onGuardado} />
        </div>
      </div>
    </div>
  );
}

function EditableMoney({ value, isAdmin, highlight, onSave }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    return <span className={highlight ? styles.bajoMinimo : ""}>{fmt(value)}</span>;
  }

  if (editando) {
    const guardar = async () => {
      setSaving(true);
      try {
        await onSave(Number(valor));
        setEditando(false);
      } finally {
        setSaving(false);
      }
    };
    return (
      <span className={styles.editInline}>
        <input type="number" step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} autoFocus />
        <button className={styles.btnGhost} disabled={saving} onClick={guardar}>{saving ? "…" : "OK"}</button>
      </span>
    );
  }

  return (
    <button className={`${styles.linkEdit} ${highlight ? styles.bajoMinimo : ""}`} onClick={() => { setValor(value); setEditando(true); }}>
      {fmt(value)}
    </button>
  );
}

function RegistroTabla({ filas, isAdmin, onPatchPrecioMinimo, onPatchPrecioContratado, onSeleccionarPanel }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Panel / Mupi</th>
            <th>Cliente</th>
            <th>Contacto</th>
            <th>Mes inicio</th>
            <th>Meses</th>
            <th>Precio mínimo</th>
            <th>Precio contrato</th>
            <th>Costo Mes 01</th>
            <th>Costo Mes 02+</th>
            <th>Rentabilidad Mes 01</th>
            <th>Rentabilidad Mes 02+</th>
            <th>Utilidad contrato</th>
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 && (
            <tr><td colSpan={12} className={styles.empty}>Sin reservas para los filtros seleccionados.</td></tr>
          )}
          {filas.map((f) => (
            <tr key={f.reservaId}>
              <td>
                {onSeleccionarPanel ? (
                  <button className={styles.linkEdit} onClick={() => onSeleccionarPanel(f)}>{f.panel.codigo}</button>
                ) : f.panel.codigo}
                <div className={styles.tdSub}>{f.panel.nombre} · {f.panel.tipo}</div>
              </td>
              <td>{f.cliente}</td>
              <td>{f.contacto}</td>
              <td>{mesLabel(f.fechaInicio)}</td>
              <td>{f.meses}</td>
              <td>
                <EditableMoney
                  value={f.precioMinimo}
                  isAdmin={isAdmin}
                  onSave={async (v) => { await updatePanelPrecioMes(f.panelId, v); onPatchPrecioMinimo(f.panelId, v); }}
                />
              </td>
              <td>
                <EditableMoney
                  value={f.precioContratado}
                  isAdmin={isAdmin}
                  highlight={f.bajoMinimo}
                  onSave={async (v) => { await updateReservaPrecioMensual(f.reservaId, v); onPatchPrecioContratado(f.reservaId, v); }}
                />
              </td>
              <td>{fmt(f.costoMes1)}</td>
              <td>{fmt(f.costoMes2)}</td>
              <td className={f.rentabilidadMes1 >= 0 ? styles.positivo : styles.negativo}>
                {fmt(f.rentabilidadMes1)} <span className={styles.resumenPct}>({pct(f.rentabilidadMes1, f.precioContratado)})</span>
              </td>
              <td className={f.rentabilidadMes2 >= 0 ? styles.positivo : styles.negativo}>
                {fmt(f.rentabilidadMes2)} <span className={styles.resumenPct}>({pct(f.rentabilidadMes2, f.precioContratado)})</span>
              </td>
              <td className={f.rentabilidadTotalContrato >= 0 ? styles.positivo : styles.negativo}>{fmt(f.rentabilidadTotalContrato)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Línea de tiempo: rentabilidad del portafolio (ya filtrado) mes a mes en un año dado.
// Se calcula en el cliente a partir de las filas ya cargadas: instantáneo al cambiar
// de año y siempre coherente con los filtros de búsqueda/tipo activos.
// Barras divergentes desde una línea base en cero (verde = utilidad, rojo = pérdida).
function RentabilidadMensualChart({ filas, anio, setAnio }) {
  const [hover, setHover] = useState(null);
  const datos = calcularMensual(filas, anio);

  const width = 820, height = 130, padding = 20;
  const chartW = width - padding * 2;
  const chartH = height - padding * 2;
  const zeroY = padding + chartH / 2;
  const gap = chartW / 12;
  const barW = Math.min(26, gap * 0.55);

  const maxAbs = Math.max(1, ...datos.map((d) => Math.abs(d.rentabilidad)));

  return (
    <div className={styles.chartWrap}>
      <div className={styles.chartHeader}>
        <button className={styles.btnGhost} onClick={() => setAnio(anio - 1)}><ChevronLeft size={16} /></button>
        <span className={styles.chartAnio}>{anio}</span>
        <button className={styles.btnGhost} onClick={() => setAnio(anio + 1)}><ChevronRight size={16} /></button>
        <span className={styles.chartLeyenda}>
          <span className={styles.legendDot} style={{ background: "#10b981" }} /> Utilidad
          <span className={styles.legendDot} style={{ background: "#ef4444" }} /> Pérdida
        </span>
      </div>

      <div className={styles.chartSvgWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} className={styles.chartSvg} role="img" aria-label={`Rentabilidad mensual ${anio}`}>
          <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} className={styles.chartBaseline} />
          {datos.map((d, i) => {
            const x = padding + gap * i + gap / 2 - barW / 2;
            const h = (Math.abs(d.rentabilidad) / maxAbs) * (chartH / 2 - 14);
            const y = d.rentabilidad >= 0 ? zeroY - h : zeroY;
            const color = d.rentabilidad >= 0 ? "#10b981" : "#ef4444";
            return (
              <g key={d.mes} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: "pointer" }}>
                <rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={2} fill={color} opacity={hover === i ? 1 : 0.85} />
                <rect x={x} y={zeroY - 12} width={barW} height={24} fill="transparent" />
                <text x={x + barW / 2} y={height - 6} textAnchor="middle" className={styles.chartMesLabel}>{MESES_LABEL[i]}</text>
              </g>
            );
          })}
        </svg>
        {hover !== null && (
          <div className={styles.chartTooltip} style={{ left: `${((hover + 0.5) / 12) * 100}%` }}>
            <strong>{MESES_LABEL[hover]} {anio}</strong>
            <div>Ingreso: {fmt(datos[hover].ingreso)}</div>
            <div>Costo: {fmt(datos[hover].costo)}</div>
            <div className={datos[hover].rentabilidad >= 0 ? styles.positivo : styles.negativo}>
              Rentabilidad: {fmt(datos[hover].rentabilidad)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BarraFiltros({ busqueda, setBusqueda }) {
  return (
    <div className={styles.filtros}>
      <div className={styles.filtroGroup}>
        <span className={styles.filtroLabel}>Buscar</span>
        <div className={styles.filtroSearch}>
          <Search size={13} />
          <input placeholder="Código, cliente o contacto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          {busqueda && <button className={styles.filtroSearchClear} onClick={() => setBusqueda("")}><X size={12} /></button>}
        </div>
      </div>
    </div>
  );
}

// Pestaña Paneles o Mupis: gráfico, resumen y registro se ven de inmediato;
// los parámetros de costo de un panel/mupi se abren en un modal al hacer clic en su código.
function VistaPorTipo({ filasBase, isAdmin, anio, setAnio, onGuardadoParametros, onPatchPrecioMinimo, onPatchPrecioContratado }) {
  const [busqueda, setBusqueda] = useState("");
  const [modalFila, setModalFila] = useState(null);

  const filasFiltradas = filasBase.filter((f) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const texto = `${f.panel.codigo} ${f.panel.nombre ?? ""} ${f.cliente} ${f.contacto}`.toLowerCase();
    return texto.includes(q);
  });

  const resumen = calcularResumen(filasFiltradas);

  return (
    <>
      <BarraFiltros busqueda={busqueda} setBusqueda={setBusqueda} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rentabilidad mensual{busqueda && " — según filtro"}</h2>
        <RentabilidadMensualChart filas={filasFiltradas} anio={anio} setAnio={setAnio} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumen{busqueda && " — según filtro"}</h2>
        <ResumenGrid resumen={resumen} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Registro</h2>
        <RegistroTabla
          filas={filasFiltradas}
          isAdmin={isAdmin}
          onPatchPrecioMinimo={onPatchPrecioMinimo}
          onPatchPrecioContratado={onPatchPrecioContratado}
          onSeleccionarPanel={setModalFila}
        />
      </section>

      {modalFila && (
        <ModalParametros fila={modalFila} isAdmin={isAdmin} onGuardado={onGuardadoParametros} onClose={() => setModalFila(null)} />
      )}
    </>
  );
}

// Pestaña Todos: gráfico, resumen combinado y registro completo; mismo modal de parámetros al hacer clic en una fila.
// Paneles "Libre externo" (de terceros, sin cliente/precio propio): estima cuánto se
// pudo haber generado con el precio mínimo del panel mientras estuvo libre.
function OportunidadPerdida() {
  const [datos, setDatos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOportunidadPerdida();
      setDatos(data);
    } catch (e) {
      setError(e.response?.data?.message ?? "No se pudo cargar la oportunidad perdida");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  if (loading) return <p className={styles.empty}>Cargando…</p>;
  if (error) return <p className={styles.errorMsg}>{error}</p>;

  return (
    <>
      <div className={styles.resumenForm}>
        <div className={styles.resumenGrupo}>
          <FilaResumen label="Periodos Libre externo registrados" value={datos.filas.length} plain />
          <FilaResumen label="Total que se pudo haber generado" value={datos.totalPerdido} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Panel / Mupi</th>
              <th>Desde</th>
              <th>Hasta</th>
              <th>Meses</th>
              <th>Precio de referencia</th>
              <th>Monto que se pudo generar</th>
            </tr>
          </thead>
          <tbody>
            {datos.filas.length === 0 && (
              <tr><td colSpan={6} className={styles.empty}>Sin periodos "Libre externo" registrados.</td></tr>
            )}
            {datos.filas.map((f) => (
              <tr key={f.reservaId}>
                <td>
                  <div>{f.panel.codigo}</div>
                  <div className={styles.tdSub}>{f.panel.nombre} · {f.panel.tipo}</div>
                </td>
                <td>{mesLabel(f.fechaInicio)}</td>
                <td>{mesLabel(f.fechaFin)}</td>
                <td>{f.meses}</td>
                <td>{fmt(f.precioReferencia)}</td>
                <td>{fmt(f.montoPerdido)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// Registro de cada trabajo de producción/instalación (el inicial y cualquier renovación
// de banner durante el contrato). El costo sale de Panel.costoProduccion + costoInstalacion;
// aquí solo se registra fecha y cuánto se cobró, para ver cuántas veces se renueva y la
// rentabilidad de ese servicio — aplica igual a Paneles y Mupis.
function ProduccionInstalacion({ filas, isAdmin }) {
  const [eventos, setEventos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ reservaId: "", fecha: "", montoCobrado: "", notas: "" });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEventosProduccion();
      setEventos(data);
    } catch (e) {
      setError(e.response?.data?.message ?? "No se pudieron cargar los eventos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => {
    setForm((f) => (f.reservaId ? f : { ...f, reservaId: filas[0]?.reservaId ?? "" }));
  }, [filas]);

  const agregar = async (ev) => {
    ev.preventDefault();
    setFormError("");
    if (!form.reservaId || !form.fecha || form.montoCobrado === "") {
      setFormError("Contrato, fecha y monto cobrado son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await crearEventoProduccion({
        reservaId: Number(form.reservaId),
        fecha: form.fecha,
        montoCobrado: Number(form.montoCobrado),
        notas: form.notas || null,
      });
      setForm((f) => ({ ...f, fecha: "", montoCobrado: "", notas: "" }));
      await cargar();
    } catch (e) {
      setFormError(e.response?.data?.message ?? "Error al registrar el evento");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id) => {
    if (!confirm("¿Eliminar este evento?")) return;
    await eliminarEventoProduccion(id);
    cargar();
  };

  return (
    <>
      {isAdmin && (
        <form className={styles.eventoForm} onSubmit={agregar}>
          {formError && <p className={styles.errorMsg}>{formError}</p>}
          <div className={styles.formField}>
            <label>Contrato</label>
            <select value={form.reservaId} onChange={(e) => setForm((f) => ({ ...f, reservaId: e.target.value }))}>
              {filas.map((f) => (
                <option key={f.reservaId} value={f.reservaId}>{f.panel.codigo} · {f.cliente} ({f.panel.tipo})</option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label>Fecha</label>
            <input type="date" value={form.fecha} onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))} />
          </div>
          <div className={styles.formField}>
            <label>Monto cobrado (S/)</label>
            <input type="number" step="0.01" min="0" value={form.montoCobrado} onChange={(e) => setForm((f) => ({ ...f, montoCobrado: e.target.value }))} placeholder="500" />
          </div>
          <div className={styles.formField}>
            <label>Notas <span className={styles.opcional}>(opcional)</span></label>
            <input value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} placeholder="Ej. Renovación de banner" />
          </div>
          <button className={styles.btnPrimary} disabled={saving} type="submit">
            {saving ? "Guardando…" : "Registrar evento"}
          </button>
        </form>
      )}

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : error ? (
        <p className={styles.errorMsg}>{error}</p>
      ) : (
        <>
          <div className={styles.resumenForm}>
            <div className={styles.resumenGrupo}>
              <FilaResumen label="Eventos registrados" value={eventos.resumen.nEventos} plain />
              <FilaResumen label="Total cobrado" value={eventos.resumen.totalCobrado} />
            </div>
            <div className={styles.resumenGrupo}>
              <FilaResumen label="Total costo" value={eventos.resumen.totalCosto} />
              <FilaResumen label="Rentabilidad total" value={eventos.resumen.totalRentabilidad} colored />
            </div>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Panel / Mupi</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Cobrado</th>
                  <th>Costo</th>
                  <th>Rentabilidad</th>
                  <th>Notas</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {eventos.filas.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} className={styles.empty}>Sin eventos de producción/instalación registrados.</td></tr>
                )}
                {eventos.filas.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div>{e.panel.codigo}</div>
                      <div className={styles.tdSub}>{e.panel.nombre} · {e.panel.tipo}</div>
                    </td>
                    <td>{e.cliente ?? "—"}</td>
                    <td>{mesLabel(e.fecha)}</td>
                    <td>{fmt(e.montoCobrado)}</td>
                    <td>{fmt(e.costo)}</td>
                    <td className={e.rentabilidad >= 0 ? styles.positivo : styles.negativo}>{fmt(e.rentabilidad)}</td>
                    <td className={styles.tdSub}>{e.notas ?? "—"}</td>
                    {isAdmin && (
                      <td>
                        <button className={styles.linkEdit} onClick={() => eliminar(e.id)}>Eliminar</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

function VistaTodos({ filas, isAdmin, anio, setAnio, onGuardadoParametros, onPatchPrecioMinimo, onPatchPrecioContratado }) {
  const [busqueda, setBusqueda] = useState("");
  const [modalFila, setModalFila] = useState(null);

  const filasFiltradas = filas.filter((f) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    const texto = `${f.panel.codigo} ${f.panel.nombre ?? ""} ${f.cliente} ${f.contacto}`.toLowerCase();
    return texto.includes(q);
  });

  const resumen = calcularResumen(filasFiltradas);

  return (
    <>
      <BarraFiltros busqueda={busqueda} setBusqueda={setBusqueda} />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Rentabilidad mensual del portafolio{busqueda && " — según filtro"}</h2>
        <RentabilidadMensualChart filas={filasFiltradas} anio={anio} setAnio={setAnio} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Resumen combinado (Paneles + Mupis){busqueda && " — según filtro"}</h2>
        <ResumenGrid resumen={resumen} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Registro de paneles y mupis</h2>
        <RegistroTabla
          filas={filasFiltradas}
          isAdmin={isAdmin}
          onPatchPrecioMinimo={onPatchPrecioMinimo}
          onPatchPrecioContratado={onPatchPrecioContratado}
          onSeleccionarPanel={setModalFila}
        />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Oportunidad perdida (paneles Libre externo)</h2>
        <OportunidadPerdida />
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Producción e instalación (renovaciones de banner)</h2>
        <ProduccionInstalacion filas={filas} isAdmin={isAdmin} />
      </section>

      {modalFila && (
        <ModalParametros fila={modalFila} isAdmin={isAdmin} onGuardado={onGuardadoParametros} onClose={() => setModalFila(null)} />
      )}
    </>
  );
}

export default function Rentabilidad() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("TODOS");
  const [anioMensual, setAnioMensual] = useState(new Date().getFullYear());

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getRentabilidadMupis();
      setFilas(data.filas);
    } catch (e) {
      setError(e.response?.data?.message ?? "No se pudo conectar con el servidor");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const handleParametrosGuardados = (panelId, nuevosCostos) => {
    setFilas((prev) => prev.map((f) => (f.panelId === panelId ? derivarFila(f, nuevosCostos.costoMes1, nuevosCostos.costoMes2) : f)));
  };

  const handlePrecioMinimoGuardado = (panelId, nuevoPrecioMinimo) => {
    setFilas((prev) => prev.map((f) =>
      f.panelId === panelId ? derivarFila({ ...f, precioMinimo: nuevoPrecioMinimo }, f.costoMes1, f.costoMes2) : f
    ));
  };

  const handlePrecioContratadoGuardado = (reservaId, nuevoPrecio) => {
    setFilas((prev) => prev.map((f) =>
      f.reservaId === reservaId ? derivarFila({ ...f, precioContratado: nuevoPrecio }, f.costoMes1, f.costoMes2) : f
    ));
  };

  const filasPaneles = filas.filter((f) => f.panel.tipo !== "MUPI");
  const filasMupis = filas.filter((f) => f.panel.tipo === "MUPI");

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rentabilidad de Paneles y Mupis</h1>
          <p className={styles.subtitle}>Paneles y Mupis por separado, y un resumen combinado con la evolución mensual</p>
        </div>
        <button className={styles.btnOutline} onClick={cargar} title="Actualizar"><RefreshCw size={16} /></button>
      </div>

      {loading ? (
        <p className={styles.empty}>Cargando…</p>
      ) : error ? (
        <p className={styles.errorMsg}>{error}</p>
      ) : (
        <>
          <div className={styles.tabs}>
            <button className={`${styles.tabBtn} ${tab === "TODOS" ? styles.tabBtnActive : ""}`} onClick={() => setTab("TODOS")}>
              Todos ({filas.length})
            </button>
            <button className={`${styles.tabBtn} ${tab === "PANELES" ? styles.tabBtnActive : ""}`} onClick={() => setTab("PANELES")}>
              Paneles ({filasPaneles.length})
            </button>
            <button className={`${styles.tabBtn} ${tab === "MUPIS" ? styles.tabBtnActive : ""}`} onClick={() => setTab("MUPIS")}>
              Mupis ({filasMupis.length})
            </button>
          </div>

          {tab === "TODOS" && (
            <VistaTodos
              filas={filas}
              isAdmin={isAdmin}
              anio={anioMensual}
              setAnio={setAnioMensual}
              onGuardadoParametros={handleParametrosGuardados}
              onPatchPrecioMinimo={handlePrecioMinimoGuardado}
              onPatchPrecioContratado={handlePrecioContratadoGuardado}
            />
          )}
          {tab === "PANELES" && (
            <VistaPorTipo
              key="paneles"
              filasBase={filasPaneles}
              isAdmin={isAdmin}
              anio={anioMensual}
              setAnio={setAnioMensual}
              onGuardadoParametros={handleParametrosGuardados}
              onPatchPrecioMinimo={handlePrecioMinimoGuardado}
              onPatchPrecioContratado={handlePrecioContratadoGuardado}
            />
          )}
          {tab === "MUPIS" && (
            <VistaPorTipo
              key="mupis"
              filasBase={filasMupis}
              isAdmin={isAdmin}
              anio={anioMensual}
              setAnio={setAnioMensual}
              onGuardadoParametros={handleParametrosGuardados}
              onPatchPrecioMinimo={handlePrecioMinimoGuardado}
              onPatchPrecioContratado={handlePrecioContratadoGuardado}
            />
          )}
        </>
      )}
    </div>
  );
}
