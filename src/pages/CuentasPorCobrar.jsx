import { useCallback, useEffect, useState } from "react";
import { FileUp, Mail, ScrollText, Upload, Wallet } from "lucide-react";
import { Badge, Button, Table } from "../components/ui";
import { enviarRecordatorioCobro, getCuentasPorCobrar } from "../api/cuentas";
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

// Cuentas por cobrar: saldos de facturas y boletas (del ERP y del portal SOL)
// por cliente y por documento, con antigüedad, estado de cuenta y recordatorios.
export default function CuentasPorCobrar() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("CLIENTES");
  const [buscar, setBuscar] = useState("");
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
      </>
    ) },
    { key: "estado", label: "Estado", render: (d) => <Badge tone={TONO_COBRO[d.diasVencido > 0 ? "VENCIDO" : d.cobro.estado]}>{d.diasVencido > 0 ? "VENCIDO" : d.cobro.estado}</Badge> },
    { key: "acciones", label: "", render: (d) => (
      <Button size="sm" variant="secondary" icon={Wallet} onClick={() => setPagosDe(d.id)}>Cobros</Button>
    ) },
  ];

  const clientes = datos.clientes.filter((c) => coincide(c.nombre, c.numDoc));
  const documentos = datos.documentos.filter((d) => coincide(d.clienteNombre, d.clienteNumDoc) || d.numero.toLowerCase().includes(q));

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
          {[["CLIENTES", "Por cliente"], ["DOCUMENTOS", "Por comprobante"]].map(([v, label]) => (
            <button key={v} type="button" className={`${styles.tab} ${vista === v ? styles.tabActivo : ""}`} onClick={() => setVista(v)}>{label}</button>
          ))}
          <input className={styles.buscar} placeholder="Buscar cliente, RUC o comprobante..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>

        {vista === "CLIENTES"
          ? <Table columns={columnasClientes} rows={clientes.map((c) => ({ ...c, id: `${c.numDoc}|${c.moneda}` }))} empty="No hay saldos por cobrar" />
          : <Table columns={columnasDocumentos} rows={documentos} empty="No hay comprobantes con saldo" />}
      </div>

      <PagosDrawer comprobanteId={pagosDe} onClose={() => setPagosDe(null)} onCambio={cargar} showToast={showToast} />
      <EstadoCuentaDrawer cliente={estadoDe} onClose={() => setEstadoDe(null)} onRecordatorio={cargar} showToast={showToast} />
      <ComprobanteExternoDrawer open={externo} onClose={() => setExterno(false)} onRegistrado={cargar} showToast={showToast} />
      <ImportarExternosDrawer open={importar} onClose={() => setImportar(false)} onImportado={cargar} showToast={showToast} />
    </>
  );
}
