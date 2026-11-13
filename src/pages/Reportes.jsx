import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getRecaudoVsCobrar } from "../api/reportes";
import { soles } from "../utils/formato";
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
const pct = (v) => `${Number(v || 0).toFixed(1)} %`;
const num = (v) => Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});
const celda = { padding: "0.45rem 0.6rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" };
const numerica = { ...celda, textAlign: "right", fontVariantNumeric: "tabular-nums" };

// Agrupa los meses en trimestres calendario ("T1 2026"). Los meses sueltos al inicio o
// al final del periodo forman trimestres parciales.
function agruparTrimestres(meses) {
  const grupos = new Map();
  for (const f of meses) {
    const [a, m] = f.clave.split("-").map(Number);
    const t = Math.floor((m - 1) / 3) + 1;
    const clave = `${a}-T${t}`;
    if (!grupos.has(clave)) grupos.set(clave, { clave, etiqueta: `T${t} ${String(a).slice(2)}`, facturado: 0, recaudado: 0, porCobrar: 0 });
    const g = grupos.get(clave);
    g.facturado += f.facturado;
    g.recaudado += f.recaudado;
    g.porCobrar += f.porCobrar;
  }
  return [...grupos.values()];
}

export default function Reportes() {
  const mesActual = hoy().slice(0, 7);
  const [modo, setModo] = useState("ANIO");
  const [rango, setRango] = useState({ desde: `${mesActual.slice(0, 4)}-01`, hasta: mesActual });
  const [agrupacion, setAgrupacion] = useState("MES");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);

  const periodo = modo === "ANIO" ? { desde: `${mesActual.slice(0, 4)}-01-01`, hasta: hoy() }
    : modo === "SEIS" ? { desde: `${restarMeses(mesActual, 5)}-01`, hasta: hoy() }
    : modo === "DOCE" ? { desde: `${restarMeses(mesActual, 11)}-01`, hasta: hoy() }
    : { desde: `${rango.desde}-01`, hasta: finDeMes(rango.hasta) };

  useEffect(() => {
    if (!periodo.desde || !periodo.hasta || periodo.desde > periodo.hasta) return;
    setDatos(null);
    setError(null);
    getRecaudoVsCobrar(periodo)
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudo calcular el reporte"));
  }, [periodo.desde, periodo.hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  const filas = useMemo(() => {
    if (!datos) return [];
    return agrupacion === "TRIMESTRE" ? agruparTrimestres(datos.meses) : datos.meses;
  }, [datos, agrupacion]);

  const t = datos?.totales;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Reportes · Recaudado vs por cobrar</h2>
          <p className={styles.subtitle}>
            Zaazmago · en soles · del {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
        <button type="button" style={chip(modo === "ANIO")} onClick={() => setModo("ANIO")}>Este año</button>
        <button type="button" style={chip(modo === "SEIS")} onClick={() => setModo("SEIS")}>Últimos 6 meses</button>
        <button type="button" style={chip(modo === "DOCE")} onClick={() => setModo("DOCE")}>Últimos 12 meses</button>
        <button type="button" style={chip(modo === "RANGO")} onClick={() => setModo("RANGO")}>Elegir meses</button>
        {modo === "RANGO" && (
          <>
            <input type="month" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Desde el mes"
              value={rango.desde} max={rango.hasta || mesActual} onChange={(e) => e.target.value && setRango((r) => ({ ...r, desde: e.target.value }))} />
            <input type="month" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Hasta el mes"
              value={rango.hasta} min={rango.desde} max={mesActual} onChange={(e) => e.target.value && setRango((r) => ({ ...r, hasta: e.target.value }))} />
            <span className={styles.sub}>Hasta 24 meses</span>
          </>
        )}
        <span style={{ flex: 1 }} />
        <button type="button" style={chip(agrupacion === "MES")} onClick={() => setAgrupacion("MES")}>Por mes</button>
        <button type="button" style={chip(agrupacion === "TRIMESTRE")} onClick={() => setAgrupacion("TRIMESTRE")}>Por trimestre</button>
      </div>

      {error ? <p className={styles.error}>{error}</p> : !datos ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Calculando el reporte...</div>
      ) : (
        <>
          <div className={styles.kpis}>
            <div className={styles.kpi}>
              <p className={styles.kpiLabel}>Facturado</p>
              <p className={styles.kpiValor}>{soles(t.facturado)}</p>
              <p className={styles.kpiNota}>Facturas y boletas emitidas en el periodo</p>
            </div>
            <div className={styles.kpi}>
              <p className={styles.kpiLabel}>Recaudado</p>
              <p className={styles.kpiValor} style={{ color: "var(--color-success)" }}>{soles(t.recaudado)}</p>
              <p className={styles.kpiNota}>Cobros y detracciones recibidos en el periodo</p>
            </div>
            <div className={`${styles.kpi} ${t.porCobrar > 0 ? styles.kpiAlerta : ""}`}>
              <p className={styles.kpiLabel}>Por cobrar</p>
              <p className={styles.kpiValor}>{soles(t.porCobrar)}</p>
              <p className={styles.kpiNota}>Saldo hoy de lo facturado en el periodo</p>
            </div>
            <div className={styles.kpi}>
              <p className={styles.kpiLabel}>% cobrado</p>
              <p className={styles.kpiValor}>{pct(t.porcentajeCobrado)}</p>
              <p className={styles.kpiNota}>Cobrado de lo facturado en el periodo</p>
            </div>
          </div>

          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-surface)", padding: "1rem", marginBottom: "1.25rem" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={filas} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => num(v)} />
                <Tooltip formatter={(v) => soles(v)} />
                <Legend />
                <Bar dataKey="recaudado" name="Recaudado" fill="#059669" />
                <Bar dataKey="porCobrar" name="Por cobrar" fill="#FF6600" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)", marginBottom: "1.25rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...celda, textAlign: "left" }}>Periodo</th>
                  <th style={numerica}>Facturado</th>
                  <th style={numerica}>Recaudado</th>
                  <th style={numerica}>Por cobrar</th>
                  <th style={numerica}>% cobrado</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const cobrado = f.facturado - f.porCobrar;
                  return (
                    <tr key={f.clave}>
                      <td style={{ ...celda, fontWeight: 600 }}>{f.etiqueta}</td>
                      <td style={numerica}>{num(f.facturado)}</td>
                      <td style={{ ...numerica, color: "var(--color-success)" }}>{num(f.recaudado)}</td>
                      <td style={numerica}>{num(f.porCobrar)}</td>
                      <td style={numerica}>{pct(f.facturado ? (cobrado / f.facturado) * 100 : 0)}</td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--color-surface2, var(--color-bg))" }}>
                  <td style={{ ...celda, fontWeight: 700 }}>Total</td>
                  <td style={{ ...numerica, fontWeight: 700 }}>{num(t.facturado)}</td>
                  <td style={{ ...numerica, fontWeight: 700 }}>{num(t.recaudado)}</td>
                  <td style={{ ...numerica, fontWeight: 700 }}>{num(t.porCobrar)}</td>
                  <td style={{ ...numerica, fontWeight: 700 }}>{pct(t.porcentajeCobrado)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p className={styles.sub} style={{ margin: "0 0 1rem" }}>
            Facturado y por cobrar se agrupan por mes de emisión; recaudado, por mes del pago. Por cobrar es el saldo a la fecha de corte ({fechaCorta(datos.corte)}).
            Dólares convertidos a soles con el tipo de cambio del documento.
          </p>
        </>
      )}
    </div>
  );
}
