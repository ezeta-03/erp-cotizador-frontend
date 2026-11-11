import { useEffect, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Badge, Button, Table } from "../components/ui";
import { descargarLibroMayor, getLibroMayor } from "../api/libroMayor";
import { monto, soles } from "../utils/formato";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import styles from "./cuentas.module.scss";

const GRUPOS = [
  ["CAJA_BANCOS", "Caja y Bancos", "blue"],
  ["INGRESOS", "Ingresos", "green"],
  ["COSTO_VENTA", "Costo de venta", "purple"],
  ["GASTO_OPERATIVO", "Gasto operativo", "orange"],
];
const esGasto = (c) => c.grupo === "COSTO_VENTA" || c.grupo === "GASTO_OPERATIVO";
const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const hoy = () => new Date().toLocaleDateString("en-CA");
const finDeMes = (mes) => {
  const [a, m] = mes.split("-").map(Number);
  const ultimo = new Date(a, m, 0).toLocaleDateString("en-CA");
  return ultimo > hoy() ? hoy() : ultimo;
};
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});

// Libro Mayor simple: saldos y movimientos del periodo por cuenta de Caja y
// Bancos, Ventas y cada categoría de gasto (devengado), con exportación.
export default function LibroMayor() {
  const [modo, setModo] = useState("MES");
  const [mes, setMes] = useState(hoy().slice(0, 7));
  const [rango, setRango] = useState({ desde: `${hoy().slice(0, 7)}-01`, hasta: hoy() });
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [abierta, setAbierta] = useState(null);
  const [descargando, setDescargando] = useState(null);
  // Filtro de conciliación (gastos): TODOS | NO (sin comprobante adjunto)
  const [conciliacion, setConciliacion] = useState("TODOS");
  const { show: showToast, ToastNode } = useToast();

  const periodo = modo === "MES" ? { desde: `${mes}-01`, hasta: finDeMes(mes) } : rango;

  useEffect(() => {
    if (!periodo.desde || !periodo.hasta || periodo.desde > periodo.hasta) return;
    setDatos(null);
    setError(null);
    getLibroMayor(periodo)
      .then((d) => {
        setDatos(d);
        setAbierta((a) => (d.cuentas.some((c) => c.clave === a) ? a : null));
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el libro mayor"));
  }, [periodo.desde, periodo.hasta]); // eslint-disable-line react-hooks/exhaustive-deps

  const descargar = async (formato) => {
    setDescargando(formato);
    try {
      await descargarLibroMayor(periodo, formato);
    } catch {
      showToast(`No se pudo generar el ${formato === "pdf" ? "PDF" : "Excel"}`);
    } finally {
      setDescargando(null);
    }
  };

  const cuentaAbierta = datos?.cuentas.find((c) => c.clave === abierta);
  const M = (c) => (v) => monto(v, c.moneda);

  const columnasResumen = [
    { key: "nombre", label: "Cuenta", render: (c) => (
      <>
        <strong>{c.nombre}</strong>
        <div className={styles.sub}>
          {c.movimientos.length} movimiento{c.movimientos.length !== 1 ? "s" : ""}{c.moneda === "USD" ? " · dólares" : ""}
          {c.sinConciliar ? <> · <span style={{ color: "var(--color-danger)" }}>{c.sinConciliar} sin conciliar</span></> : null}
        </div>
      </>
    ) },
    { key: "saldoAnterior", label: "Saldo anterior", align: "right", render: (c) => M(c)(c.saldoAnterior) },
    { key: "debe", label: "Debe", align: "right", render: (c) => (c.debe ? M(c)(c.debe) : <span className={styles.sub}>—</span>) },
    { key: "haber", label: "Haber", align: "right", render: (c) => (c.haber ? M(c)(c.haber) : <span className={styles.sub}>—</span>) },
    { key: "saldoFinal", label: "Saldo final", align: "right", render: (c) => <strong>{M(c)(c.saldoFinal)}</strong> },
    { key: "ver", label: "", render: (c) => (
      <Button size="sm" variant={abierta === c.clave ? "primary" : "ghost"} onClick={() => setAbierta(abierta === c.clave ? null : c.clave)}>
        {abierta === c.clave ? "Ocultar" : "Ver"}
      </Button>
    ) },
  ];

  const columnasDetalle = (c) => [
    { key: "fecha", label: "Fecha", render: (m) => fechaCorta(m.fecha) },
    { key: "documento", label: "Documento", render: (m) => <strong>{m.documento || "—"}</strong> },
    { key: "concepto", label: "Concepto", render: (m) => m.concepto || "—" },
    { key: "tercero", label: "Cliente / proveedor", render: (m) => m.tercero || "—" },
    { key: "debe", label: "Debe", align: "right", render: (m) => (m.debe ? M(c)(m.debe) : <span className={styles.sub}>—</span>) },
    { key: "haber", label: "Haber", align: "right", render: (m) => (m.haber ? M(c)(m.haber) : <span className={styles.sub}>—</span>) },
    { key: "saldo", label: "Saldo", align: "right", render: (m) => <strong>{M(c)(m.saldo)}</strong> },
    ...(esGasto(c) ? [{
      key: "conciliado", label: "Conciliado", render: (m) => (m.conciliado === true ? <Badge tone="green">Sí</Badge>
        : m.conciliado === false ? <Badge tone="red">No</Badge> : <span className={styles.sub}>—</span>),
    }] : []),
  ];
  // Con el filtro "sin conciliar", solo las cuentas de gasto con documentos sin adjunto y esos movimientos.
  const soloSinConciliar = conciliacion === "NO";
  const visibles = (datos?.cuentas || []).filter((c) => !soloSinConciliar || (esGasto(c) && c.sinConciliar));
  const movimientosDe = (c) => (soloSinConciliar ? c.movimientos.filter((m) => m.conciliado === false) : c.movimientos);

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Libro Mayor</h2>
            <p className={styles.subtitle}>
              Caja y Bancos, ventas y gastos por categoría (devengado) · del {fechaCorta(periodo.desde)} al {fechaCorta(periodo.hasta)}
            </p>
          </div>
          <div className={styles.acciones}>
            <Button variant="secondary" icon={FileSpreadsheet} loading={descargando === "xlsx"} disabled={!datos} onClick={() => descargar("xlsx")}>Excel</Button>
            <Button variant="secondary" icon={FileText} loading={descargando === "pdf"} disabled={!datos} onClick={() => descargar("pdf")}>PDF</Button>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center", marginBottom: "1rem" }}>
          <button type="button" style={chip(modo === "MES")} onClick={() => setModo("MES")}>Por mes</button>
          <button type="button" style={chip(modo === "RANGO")} onClick={() => setModo("RANGO")}>Rango de fechas</button>
          {modo === "MES" ? (
            <input type="month" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Mes"
              value={mes} max={hoy().slice(0, 7)} onChange={(e) => e.target.value && setMes(e.target.value)} />
          ) : (
            <>
              <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Desde" title="Desde"
                value={rango.desde} max={rango.hasta || hoy()} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
              <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} aria-label="Hasta" title="Hasta"
                value={rango.hasta} min={rango.desde || undefined} max={hoy()} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
              <span className={styles.sub}>Dentro de un mismo año</span>
            </>
          )}
          <select className={styles.buscar} style={{ marginLeft: "auto", minWidth: 0 }} aria-label="Conciliación de gastos"
            value={conciliacion} onChange={(e) => setConciliacion(e.target.value)}>
            <option value="TODOS">Todos los movimientos</option>
            <option value="NO">Gastos sin conciliar</option>
          </select>
        </div>

        {error ? <p className={styles.error}>{error}</p> : !datos ? (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Calculando el mayor...</div>
        ) : (
          <>
            <div className={styles.kpis}>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Ventas del periodo</p>
                <p className={styles.kpiValor}>{soles(datos.totales.INGRESOS.periodo)}</p>
                <p className={styles.kpiNota}>Base sin IGV, menos notas de crédito</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Costo de venta</p>
                <p className={styles.kpiValor}>{soles(datos.totales.COSTO_VENTA.periodo)}</p>
                <p className={styles.kpiNota}>Acumulado del año: {soles(datos.totales.COSTO_VENTA.saldoFinal)}</p>
              </div>
              <div className={styles.kpi}>
                <p className={styles.kpiLabel}>Gasto operativo</p>
                <p className={styles.kpiValor}>{soles(datos.totales.GASTO_OPERATIVO.periodo)}</p>
                <p className={styles.kpiNota}>Acumulado del año: {soles(datos.totales.GASTO_OPERATIVO.saldoFinal)}</p>
              </div>
              <div className={`${styles.kpi} ${datos.resultadoPeriodo < 0 ? styles.kpiAlerta : ""}`}>
                <p className={styles.kpiLabel}>Resultado del periodo</p>
                <p className={styles.kpiValor}>{soles(datos.resultadoPeriodo)}</p>
                <p className={styles.kpiNota}>Ventas − costo de venta − gasto operativo</p>
              </div>
            </div>

            {datos.conciliacion && (
              <p className={styles.sub} style={{ margin: "0 0 1rem" }}>
                Conciliación de gastos (documento con su comprobante adjunto): {datos.conciliacion.conciliados} conciliado{datos.conciliacion.conciliados !== 1 ? "s" : ""} ·{" "}
                <span style={{ color: datos.conciliacion.sinConciliar ? "var(--color-danger)" : undefined, fontWeight: datos.conciliacion.sinConciliar ? 600 : 400 }}>
                  {datos.conciliacion.sinConciliar} sin conciliar
                </span>
                {datos.conciliacion.sinConciliar > 0 && !soloSinConciliar && (
                  <> · <button type="button" style={{ all: "unset", cursor: "pointer", color: "var(--color-accent-text, var(--color-accent))", textDecoration: "underline" }}
                    onClick={() => setConciliacion("NO")}>ver solo esos</button></>
                )}
              </p>
            )}

            {GRUPOS.map(([grupo, etiqueta, tono]) => {
              const cuentas = visibles.filter((c) => c.grupo === grupo);
              if (!cuentas.length) return null;
              return (
                <div key={grupo} style={{ marginBottom: "1.25rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0 0 0.5rem" }}>
                    <Badge tone={tono}>{etiqueta}</Badge>
                    <span className={styles.sub}>
                      {grupo === "CAJA_BANCOS" ? "Saldo desde el saldo inicial de cada cuenta" : "En soles; saldo anterior = acumulado del año antes del periodo"}
                    </span>
                  </div>
                  <Table columns={columnasResumen} rowKey="clave" rows={cuentas} empty="Sin cuentas" />
                  {cuentas.some((c) => c.clave === abierta) && cuentaAbierta && (
                    <div style={{ margin: "0.75rem 0 0 1rem", borderLeft: "3px solid var(--color-accent)", paddingLeft: "0.75rem" }}>
                      <p style={{ margin: "0 0 0.5rem", fontSize: "var(--text-sm)" }}>
                        <strong>{cuentaAbierta.nombre}</strong> · saldo anterior {M(cuentaAbierta)(cuentaAbierta.saldoAnterior)} · saldo final {M(cuentaAbierta)(cuentaAbierta.saldoFinal)}
                      </p>
                      <Table columns={columnasDetalle(cuentaAbierta)} rowKey="clave"
                        rows={movimientosDe(cuentaAbierta).map((m, i) => ({ ...m, clave: i }))} empty="Sin movimientos en el periodo" />
                    </div>
                  )}
                </div>
              );
            })}
            {visibles.length === 0 && (
              <p className={styles.sub}>{soloSinConciliar ? "Todos los gastos del periodo tienen su comprobante adjunto." : "No hay movimientos en este periodo."}</p>
            )}

            {datos.porLinea?.length > 0 && !soloSinConciliar && (
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0 0 0.5rem" }}>
                  <Badge tone="gray">Gasto por línea de negocio</Badge>
                  <span className={styles.sub}>Gasto del periodo (base sin IGV) repartido según los % de cada proveedor</span>
                </div>
                <Table rowKey="clave" rows={datos.porLinea} empty="Sin gastos" columns={[
                  { key: "nombre", label: "Línea de negocio", render: (l) => <strong>{l.nombre}</strong> },
                  { key: "monto", label: "Monto", align: "right", render: (l) => soles(l.monto) },
                  { key: "porcentaje", label: "%", align: "right", render: (l) => `${l.porcentaje.toFixed(1)} %` },
                ]} />
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
