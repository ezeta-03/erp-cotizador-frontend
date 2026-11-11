import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "../components/ui";
import { descargarFlujoEfectivo, getFlujoEfectivo } from "../api/flujoEfectivo";
import { soles } from "../utils/formato";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import styles from "./cuentas.module.scss";

const hoy = () => new Date().toLocaleDateString("en-CA");
const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const finDeMes = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).toLocaleDateString("en-CA");
  return ultimo > hoy() ? hoy() : ultimo;
};
const restarMeses = (mes, n) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m - 1 - n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const num = (v) => (v ? Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");
const pct = (v) => `${Number(v || 0).toFixed(1)} %`;
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});

const celda = { padding: "0.45rem 0.6rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" };
const numerica = { ...celda, textAlign: "right", fontVariantNumeric: "tabular-nums" };
const primera = { ...celda, position: "sticky", left: 0, background: "var(--color-surface)", zIndex: 1, whiteSpace: "normal", minWidth: 220, maxWidth: 320 };

// Tabla de un bloque (entradas, salidas o líneas): una columna por mes, total y %.
// Las filas con detalle (cliente o proveedor) se despliegan con un clic.
function TablaFlujo({ datos, meses, titulo, color, conDetalle = true, pie }) {
  const [abiertas, setAbiertas] = useState(() => new Set());
  const alternar = (clave) => setAbiertas((s) => {
    const n = new Set(s);
    if (n.has(clave)) n.delete(clave);
    else n.add(clave);
    return n;
  });

  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)", marginBottom: "1.25rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...primera, color, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{titulo}</th>
            {meses.map((m) => <th key={m.clave} style={{ ...numerica, fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>{m.etiqueta}</th>)}
            <th style={{ ...numerica, fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>Total</th>
            <th style={{ ...numerica, fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {datos.filas.length === 0 && (
            <tr><td colSpan={meses.length + 3} style={{ ...celda, color: "var(--color-text3)" }}>Sin movimientos en el periodo</td></tr>
          )}
          {datos.filas.map((f) => {
            const desplegable = conDetalle && f.detalle?.length > 0;
            const abierta = abiertas.has(f.clave);
            return (
              <Fragment key={f.clave}>
                <tr>
                  <td style={primera}>
                    {desplegable ? (
                      <button type="button" onClick={() => alternar(f.clave)} aria-expanded={abierta}
                        style={{ all: "unset", cursor: "pointer", display: "inline-flex", gap: "0.3rem", alignItems: "flex-start", fontWeight: 600 }}>
                        {abierta ? <ChevronDown size={14} style={{ marginTop: 3, flexShrink: 0 }} /> : <ChevronRight size={14} style={{ marginTop: 3, flexShrink: 0 }} />}
                        {f.nombre}
                      </button>
                    ) : <strong style={{ fontWeight: 600 }}>{f.nombre}</strong>}
                  </td>
                  {meses.map((m) => <td key={m.clave} style={numerica}>{num(f.meses[m.clave])}</td>)}
                  <td style={{ ...numerica, fontWeight: 700 }}>{num(f.total)}</td>
                  <td style={numerica}>{pct(f.porcentaje)}</td>
                </tr>
                {abierta && f.detalle.map((d) => (
                  <tr key={`${f.clave}-${d.nombre}`}>
                    <td style={{ ...primera, paddingLeft: "1.9rem", color: "var(--color-text2)", fontSize: "var(--text-xs)" }}>{d.nombre}</td>
                    {meses.map((m) => <td key={m.clave} style={{ ...numerica, color: "var(--color-text2)", fontSize: "var(--text-xs)" }}>{num(d.meses[m.clave])}</td>)}
                    <td style={{ ...numerica, color: "var(--color-text2)", fontSize: "var(--text-xs)" }}>{num(d.total)}</td>
                    <td style={{ ...numerica, color: "var(--color-text3)", fontSize: "var(--text-xs)" }}>{pct(f.total ? (d.total / f.total) * 100 : 0)}</td>
                  </tr>
                ))}
              </Fragment>
            );
          })}
          <tr style={{ background: "var(--color-surface2, var(--color-bg))" }}>
            <td style={{ ...primera, background: "var(--color-surface2, var(--color-bg))", fontWeight: 700 }}>Total {titulo.toLowerCase()}</td>
            {meses.map((m) => <td key={m.clave} style={{ ...numerica, fontWeight: 700 }}>{num(datos.totales.meses[m.clave])}</td>)}
            <td style={{ ...numerica, fontWeight: 700 }}>{num(datos.totales.total)}</td>
            <td style={numerica}>{datos.totales.total ? "100 %" : ""}</td>
          </tr>
          {pie}
        </tbody>
      </table>
    </div>
  );
}

// Estado de Flujo de Efectivo: dinero que entró y salió por mes (por la fecha
// del cobro o pago), con detalle por cliente/proveedor, % y reparto de las
// salidas por línea de negocio.
export default function FlujoEfectivo() {
  const mesActual = hoy().slice(0, 7);
  const [modo, setModo] = useState("ANIO");
  const [rango, setRango] = useState({ desde: `${mesActual.slice(0, 4)}-01`, hasta: mesActual });
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [descargando, setDescargando] = useState(null);
  const { show: showToast, ToastNode } = useToast();

  const periodo = modo === "ANIO" ? { desde: `${mesActual.slice(0, 4)}-01-01`, hasta: hoy() }
    : modo === "DOCE" ? { desde: `${restarMeses(mesActual, 11)}-01`, hasta: hoy() }
    : { desde: `${rango.desde}-01`, hasta: finDeMes(rango.hasta) };

  useEffect(() => {
    if (!periodo.desde || !periodo.hasta || periodo.desde > periodo.hasta) return;
    setDatos(null);
    setError(null);
    getFlujoEfectivo(periodo)
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudo calcular el flujo de efectivo"));
  }, [periodo.desde, periodo.hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  const descargar = async (formato) => {
    setDescargando(formato);
    try {
      await descargarFlujoEfectivo(periodo, formato);
    } catch {
      showToast(`No se pudo generar el ${formato === "pdf" ? "PDF" : "Excel"}`);
    } finally {
      setDescargando(null);
    }
  };

  const meses = datos?.meses || [];
  const filaResumen = (etiqueta, valores, total, estilo = {}) => (
    <tr>
      <td style={{ ...primera, fontWeight: 700, ...estilo }}>{etiqueta}</td>
      {meses.map((m) => (
        <td key={m.clave} style={{ ...numerica, fontWeight: 700, color: valores[m.clave] < 0 ? "var(--color-danger)" : undefined, ...estilo }}>
          {num(valores[m.clave]) === "—" ? "0.00" : num(valores[m.clave])}
        </td>
      ))}
      <td style={{ ...numerica, fontWeight: 700, color: total < 0 ? "var(--color-danger)" : undefined, ...estilo }}>{total === null ? "" : num(total) === "—" ? "0.00" : num(total)}</td>
      <td style={{ ...numerica, ...estilo }} />
    </tr>
  );

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Flujo de Efectivo</h2>
            <p className={styles.subtitle}>
              Dinero que entró y salió, por la fecha del cobro o pago · del {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)} · en soles
            </p>
          </div>
          <div className={styles.acciones}>
            <Button variant="secondary" icon={FileSpreadsheet} loading={descargando === "xlsx"} disabled={!datos} onClick={() => descargar("xlsx")}>Excel</Button>
            <Button variant="secondary" icon={FileText} loading={descargando === "pdf"} disabled={!datos} onClick={() => descargar("pdf")}>PDF</Button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
          <button type="button" style={chip(modo === "ANIO")} onClick={() => setModo("ANIO")}>Este año</button>
          <button type="button" style={chip(modo === "DOCE")} onClick={() => setModo("DOCE")}>Últimos 12 meses</button>
          <button type="button" style={chip(modo === "RANGO")} onClick={() => setModo("RANGO")}>Elegir meses</button>
          {modo === "RANGO" && (
            <>
              <input type="month" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Desde el mes" title="Desde"
                value={rango.desde} max={rango.hasta || mesActual} onChange={(e) => e.target.value && setRango((r) => ({ ...r, desde: e.target.value }))} />
              <input type="month" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Hasta el mes" title="Hasta"
                value={rango.hasta} min={rango.desde} max={mesActual} onChange={(e) => e.target.value && setRango((r) => ({ ...r, hasta: e.target.value }))} />
              <span className={styles.sub}>Hasta 24 meses</span>
            </>
          )}
        </div>

        {error ? <p className={styles.error}>{error}</p> : !datos ? (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Calculando el flujo...</div>
        ) : (
          <>
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Entró</p>
                <p className={styles.kpiValor} style={{ color: "var(--color-success)" }}>{soles(datos.entradas.totales.total)}</p>
                <p className={styles.kpiNota}>Cobros a clientes y detracciones recibidas</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Salió</p>
                <p className={styles.kpiValor} style={{ color: "var(--color-danger)" }}>{soles(datos.salidas.totales.total)}</p>
                <p className={styles.kpiNota}>
                  {datos.entradas.totales.total
                    ? `${pct((datos.salidas.totales.total / datos.entradas.totales.total) * 100)} de lo que entró`
                    : "Pagos a proveedores y cuotas de paneles"}
                </p>
              </div>
              <div className={`${styles.kpi} ${datos.neto.total < 0 ? styles.kpiAlerta : ""}`}>
                <p className={styles.kpiLabel}>Flujo neto</p>
                <p className={styles.kpiValor}>{soles(datos.neto.total)}</p>
                <p className={styles.kpiNota}>Entradas − salidas del periodo</p>
              </div>
            </div>

            <TablaFlujo datos={datos.entradas} meses={meses} titulo="Entradas" color="var(--color-success)" />
            <TablaFlujo datos={datos.salidas} meses={meses} titulo="Salidas" color="var(--color-danger)"
              pie={(
                <>
                  {filaResumen("Flujo neto", datos.neto.meses, datos.neto.total, { borderTop: "2px solid var(--color-text)" })}
                  {filaResumen("Acumulado", datos.acumulado, null, { fontWeight: 500, color: "var(--color-text2)" })}
                </>
              )} />
            <p className={styles.sub} style={{ margin: "-0.75rem 0 1.25rem" }}>
              Clic en una fila para ver el detalle por cliente o proveedor. Montos en dólares convertidos a soles.
              {datos.retencionesExcluidas > 0 && ` No incluye retenciones de clientes (${soles(datos.retencionesExcluidas)}): no son dinero que entra.`}
            </p>

            <TablaFlujo datos={datos.salidasPorLinea} meses={meses} titulo="Salidas por línea de negocio" color="var(--color-text)" conDetalle={false} />
            <p className={styles.sub} style={{ margin: "-0.75rem 0 0" }}>
              Lo pagado a cada proveedor se reparte según sus % por línea de negocio (Por pagar → Proveedores).
              Sin reparto, o cuotas de paneles, va a &quot;Sin línea de negocio&quot;.
            </p>
          </>
        )}
      </div>
    </>
  );
}
