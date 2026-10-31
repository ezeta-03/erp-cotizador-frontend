import { useState } from "react";
import { FileCode, FileCheck, FileText, FilePlus2, FileUp, Mail, Plus, RotateCcw, ShieldCheck, Trash2, Undo2, Wallet } from "lucide-react";
import { Badge, Button, Table } from "../components/ui";
import {
  enviarComprobantePorCorreo, reenviarComprobante, descargarArchivoComprobante, verificarComprobanteSunat,
  eliminarComprobanteExterno,
} from "../api/comprobantes";
import { monto, soles } from "../utils/formato";
import NotaDrawer from "./NotaDrawer";
import NuevaFacturaDrawer from "./NuevaFacturaDrawer";
import PagosDrawer from "./PagosDrawer";
import ComprobanteExternoDrawer from "./ComprobanteExternoDrawer";
import { TONO_COBRO } from "../constants/estados";

const TONO_VALIDEZ = { ACEPTADO: "green", "NO EXISTE": "orange", ANULADO: "red" };

const TIPO_LABEL = { FACTURA: "Factura", BOLETA: "Boleta", NOTA_CREDITO: "Nota de crédito", NOTA_DEBITO: "Nota de débito" };
const TONO_ESTADO = { ACEPTADO: "green", RECHAZADO: "red", ERROR: "orange", PENDIENTE: "yellow" };

// Filtros por estado de cobro (cuentas por cobrar).
const FILTROS_COBRO = [
  ["TODOS", "Todos", () => true],
  ["POR_COBRAR", "Por cobrar", (c) => ["PENDIENTE", "PARCIAL", "VENCIDO"].includes(c.cobro?.estado)],
  ["VENCIDOS", "Vencidos", (c) => c.cobro?.estado === "VENCIDO"],
  ["PAGADOS", "Pagados", (c) => c.cobro?.estado === "PAGADO"],
];
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});
const fechaCorta = (iso) => iso.split("-").reverse().join("/");

const mensajeError = (err, porDefecto) => err.response?.data?.message || porDefecto;

// Comprobantes electrónicos emitidos (facturas, boletas y notas de crédito/débito).
// "comprobantes" y "onActualizado" vienen del padre, que también los usa para
// saber qué cotizaciones ya tienen comprobante.
export default function Comprobantes({ comprobantes, onActualizado, showToast }) {
  const [ocupado, setOcupado] = useState(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);
  const [pagosDe, setPagosDe] = useState(null); // id del comprobante con el panel de cobros abierto
  const [filtroCobro, setFiltroCobro] = useState("TODOS");
  const [nota, setNota] = useState(null); // { comprobanteId, tipo } con el formulario de nota abierto
  const [externoAbierto, setExternoAbierto] = useState(false);

  const filtrar = FILTROS_COBRO.find(([k]) => k === filtroCobro)[2];
  const visibles = comprobantes.filter(filtrar);
  // Saldo por cobrar separado por moneda (no se suman soles con dólares).
  const porCobrar = {};
  for (const c of comprobantes) {
    if (!["PENDIENTE", "PARCIAL", "VENCIDO"].includes(c.cobro?.estado)) continue;
    porCobrar[c.moneda] = (porCobrar[c.moneda] || 0) + c.cobro.saldo;
  }

  const avisarResultado = (c) => {
    if (c.estado === "ACEPTADO") showToast(`${c.numero} aceptado por SUNAT`, "success");
    else showToast(`${c.numero}: ${c.estado}. ${c.sunatMensaje || ""}`);
  };

  const ejecutar = async (id, accion) => {
    setOcupado(id);
    try {
      const c = await accion();
      if (c) avisarResultado(c);
      await onActualizado();
    } catch (err) {
      console.error("❌ Error en comprobante:", err);
      showToast(mensajeError(err, "No se pudo completar la operación"));
    } finally {
      setOcupado(null);
    }
  };

  const enviarCorreo = (c) => {
    const para = prompt(
      `Enviar ${c.numero} (PDF, XML y CDR) a:\n(varios correos separados por coma; vacío = el correo registrado del cliente)`,
      c.correoEnviadoA || ""
    );
    if (para === null) return;
    ejecutar(c.id, async () => {
      const r = await enviarComprobantePorCorreo(c.id, para.trim());
      showToast(`${c.numero} enviado a ${r.correoEnviadoA}`, "success");
    });
  };

  const verificar = (c) =>
    ejecutar(c.id, async () => {
      const r = await verificarComprobanteSunat(c.id);
      const v = r.validacionSunat;
      showToast(`${c.numero} en SUNAT: ${v.estadoComprobante}${v.observaciones?.length ? ` — ${v.observaciones.join("; ")}` : ""}`,
        v.estadoComprobante === "ACEPTADO" ? "success" : "info");
    });

  const descargar = (c, archivo) =>
    descargarArchivoComprobante(c, archivo).catch((err) => {
      console.error("❌ Error descargando:", err);
      showToast("No se pudo descargar el archivo");
    });

  const columns = [
    { key: "numero", label: "Número", render: (c) => (
      <>
        <strong>{c.numero}</strong>
        {c.origen === "EXTERNO" && <div><Badge tone="purple">Portal SOL</Badge></div>}
      </>
    ) },
    { key: "tipo", label: "Tipo", render: (c) => TIPO_LABEL[c.tipo] },
    { key: "fecha", label: "Fecha", render: (c) => new Date(c.fechaEmision).toLocaleString("es-PE") },
    { key: "cliente", label: "Cliente", render: (c) => (
      <>
        {c.clienteNombre}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
          {c.clienteTipoDoc === "6" ? "RUC" : c.clienteTipoDoc === "1" ? "DNI" : "Doc."} {c.clienteNumDoc}
        </div>
      </>
    ) },
    { key: "total", label: "Total", align: "right", render: (c) => (
      <>
        {monto(c.total, c.moneda)}
        {c.moneda === "USD" && c.tipoCambio && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>TC {c.tipoCambio}</div>
        )}
      </>
    ) },
    { key: "estado", label: "SUNAT", render: (c) => (
      <>
        <Badge tone={TONO_ESTADO[c.estado]} dot>{c.estado}</Badge>
        {c.sunatMensaje && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", maxWidth: 260 }}>{c.sunatMensaje}</div>
        )}
        {c.validacionSunat && (
          <div style={{ marginTop: "0.25rem" }}>
            <Badge tone={TONO_VALIDEZ[c.validacionSunat.estadoComprobante] ?? "gray"}>
              Consulta: {c.validacionSunat.estadoComprobante}
            </Badge>
            <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
              {new Date(c.validadoAt).toLocaleString("es-PE")}
            </div>
          </div>
        )}
      </>
    ) },
    { key: "cobro", label: "Cobro", render: (c) => (
      <>
        {c.cobro && <Badge tone={TONO_COBRO[c.cobro.estado]}>{c.cobro.estado}</Badge>}
        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
          {c.formaPago === "CREDITO" ? "Crédito" : "Contado"}
          {c.cobro && !["PAGADO", "ANULADO"].includes(c.cobro.estado) && <> · saldo {monto(c.cobro.saldo, c.moneda)}</>}
        </div>
        {c.cobro?.proximoVencimiento && !["PAGADO", "ANULADO"].includes(c.cobro.estado) && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>Vence {fechaCorta(c.cobro.proximoVencimiento)}</div>
        )}
        {c.detraccionMonto > 0 && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
            Detracción {soles(c.detraccionMonto)}{c.cobro?.saldoDetraccion > 0 ? " (por depositar)" : ""}
          </div>
        )}
        {c.agenteRetencion && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>Agente de retención (3%)</div>
        )}
        {c.correoEnviadoA && (
          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>✉ {c.correoEnviadoA}</div>
        )}
      </>
    ) },
    { key: "acciones", label: "Acciones", render: (c) => (
      <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
        {c.origen !== "EXTERNO" && (
          <>
            <Button size="sm" variant="ghost" icon={FileText} disabled={c.estado !== "ACEPTADO"} onClick={() => descargar(c, "pdf")}>PDF</Button>
            <Button size="sm" variant="ghost" icon={FileCode} disabled={!c.tieneXml} onClick={() => descargar(c, "xml")}>XML</Button>
            <Button size="sm" variant="ghost" icon={FileCheck} disabled={!c.tieneCdr} onClick={() => descargar(c, "cdr")}>CDR</Button>
          </>
        )}
        {c.estado === "ACEPTADO" && c.origen !== "EXTERNO" && (
          <Button size="sm" variant="ghost" icon={Mail} loading={ocupado === c.id} onClick={() => enviarCorreo(c)}>Correo</Button>
        )}
        {c.estado !== "PENDIENTE" && (
          <Button size="sm" variant="ghost" icon={ShieldCheck} loading={ocupado === c.id} onClick={() => verificar(c)}>
            Verificar
          </Button>
        )}
        {c.cobro && c.cobro.estado !== "ANULADO" && (
          <Button size="sm" variant="secondary" icon={Wallet} onClick={() => setPagosDe(c.id)}>Cobros</Button>
        )}
        {["ERROR", "PENDIENTE"].includes(c.estado) && (
          <Button size="sm" variant="secondary" icon={RotateCcw} loading={ocupado === c.id}
            onClick={() => ejecutar(c.id, () => reenviarComprobante(c.id))}>
            Reenviar
          </Button>
        )}
        {c.origen === "EXTERNO" && c.cobro && c.cobro.cobrado + c.cobro.retenido + c.cobro.detraccionPagada === 0 && (
          <Button size="sm" variant="ghost" icon={Trash2} loading={ocupado === c.id} onClick={() => {
            if (!confirm(`¿Eliminar el registro de ${c.numero}? (no afecta al comprobante en SUNAT)`)) return;
            ejecutar(c.id, async () => { await eliminarComprobanteExterno(c.id); showToast(`${c.numero} eliminado`, "success"); });
          }}>Eliminar</Button>
        )}
        {c.cobro && c.cobro.estado !== "ANULADO" && c.origen !== "EXTERNO" && (
          <>
            <Button size="sm" variant="danger" icon={Undo2} onClick={() => setNota({ comprobanteId: c.id, tipo: "NOTA_CREDITO" })}>
              Nota de crédito
            </Button>
            <Button size="sm" variant="ghost" icon={FilePlus2} onClick={() => setNota({ comprobanteId: c.id, tipo: "NOTA_DEBITO" })}>
              Nota de débito
            </Button>
          </>
        )}
      </div>
    ) },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
          {FILTROS_COBRO.map(([k, label]) => (
            <button key={k} type="button" style={chip(filtroCobro === k)} onClick={() => setFiltroCobro(k)}>{label}</button>
          ))}
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text3)" }}>
            Por cobrar: <strong>{Object.keys(porCobrar).length ? Object.entries(porCobrar).map(([m, v]) => monto(v, m)).join(" · ") : soles(0)}</strong>
          </span>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button variant="secondary" icon={FileUp} onClick={() => setExternoAbierto(true)}>Registrar comprobante SOL</Button>
          <Button icon={Plus} onClick={() => setNuevaAbierta(true)}>Nueva factura / boleta</Button>
        </div>
      </div>
      <Table columns={columns} rows={visibles} empty="No hay comprobantes para este filtro" />
      <PagosDrawer comprobanteId={pagosDe} onClose={() => setPagosDe(null)} onCambio={onActualizado} showToast={showToast} />
      <NotaDrawer nota={nota} onClose={() => setNota(null)} onEmitida={onActualizado} showToast={showToast} />
      <ComprobanteExternoDrawer
        open={externoAbierto}
        onClose={() => setExternoAbierto(false)}
        onRegistrado={onActualizado}
        showToast={showToast}
      />
      <NuevaFacturaDrawer
        open={nuevaAbierta}
        onClose={() => setNuevaAbierta(false)}
        onEmitido={onActualizado}
        showToast={showToast}
      />
    </>
  );
}
