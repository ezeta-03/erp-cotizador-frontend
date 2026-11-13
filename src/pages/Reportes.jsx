import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui";
import { exportarReporte, getReporte } from "../api/reportes";
import { soles } from "../utils/formato";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import styles from "./cuentas.module.scss";

const REPORTES = [
  { id: "recaudo", nombre: "Recaudado vs por cobrar" },
  { id: "ventas-documentos", nombre: "Ventas por documento" },
  { id: "precios-proveedores", nombre: "Precios de proveedores" },
  { id: "compras-clientes", nombre: "Qué compraron los clientes" },
  { id: "mejores-vendedores", nombre: "Mejores vendedores" },
  { id: "mejores-compradores", nombre: "Mejores compradores" },
];

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
const num = (v) => Number(v || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const celdaTexto = (valor, formato) => {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (formato === "moneda") return soles(valor);
  if (formato === "porcentaje") return `${num(valor)} %`;
  if (formato === "entero") return Number(valor).toLocaleString("es-PE");
  return String(valor);
};
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});
const celda = { padding: "0.45rem 0.6rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", whiteSpace: "nowrap" };

// Agrupa filas mensuales en trimestres (solo para el reporte de recaudo).
function agruparTrimestres(filas, columnasSumables) {
  const grupos = new Map();
  for (const f of filas) {
    const [a, m] = f.clave.split("-").map(Number);
    const t = Math.floor((m - 1) / 3) + 1;
    const clave = `${a}-T${t}`;
    if (!grupos.has(clave)) {
      const g = { clave, mes: `T${t} ${String(a).slice(2)}` };
      columnasSumables.forEach((c) => { g[c] = 0; });
      grupos.set(clave, g);
    }
    columnasSumables.forEach((c) => { grupos.get(clave)[c] += Number(f[c]) || 0; });
  }
  return [...grupos.values()];
}

export default function Reportes() {
  const mesActual = hoy().slice(0, 7);
  const { show: showToast, ToastNode } = useToast();
  const [tipo, setTipo] = useState("recaudo");
  const [modo, setModo] = useState("ANIO");
  const [rango, setRango] = useState({ desde: `${mesActual.slice(0, 4)}-01`, hasta: mesActual });
  const [agrupacion, setAgrupacion] = useState("MES");
  const [reporte, setReporte] = useState(null);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  const periodo = modo === "ANIO" ? { desde: `${mesActual.slice(0, 4)}-01-01`, hasta: hoy() }
    : modo === "SEIS" ? { desde: `${restarMeses(mesActual, 5)}-01`, hasta: hoy() }
    : modo === "DOCE" ? { desde: `${restarMeses(mesActual, 11)}-01`, hasta: hoy() }
    : { desde: `${rango.desde}-01`, hasta: finDeMes(rango.hasta) };

  useEffect(() => {
    if (!periodo.desde || !periodo.hasta || periodo.desde > periodo.hasta) return;
    let activo = true;
    setReporte(null);
    setError(null);
    getReporte(tipo, periodo)
      .then((r) => activo && setReporte(r))
      .catch((err) => activo && setError(err.response?.data?.message || "No se pudo calcular el reporte"));
    return () => { activo = false; };
  }, [tipo, periodo.desde, periodo.hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportar = async () => {
    setExportando(true);
    try {
      await exportarReporte(tipo, periodo);
    } catch {
      showToast("No se pudo generar el Excel");
    } finally {
      setExportando(false);
    }
  };

  // Recaudado vs por cobrar admite agrupar por trimestre; los demás, por fila.
  const filas = useMemo(() => {
    if (!reporte) return [];
    if (tipo === "recaudo" && agrupacion === "TRIMESTRE") {
      const sumables = reporte.columnas.filter((c) => c.total).map((c) => c.clave);
      return agruparTrimestres(reporte.filas, sumables);
    }
    return reporte.filas;
  }, [reporte, tipo, agrupacion]);

  const series = reporte?.grafico?.series || (reporte?.grafico?.valor ? [{ clave: reporte.grafico.valor, nombre: reporte.grafico.titulo }] : []);
  const datosGrafico = reporte ? filas.slice(0, reporte.grafico?.limite || filas.length) : [];
  const t = reporte?.totales;

  return (
    <div className={styles.container}>
      {ToastNode}
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Reportes</h2>
          <p className={styles.subtitle}>
            {reporte?.subtitulo || "Zaazmago"} · del {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)}
          </p>
        </div>
        <div className={styles.acciones}>
          <Button variant="secondary" icon={FileSpreadsheet} loading={exportando} disabled={!reporte} onClick={exportar}>Excel</Button>
        </div>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {REPORTES.map((r) => (
          <button key={r.id} type="button" style={chip(tipo === r.id)} onClick={() => setTipo(r.id)}>{r.nombre}</button>
        ))}
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
        {tipo === "recaudo" && (
          <>
            <span style={{ flex: 1 }} />
            <button type="button" style={chip(agrupacion === "MES")} onClick={() => setAgrupacion("MES")}>Por mes</button>
            <button type="button" style={chip(agrupacion === "TRIMESTRE")} onClick={() => setAgrupacion("TRIMESTRE")}>Por trimestre</button>
          </>
        )}
      </div>

      {error ? <p className={styles.error}>{error}</p> : !reporte ? (
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Calculando el reporte...</div>
      ) : (
        <>
          {t && (
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
                <p className={styles.kpiValor}>{`${num(t.porcentajeCobrado)} %`}</p>
                <p className={styles.kpiNota}>Cobrado de lo facturado en el periodo</p>
              </div>
            </div>
          )}

          {series.length > 0 && datosGrafico.length > 0 && (
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, background: "var(--color-surface)", padding: "1rem", marginBottom: "1.25rem" }}>
              <p className={styles.sub} style={{ margin: "0 0 0.5rem" }}>{reporte.grafico.titulo}</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={datosGrafico} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey={reporte.grafico.etiqueta === "mes" ? "mes" : reporte.grafico.etiqueta} tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => num(v)} />
                  <Tooltip formatter={(v) => soles(v)} />
                  {series.length > 1 && <Legend />}
                  {series.map((s) => (
                    <Bar key={s.clave} dataKey={s.clave} name={s.nombre} fill={s.color || "#FF6600"} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)", marginBottom: "1.25rem" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {reporte.columnas.map((c, i) => (
                    <th key={c.clave} style={{ ...celda, textAlign: i === 0 ? "left" : "right", fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{c.titulo}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filas.length === 0 && (
                  <tr><td colSpan={reporte.columnas.length} style={{ ...celda, color: "var(--color-text3)" }}>Sin movimientos en el periodo</td></tr>
                )}
                {filas.map((f, idx) => (
                  <tr key={f.clave || f.codigo || f.persona || idx}>
                    {reporte.columnas.map((c, i) => (
                      <td key={c.clave} style={{ ...celda, textAlign: i === 0 ? "left" : "right", fontWeight: i === 0 ? 600 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: c.formato === "texto" ? "normal" : "nowrap" }}>
                        {celdaTexto(f[c.clave], c.formato)}
                      </td>
                    ))}
                  </tr>
                ))}
                {reporte.columnas.some((c) => c.total) && filas.length > 0 && (
                  <tr style={{ background: "var(--color-surface2, var(--color-bg))" }}>
                    {reporte.columnas.map((c, i) => (
                      <td key={c.clave} style={{ ...celda, textAlign: i === 0 ? "left" : "right", fontWeight: 700 }}>
                        {i === 0 ? "Total" : c.total ? celdaTexto(reporte.filas.reduce((a, f) => a + (Number(f[c.clave]) || 0), 0), c.formato) : ""}
                      </td>
                    ))}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
