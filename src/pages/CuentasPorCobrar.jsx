import { useCallback, useEffect, useState } from "react";
import { FileText, FileUp, Mail, ScrollText, Upload, Wallet } from "lucide-react";
import { Badge, Button, Table } from "../components/ui";
import { enviarRecordatorioCobro, getCuentasPorCobrar, getHistorialCobros } from "../api/cuentas";
import { monto, soles } from "../utils/formato";
import { TONO_COBRO } from "../constants/estados";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import Antiguedad from "../coomponents/Antiguedad";
import { TRAMOS } from "../constants/cuentas";
import PagosDrawer from "../coomponents/PagosDrawer";
import EstadoCuentaDrawer from "../coomponents/EstadoCuentaDrawer";
import ComprobanteExternoDrawer from "../coomponents/ComprobanteExternoDrawer";
import ImportarExternosDrawer from "../coomponents/ImportarExternosDrawer";
import styles from "./cuentas.module.scss";

const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const montos = (obj) => {
  const e = Object.entries(obj || {});
  return e.length ? e.map(([m, v]) => monto(v, m)).join(" · ") : soles(0);
};

const VISTAS = [["CLIENTES", "Por cliente"], ["DOCUMENTOS", "Por comprobante"], ["HISTORIAL", "Historial"]];
const sumarDias = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA");
};
// Filtros de la vista "Por comprobante" (documentos con saldo).
const FILTROS_PENDIENTES = [
  ["TODOS", "Todos", () => true],
  ["VENCIDOS", "Vencidos", (d) => d.diasVencido > 0],
  ["SEMANA", "Vencen en 7 días", (d) => d.diasVencido === 0 && !!d.vencimiento && d.vencimiento <= sumarDias(7)],
  ["DETRACCION", "Detracción pendiente", (d) => !!d.detraccion],
];
const FILTROS_HISTORIAL = [
  ["", "Todos"], ["POR_COBRAR", "Por cobrar"], ["PAGADO", "Pagados"], ["VENCIDO", "Vencidos"],
  ["DETRACCION", "Detracción pendiente"], ["ANULADO", "Anulados"],
];
const estadoVisible = (d) => (d.diasVencido > 0 ? "VENCIDO" : d.cobro.estado);
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});

// Cuentas por cobrar: saldos de facturas y boletas (del ERP y del portal SOL)
// por cliente y por documento, con antigüedad, estado de cuenta y recordatorios.
export default function CuentasPorCobrar() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("CLIENTES");
  const [buscar, setBuscar] = useState("");
  const [filtro, setFiltro] = useState("TODOS");
  const [historial, setHistorial] = useState(null);
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagosDe, setPagosDe] = useState(null);
  const [estadoDe, setEstadoDe] = useState(null);
  const [externo, setExterno] = useState(false);
  const [importar, setImportar] = useState(false);
  const [enviando, setEnviando] = useState(null);
  const { show: showToast, ToastNode } = useToast();

  const cargar = useCallback(() => {
    getCuentasPorCobrar()
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las cuentas por cobrar"));
  }, []);
  useEffect(() => { cargar(); }, [cargar]);

  const cargarHistorial = useCallback(() => {
    if (vista !== "HISTORIAL") return;
    setHistorial(null);
    getHistorialCobros({ estado: filtroHistorial || undefined, desde: desde || undefined, hasta: hasta || undefined })
      .then(setHistorial)
      .catch(() => setHistorial([]));
  }, [vista, filtroHistorial, desde, hasta]);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const alCambiarPagos = () => {
    cargar();
    cargarHistorial();
  };

  const recordatorio = async (c) => {
    const para = prompt(
      `Enviar recordatorio de pago a ${c.nombre}:\n(varios correos separados por coma; vacío = el correo registrado del cliente)`,
      c.email || ""
    );
    if (para === null) return;
    setEnviando(c.numDoc);
    try {
      const r = await enviarRecordatorioCobro(c.numDoc, para.trim());
      showToast(`Recordatorio enviado a ${r.enviadoA}`, "success");
      cargar();
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo enviar el recordatorio");
    } finally {
      setEnviando(null);
    }
  };

  if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  if (!datos) return (
    <div className={styles.container} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Spinner size={18} /> Cargando cuentas por cobrar...
    </div>
  );

  const q = buscar.trim().toLowerCase();
  const coincide = (nombre, doc) => !q || nombre?.toLowerCase().includes(q) || doc?.includes(q);
  const saldoTotal = Object.fromEntries(Object.entries(datos.totales).map(([m, t]) => [m, t.saldo]));

  const columnasClientes = [
    { key: "nombre", label: "Cliente", render: (c) => (
      <>
        <strong>{c.nombre}</strong>
        <div className={styles.sub}>{c.numDoc}{c.email ? ` · ${c.email}` : ""}</div>
      </>
    ) },
    { key: "documentos", label: "Docs.", align: "right" },
    ...TRAMOS.map(([k, label]) => ({
      key: k, label, align: "right",
      render: (c) => (c.tramos[k] ? monto(c.tramos[k], c.moneda) : <span className={styles.sub}>—</span>),
    })),
    { key: "saldo", label: "Saldo", align: "right", render: (c) => <strong>{monto(c.saldo, c.moneda)}</strong> },
    { key: "recordatorio", label: "Recordatorio", render: (c) => (
      <span className={styles.sub}>{c.ultimoRecordatorio ? new Date(c.ultimoRecordatorio).toLocaleDateString("es-PE") : "—"}</span>
    ) },
    { key: "acciones", label: "", render: (c) => (
      <div className={styles.filaAcciones}>
        <Button size="sm" icon={Wallet} onClick={() => { setVista("DOCUMENTOS"); setFiltro("TODOS"); setBuscar(c.numDoc); }}>Cobrar</Button>
        <Button size="sm" variant="secondary" icon={ScrollText} onClick={() => setEstadoDe(c)}>Estado de cuenta</Button>
        <Button size="sm" variant="ghost" icon={Mail} loading={enviando === c.numDoc} onClick={() => recordatorio(c)}>Recordar</Button>
      </div>
    ) },
  ];

  const columnasDocumentos = [
    { key: "numero", label: "Comprobante", render: (d) => (
      <>
        <strong>{d.numero}</strong>
        {d.origen === "EXTERNO" && <div><Badge tone="purple">Portal SOL</Badge></div>}
      </>
    ) },
    { key: "cliente", label: "Cliente", render: (d) => (
      <>
        {d.clienteNombre}
        <div className={styles.sub}>{d.clienteNumDoc}</div>
      </>
    ) },
    { key: "fechaEmision", label: "Emisión", render: (d) => fechaCorta(d.fechaEmision) },
    { key: "vencimiento", label: "Vence", render: (d) => (
      <>
        {fechaCorta(d.vencimiento)}
        <div className={styles.sub}>{d.formaPago === "CREDITO" ? "Crédito" : "Contado"}</div>
        {d.diasVencido > 0 && <div className={styles.vencido}>{d.diasVencido} día{d.diasVencido !== 1 ? "s" : ""} de atraso</div>}
      </>
    ) },
    { key: "total", label: "Total", align: "right", render: (d) => monto(d.total, d.moneda) },
    { key: "saldo", label: "Saldo", align: "right", render: (d) => (
      <>
        <strong>{monto(d.cobro.saldo, d.moneda)}</strong>
        {d.cobro.saldoDetraccion > 0 && <div className={styles.sub}>+ detracción {soles(d.cobro.saldoDetraccion)}</div>}
        {d.detraccion && (
          <div className={d.detraccion.dias < 0 ? styles.vencido : styles.sub}>
            {d.detraccion.dias < 0 ? "detracción vencida" : "detracción vence"} {fechaCorta(d.detraccion.plazo)}
          </div>
        )}
      </>
    ) },
    { key: "estado", label: "Estado", render: (d) => <Badge tone={TONO_COBRO[estadoVisible(d)]}>{estadoVisible(d)}</Badge> },
    { key: "acciones", label: "", render: (d) => (
      <Button size="sm" icon={Wallet} onClick={() => setPagosDe(d.id)}>Cobrar</Button>
    ) },
  ];

  const columnasHistorial = [
    ...columnasDocumentos.slice(0, 3),
    { key: "total", label: "Total", align: "right", render: (d) => monto(d.total, d.moneda) },
    { key: "cobrado", label: "Cobrado", align: "right", render: (d) => (
      <>
        {monto(d.cobro.cobrado, d.moneda)}
        {d.ultimoCobro && <div className={styles.sub}>último {fechaCorta(d.ultimoCobro)}</div>}
      </>
    ) },
    { key: "saldo", label: "Saldo", align: "right", render: (d) => (
      <>
        {d.cobro.saldo > 0 ? <strong>{monto(d.cobro.saldo, d.moneda)}</strong> : <span className={styles.sub}>—</span>}
        {d.cobro.saldoDetraccion > 0 && <div className={styles.sub}>+ detracción {soles(d.cobro.saldoDetraccion)}</div>}
      </>
    ) },
    { key: "estado", label: "Estado", render: (d) => <Badge tone={TONO_COBRO[estadoVisible(d)]}>{estadoVisible(d)}</Badge> },
    { key: "acciones", label: "", render: (d) => (d.abierto
      ? <Button size="sm" icon={Wallet} onClick={() => setPagosDe(d.id)}>Cobrar</Button>
      : <Button size="sm" variant="ghost" icon={FileText} onClick={() => setPagosDe(d.id)}>Ver cobros</Button>
    ) },
  ];

  const clientes = datos.clientes.filter((c) => coincide(c.nombre, c.numDoc));
  const porClienteONumero = (d) => coincide(d.clienteNombre, d.clienteNumDoc) || d.numero.toLowerCase().includes(q);
  const filtrar = FILTROS_PENDIENTES.find(([k]) => k === filtro)[2];
  const documentos = datos.documentos.filter((d) => porClienteONumero(d) && filtrar(d));
  const filasHistorial = (historial || []).filter(porClienteONumero);

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Cuentas por cobrar</h2>
            <p className={styles.subtitle}>
              {datos.documentos.length} comprobante{datos.documentos.length !== 1 ? "s" : ""} con saldo · {datos.clientes.length} cliente{datos.clientes.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className={styles.acciones}>
            <Button variant="secondary" icon={Upload} onClick={() => setImportar(true)}>Importar Excel SOL</Button>
            <Button icon={FileUp} onClick={() => setExterno(true)}>Registrar comprobante SOL</Button>
          </div>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Por cobrar</p>
            <p className={styles.kpiValor}>{montos(saldoTotal)}</p>
            <p className={styles.kpiNota}>Neto de detracciones</p>
          </div>
          <div className={`${styles.kpi} ${datos.alertas.vencidos.cantidad ? styles.kpiAlerta : ""}`}>
            <p className={styles.kpiLabel}>Vencido</p>
            <p className={styles.kpiValor}>{montos(datos.alertas.vencidos.montos)}</p>
            <p className={styles.kpiNota}>{datos.alertas.vencidos.cantidad} comprobante{datos.alertas.vencidos.cantidad !== 1 ? "s" : ""}</p>
          </div>
          <div className={`${styles.kpi} ${datos.alertas.porVencer.cantidad ? styles.kpiAviso : ""}`}>
            <p className={styles.kpiLabel}>Vence en 7 días</p>
            <p className={styles.kpiValor}>{montos(datos.alertas.porVencer.montos)}</p>
            <p className={styles.kpiNota}>{datos.alertas.porVencer.cantidad} comprobante{datos.alertas.porVencer.cantidad !== 1 ? "s" : ""}</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Detracciones por recibir</p>
            <p className={styles.kpiValor}>{soles(datos.detraccionPorCobrar)}</p>
            <p className={styles.kpiNota}>Depósitos en el Banco de la Nación</p>
          </div>
        </div>

        <Antiguedad titulo="Antigüedad de la deuda" totales={datos.totales} />

        <div className={styles.tabs}>
          {VISTAS.map(([v, label]) => (
            <button key={v} type="button" className={`${styles.tab} ${vista === v ? styles.tabActivo : ""}`} onClick={() => setVista(v)}>{label}</button>
          ))}
          {vista === "HISTORIAL" && (
            <>
              <select className={styles.buscar} style={{ marginLeft: 0, minWidth: 140 }} value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)}>
                {FILTROS_HISTORIAL.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
              <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} title="Emitidos desde" aria-label="Emitidos desde"
                value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} />
              <input type="date" className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} title="Emitidos hasta" aria-label="Emitidos hasta"
                value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} />
            </>
          )}
          <input className={styles.buscar} placeholder="Buscar cliente, RUC o comprobante..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>

        {vista === "DOCUMENTOS" && (
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
            {FILTROS_PENDIENTES.map(([k, label]) => (
              <button key={k} type="button" style={chip(filtro === k)} onClick={() => setFiltro(k)}>{label}</button>
            ))}
          </div>
        )}

        {vista === "CLIENTES" && (
          <Table columns={columnasClientes} rows={clientes.map((c) => ({ ...c, id: `${c.numDoc}|${c.moneda}` }))} empty="No hay saldos por cobrar" />
        )}
        {vista === "DOCUMENTOS" && <Table columns={columnasDocumentos} rows={documentos} empty="No hay comprobantes para este filtro" />}
        {vista === "HISTORIAL" && (historial === null
          ? <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={16} /> Cargando historial...</div>
          : <Table columns={columnasHistorial} rows={filasHistorial} empty="No hay comprobantes para este filtro" />)}
      </div>

      <PagosDrawer comprobanteId={pagosDe} onClose={() => setPagosDe(null)} onCambio={alCambiarPagos} showToast={showToast} />
      <EstadoCuentaDrawer cliente={estadoDe} onClose={() => setEstadoDe(null)} onRecordatorio={cargar} showToast={showToast} />
      <ComprobanteExternoDrawer open={externo} onClose={() => setExterno(false)} onRegistrado={cargar} showToast={showToast} />
      <ImportarExternosDrawer open={importar} onClose={() => setImportar(false)} onImportado={cargar} showToast={showToast} />
    </>
  );
}
