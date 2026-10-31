import { useCallback, useEffect, useState } from "react";
import { Ban, Pencil, Plus, Truck, Wallet } from "lucide-react";
import { Badge, Button, Drawer, Field, Table } from "../components/ui";
import {
  anularDocumentoPorPagar, getCuentasPorPagar, getDocumentosPorPagar, getOpcionesPorPagar, getProveedoresCompra, pagarCuotaPanel,
} from "../api/cuentas";
import { monto, soles } from "../utils/formato";
import { TONO_COBRO } from "../constants/estados";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import Antiguedad from "../coomponents/Antiguedad";
import { CATEGORIA_LABEL, TIPO_DOC_LABEL, TRAMOS } from "../constants/cuentas";
import ProveedorCompraDrawer from "../coomponents/ProveedorCompraDrawer";
import DocumentoPorPagarDrawer from "../coomponents/DocumentoPorPagarDrawer";
import PagosPorPagarDrawer from "../coomponents/PagosPorPagarDrawer";
import styles from "./cuentas.module.scss";

const fechaCorta = (iso) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "—");
const montos = (obj) => {
  const e = Object.entries(obj || {});
  return e.length ? e.map(([m, v]) => monto(v, m)).join(" · ") : soles(0);
};
const MEDIOS = [
  ["TRANSFERENCIA", "Transferencia"], ["DEPOSITO", "Depósito"], ["EFECTIVO", "Efectivo"],
  ["YAPE_PLIN", "Yape / Plin"], ["CHEQUE", "Cheque"], ["OTRO", "Otro"],
];
const hoy = () => new Date().toLocaleDateString("en-CA");

// Cuentas por pagar: facturas de proveedores de compras/servicios y cuotas de
// alquiler de paneles, con antigüedad, pagos y el maestro de proveedores.
export default function CuentasPorPagar() {
  const [datos, setDatos] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [filtroHistorial, setFiltroHistorial] = useState("");
  const [proveedores, setProveedores] = useState([]);
  const [opciones, setOpciones] = useState(null);
  const [error, setError] = useState(null);
  const [vista, setVista] = useState("PENDIENTES");
  const [buscar, setBuscar] = useState("");
  const [documento, setDocumento] = useState(null); // null cerrado, {} nuevo, objeto = editar
  const [proveedor, setProveedor] = useState(null);
  const [pagosDe, setPagosDe] = useState(null);
  const [cuotaPanel, setCuotaPanel] = useState(null);
  const [pagoCuota, setPagoCuota] = useState({ fecha: hoy(), medio: "TRANSFERENCIA", numeroOperacion: "" });
  const [ocupado, setOcupado] = useState(false);
  const { show: showToast, ToastNode } = useToast();

  const cargar = useCallback(() => {
    getCuentasPorPagar()
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las cuentas por pagar"));
  }, []);
  const cargarHistorial = useCallback(() => {
    getDocumentosPorPagar(filtroHistorial ? { estado: filtroHistorial } : {}).then(setHistorial).catch(() => {});
  }, [filtroHistorial]);
  const cargarProveedores = useCallback(() => {
    getProveedoresCompra({ todos: 1 }).then(setProveedores).catch(() => {});
  }, []);

  useEffect(() => {
    cargar();
    cargarProveedores();
    getOpcionesPorPagar().then(setOpciones).catch(() => {});
  }, [cargar, cargarProveedores]);
  useEffect(() => { if (vista === "HISTORIAL") cargarHistorial(); }, [vista, cargarHistorial]);

  const refrescar = () => {
    cargar();
    if (vista === "HISTORIAL") cargarHistorial();
  };

  const anular = async (c) => {
    if (!confirm(`¿Anular ${c.documento} de ${c.proveedor.razonSocial}? Ya no figurará como deuda.`)) return;
    try {
      await anularDocumentoPorPagar(c.id);
      showToast(`${c.documento} anulado`, "success");
      refrescar();
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo anular");
    }
  };

  const confirmarPagoCuota = async () => {
    setOcupado(true);
    try {
      await pagarCuotaPanel(cuotaPanel.id, pagoCuota);
      showToast(`${cuotaPanel.documento} de ${cuotaPanel.proveedorNombre} pagada`, "success");
      setCuotaPanel(null);
      cargar();
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo registrar el pago");
    } finally {
      setOcupado(false);
    }
  };

  // Para editar desde la cartera hace falta el documento completo.
  const editarDesdeCartera = async (fila) => {
    const lista = historial.length ? historial : await getDocumentosPorPagar();
    const c = lista.find((x) => x.id === fila.id);
    if (c) setDocumento(c);
  };

  if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;
  if (!datos) return (
    <div className={styles.container} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <Spinner size={18} /> Cargando cuentas por pagar...
    </div>
  );

  const q = buscar.trim().toLowerCase();
  const coincide = (...textos) => !q || textos.some((t) => t && String(t).toLowerCase().includes(q));
  const saldoTotal = Object.fromEntries(Object.entries(datos.totales).map(([m, t]) => [m, t.saldo]));
  const proveedoresActivos = proveedores.filter((p) => p.activo);

  const columnasPendientes = [
    { key: "proveedor", label: "Proveedor", render: (f) => (
      <>
        <strong>{f.proveedorNombre}</strong>
        <div className={styles.sub}>{f.origen === "PANEL" ? "Arrendador de panel" : f.proveedorDoc}</div>
      </>
    ) },
    { key: "documento", label: "Documento", render: (f) => (
      <>
        {f.origen === "PANEL" ? <Badge tone="blue">Alquiler</Badge> : TIPO_DOC_LABEL[f.tipoDocumento]} {f.documento}
        {f.descripcion && <div className={styles.sub}>{f.descripcion}</div>}
        {f.proyecto && <div className={styles.sub}>Proyecto: {f.proyecto.nombre}</div>}
      </>
    ) },
    { key: "vencimiento", label: "Vence", render: (f) => (
      <>
        {fechaCorta(f.vencimiento)}
        {f.diasVencido > 0 && <div className={styles.vencido}>{f.diasVencido} día{f.diasVencido !== 1 ? "s" : ""} de atraso</div>}
      </>
    ) },
    { key: "total", label: "Total", align: "right", render: (f) => monto(f.total, f.moneda) },
    { key: "saldo", label: "Saldo", align: "right", render: (f) => (
      <>
        <strong>{monto(f.saldo, f.moneda)}</strong>
        {f.saldoDetraccion > 0 && <div className={styles.sub}>+ detracción {soles(f.saldoDetraccion)}</div>}
      </>
    ) },
    { key: "estado", label: "Estado", render: (f) => <Badge tone={TONO_COBRO[f.estado]}>{f.estado}</Badge> },
    { key: "acciones", label: "", render: (f) => (
      <div className={styles.filaAcciones}>
        {f.origen === "PANEL" ? (
          <Button size="sm" variant="secondary" icon={Wallet} onClick={() => { setPagoCuota({ fecha: hoy(), medio: "TRANSFERENCIA", numeroOperacion: "" }); setCuotaPanel(f); }}>
            Pagar
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" icon={Wallet} onClick={() => setPagosDe(f.id)}>Pagos</Button>
            <Button size="sm" variant="ghost" icon={Pencil} aria-label="Editar" onClick={() => editarDesdeCartera(f)} />
          </>
        )}
      </div>
    ) },
  ];

  const columnasProveedores = [
    { key: "nombre", label: "Proveedor", render: (p) => (
      <>
        <strong>{p.nombre}</strong>
        <div className={styles.sub}>{p.doc || "Arrendador de panel"}</div>
      </>
    ) },
    { key: "documentos", label: "Docs.", align: "right" },
    ...TRAMOS.map(([k, label]) => ({
      key: k, label, align: "right",
      render: (p) => (p.tramos[k] ? monto(p.tramos[k], p.moneda) : <span className={styles.sub}>—</span>),
    })),
    { key: "saldo", label: "Saldo", align: "right", render: (p) => <strong>{monto(p.saldo, p.moneda)}</strong> },
  ];

  const columnasHistorial = [
    { key: "fecha", label: "Emisión", render: (c) => fechaCorta(c.fechaEmision) },
    { key: "proveedor", label: "Proveedor", render: (c) => c.proveedor.razonSocial },
    { key: "documento", label: "Documento", render: (c) => (
      <>
        {TIPO_DOC_LABEL[c.tipoDocumento]} {c.documento}
        <div className={styles.sub}>{CATEGORIA_LABEL[c.categoria]}{c.proyecto ? ` · ${c.proyecto.nombre}` : ""}</div>
      </>
    ) },
    { key: "total", label: "Total", align: "right", render: (c) => monto(c.total, c.moneda) },
    { key: "saldo", label: "Saldo", align: "right", render: (c) => monto(c.pago.saldo, c.moneda) },
    { key: "estado", label: "Estado", render: (c) => <Badge tone={TONO_COBRO[c.pago.estado]}>{c.pago.estado}</Badge> },
    { key: "acciones", label: "", render: (c) => (
      <div className={styles.filaAcciones}>
        {c.pago.estado !== "ANULADO" && <Button size="sm" variant="secondary" icon={Wallet} onClick={() => setPagosDe(c.id)}>Pagos</Button>}
        {c.pago.estado !== "ANULADO" && <Button size="sm" variant="ghost" icon={Pencil} aria-label="Editar" onClick={() => setDocumento(c)} />}
        {c.pago.estado !== "ANULADO" && c.pagos.length === 0 && <Button size="sm" variant="ghost" icon={Ban} onClick={() => anular(c)}>Anular</Button>}
      </div>
    ) },
  ];

  const columnasMaestro = [
    { key: "razonSocial", label: "Proveedor", render: (p) => (
      <>
        <strong>{p.razonSocial}</strong>
        <div className={styles.sub}>RUC {p.ruc}{p.nombreComercial ? ` · ${p.nombreComercial}` : ""}</div>
      </>
    ) },
    { key: "contacto", label: "Contacto", render: (p) => [p.contacto, p.telefono, p.email].filter(Boolean).join(" · ") || "—" },
    { key: "cuenta", label: "Cuenta", render: (p) => [p.banco, p.numeroCuenta].filter(Boolean).join(" ") || "—" },
    { key: "condicion", label: "Condición", render: (p) => (p.condicionPago === "CREDITO" ? `Crédito ${p.diasCredito} días` : "Contado") },
    { key: "activo", label: "Estado", render: (p) => <Badge tone={p.activo ? "green" : "gray"}>{p.activo ? "Activo" : "Inactivo"}</Badge> },
    { key: "acciones", label: "", render: (p) => (
      <div className={styles.filaAcciones}>
        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => setProveedor(p)}>Editar</Button>
        <Button size="sm" variant="ghost" icon={Plus} onClick={() => setDocumento({ proveedorId: p.id })}>Documento</Button>
      </div>
    ) },
  ];

  const VISTAS = [["PENDIENTES", "Pendientes"], ["PROVEEDORES_SALDO", "Por proveedor"], ["HISTORIAL", "Documentos"], ["MAESTRO", "Proveedores"]];

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Cuentas por pagar</h2>
            <p className={styles.subtitle}>
              {datos.documentos.length} deuda{datos.documentos.length !== 1 ? "s" : ""} pendiente{datos.documentos.length !== 1 ? "s" : ""} ·
              cuotas de paneles que vencen en los próximos {datos.horizonteCuotasPanel} días
            </p>
          </div>
          <div className={styles.acciones}>
            <Button variant="secondary" icon={Truck} onClick={() => setProveedor({})}>Nuevo proveedor</Button>
            <Button icon={Plus} onClick={() => setDocumento({})}>Registrar documento</Button>
          </div>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Por pagar</p>
            <p className={styles.kpiValor}>{montos(saldoTotal)}</p>
            <p className={styles.kpiNota}>Neto de detracciones y retenciones</p>
          </div>
          <div className={`${styles.kpi} ${datos.alertas.vencidos.cantidad ? styles.kpiAlerta : ""}`}>
            <p className={styles.kpiLabel}>Vencido</p>
            <p className={styles.kpiValor}>{montos(datos.alertas.vencidos.montos)}</p>
            <p className={styles.kpiNota}>{datos.alertas.vencidos.cantidad} pendiente{datos.alertas.vencidos.cantidad !== 1 ? "s" : ""}</p>
          </div>
          <div className={`${styles.kpi} ${datos.alertas.porVencer.cantidad ? styles.kpiAviso : ""}`}>
            <p className={styles.kpiLabel}>Vence en 7 días</p>
            <p className={styles.kpiValor}>{montos(datos.alertas.porVencer.montos)}</p>
            <p className={styles.kpiNota}>{datos.alertas.porVencer.cantidad} pendiente{datos.alertas.porVencer.cantidad !== 1 ? "s" : ""}</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Detracciones por depositar</p>
            <p className={styles.kpiValor}>{soles(datos.detraccionPorPagar)}</p>
            <p className={styles.kpiNota}>En las cuentas BN de los proveedores</p>
          </div>
        </div>

        <Antiguedad titulo="Antigüedad de lo que debemos" totales={datos.totales} />

        <div className={styles.tabs}>
          {VISTAS.map(([v, label]) => (
            <button key={v} type="button" className={`${styles.tab} ${vista === v ? styles.tabActivo : ""}`} onClick={() => setVista(v)}>{label}</button>
          ))}
          {vista === "HISTORIAL" && (
            <select className={styles.buscar} style={{ marginLeft: 0, minWidth: 140 }} value={filtroHistorial} onChange={(e) => setFiltroHistorial(e.target.value)}>
              <option value="">Todos</option>
              <option value="ABIERTOS">Por pagar</option>
              <option value="PAGADOS">Pagados</option>
              <option value="ANULADOS">Anulados</option>
            </select>
          )}
          <input className={styles.buscar} placeholder="Buscar proveedor, RUC o documento..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        </div>

        {vista === "PENDIENTES" && (
          <Table columns={columnasPendientes} rowKey="clave"
            rows={datos.documentos.filter((f) => coincide(f.proveedorNombre, f.proveedorDoc, f.documento, f.descripcion)).map((f) => ({ ...f, clave: `${f.origen}-${f.id}` }))}
            empty="No hay deudas pendientes" />
        )}
        {vista === "PROVEEDORES_SALDO" && (
          <Table columns={columnasProveedores}
            rows={datos.proveedores.filter((p) => coincide(p.nombre, p.doc)).map((p) => ({ ...p, id: `${p.clave}|${p.moneda}` }))}
            empty="No hay saldos por pagar" />
        )}
        {vista === "HISTORIAL" && (
          <Table columns={columnasHistorial}
            rows={historial.filter((c) => coincide(c.proveedor.razonSocial, c.proveedor.ruc, c.documento, c.descripcion))}
            empty="No hay documentos registrados" />
        )}
        {vista === "MAESTRO" && (
          <Table columns={columnasMaestro}
            rows={proveedores.filter((p) => coincide(p.razonSocial, p.ruc, p.nombreComercial))}
            empty="Aún no hay proveedores de compras" />
        )}
      </div>

      <ProveedorCompraDrawer proveedor={proveedor} onClose={() => setProveedor(null)} onGuardado={cargarProveedores} showToast={showToast} />
      <DocumentoPorPagarDrawer
        documento={documento}
        proveedores={proveedoresActivos}
        opciones={opciones}
        onClose={() => setDocumento(null)}
        onGuardado={refrescar}
        onNuevoProveedor={() => setProveedor({})}
        showToast={showToast}
      />
      <PagosPorPagarDrawer documentoId={pagosDe} onClose={() => setPagosDe(null)} onCambio={refrescar} showToast={showToast} />
      <Drawer
        open={!!cuotaPanel}
        onClose={() => setCuotaPanel(null)}
        eyebrow="Alquiler de panel"
        title={cuotaPanel ? `${cuotaPanel.documento} — ${cuotaPanel.proveedorNombre}` : ""}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCuotaPanel(null)}>Cancelar</Button>
            <Button loading={ocupado} onClick={confirmarPagoCuota}>Registrar pago</Button>
          </>
        }
      >
        {cuotaPanel && (
          <div style={{ display: "grid", gap: "0.8rem" }}>
            <div style={{ fontSize: "var(--text-sm)" }}>
              {cuotaPanel.descripcion}<br />
              Monto: <strong>{monto(cuotaPanel.total, "PEN")}</strong> (con IGV) · vence {fechaCorta(cuotaPanel.vencimiento)}
              {cuotaPanel.cuenta && <div className={styles.sub}>Cuenta: {cuotaPanel.cuenta}</div>}
            </div>
            <Field label="Fecha de pago" type="date" max={hoy()} value={pagoCuota.fecha} onChange={(e) => setPagoCuota({ ...pagoCuota, fecha: e.target.value })} />
            <Field as="select" label="Medio" value={pagoCuota.medio} onChange={(e) => setPagoCuota({ ...pagoCuota, medio: e.target.value })}>
              {MEDIOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Field>
            <Field label="N.° de operación" value={pagoCuota.numeroOperacion} onChange={(e) => setPagoCuota({ ...pagoCuota, numeroOperacion: e.target.value })} />
            <p className={styles.sub} style={{ margin: 0 }}>La cuota queda cancelada también en Outdoor → Proveedores.</p>
          </div>
        )}
      </Drawer>
    </>
  );
}
