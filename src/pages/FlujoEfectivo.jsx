import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "../components/ui";
import { descargarFlujoEfectivo, getFlujoEfectivo } from "../api/flujoEfectivo";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import styles from "./cuentas.module.scss";

const MONEDAS = ["PEN", "USD"];
const ETIQUETA_MONEDA = { PEN: "Soles (PEN)", USD: "Dólares (USD)" };

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
// Saldos: null = en blanco (cuenta sin saldo inicial a esa fecha); 0 se muestra como 0.00.
const saldo = (v) => (v === null || v === undefined ? "" : Number(v).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
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
function TablaFlujo({ datos, meses, titulo, color, conDetalle = true }) {
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
        </tbody>
      </table>
    </div>
  );
}

// Resumen de una moneda, con la forma de la captura de referencia:
// saldo inicial del mes arriba, luego entradas, salidas, flujo neto y saldo final acumulado.
function ResumenMoneda({ moneda, datos, meses }) {
  const fila = ({ etiqueta, valores, total, negrita = false, linea = false, color }) => (
    <tr style={linea ? { borderTop: "2px solid var(--color-text)" } : undefined}>
      <td style={{ ...primera, fontWeight: negrita ? 700 : 500, color }}>{etiqueta}</td>
      {meses.map((m) => {
        const v = valores[m.clave];
        return (
          <td key={m.clave} style={{ ...numerica, fontWeight: negrita ? 700 : 500, color: v < 0 ? "var(--color-danger)" : color }}>
            {saldo(v)}
          </td>
        );
      })}
      <td style={{ ...numerica, fontWeight: 700 }}>{total === null || total === undefined ? "" : saldo(total)}</td>
    </tr>
  );

  const primerMes = meses[0]?.clave;
  const ultimoMes = meses[meses.length - 1]?.clave;

  return (
    <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)", marginBottom: "1.25rem" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...primera, fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text3)" }}>
              {ETIQUETA_MONEDA[moneda]}
            </th>
            {meses.map((m) => <th key={m.clave} style={{ ...numerica, fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>{m.etiqueta}</th>)}
            <th style={{ ...numerica, fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>Periodo</th>
          </tr>
        </thead>
        <tbody>
          {fila({ etiqueta: "Saldo inicial del mes", valores: datos.saldoInicial, total: primerMes ? datos.saldoInicial[primerMes] : null })}
          {fila({ etiqueta: "Entradas", valores: datos.entradas.totales.meses, total: datos.entradas.totales.total, color: "var(--color-success)" })}
          {fila({ etiqueta: "Salidas", valores: datos.salidas.totales.meses, total: datos.salidas.totales.total, color: "var(--color-danger)" })}
          {fila({ etiqueta: "Flujo neto del mes", valores: datos.neto.meses, total: datos.neto.total, negrita: true, linea: true })}
          {fila({ etiqueta: "Saldo final acumulado", valores: datos.saldoFinal, total: ultimoMes ? datos.saldoFinal[ultimoMes] : null, negrita: true })}
        </tbody>
      </table>
    </div>
  );
}

// Estado de Flujo de Efectivo: dinero que entró y salió por mes (por la fecha
// del cobro o pago), en soles y en dólares por separado, con saldo inicial y
// acumulado de cada moneda (desde el saldo de Caja y Bancos).
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

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Flujo de Efectivo</h2>
            <p className={styles.subtitle}>
              Dinero que entró y salió, por la fecha del cobro o pago · del {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)} · soles y dólares por separado
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
            {MONEDAS.map((mon) => {
              const b = datos.monedas?.[mon];
              if (!b) return null;
              return (
                <section key={mon} style={{ marginBottom: "2rem" }}>
                  {b.cuentas === 0 && (
                    <p className={styles.sub} style={{ margin: "0 0 0.75rem" }}>
                      No hay cuentas en {mon === "USD" ? "dólares" : "soles"} en Caja y Bancos: el saldo inicial y el acumulado no se pueden calcular.
                    </p>
                  )}
                  <ResumenMoneda moneda={mon} datos={b} meses={meses} />
                  <TablaFlujo datos={b.entradas} meses={meses} titulo="Entradas" color="var(--color-success)" />
                  <TablaFlujo datos={b.salidas} meses={meses} titulo="Salidas" color="var(--color-danger)" />
                  <TablaFlujo datos={b.salidasPorLinea} meses={meses} titulo="Salidas por línea de negocio" color="var(--color-text)" conDetalle={false} />
                </section>
              );
            })}

            <p className={styles.sub} style={{ margin: "-0.75rem 0 0" }}>
              Clic en una fila para ver el detalle por cliente o proveedor. Cada moneda usa el monto de la cuenta donde entró o salió el dinero.
              Saldo inicial del mes = saldo de las cuentas de esa moneda al cierre del mes anterior; en blanco si alguna cuenta aún no tiene saldo inicial a esa fecha.
              {datos.retencionesExcluidas > 0 && ` No incluye retenciones de clientes (S/ ${num(datos.retencionesExcluidas)}): no son dinero que entra.`}
            </p>
            <p className={styles.sub} style={{ margin: "0.5rem 0 0" }}>
              Excel y PDF siguen mostrando el consolidado en soles.
            </p>
          </>
        )}
      </div>
    </>
  );
}
