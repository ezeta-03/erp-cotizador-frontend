import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Drawer, Field } from "../components/ui";
import {
  agregarAdjuntoPago, eliminarAdjuntoPago, eliminarPagoPorPagar, getDocumentoPorPagar, registrarPagoPorPagar, urlAdjuntoPago,
} from "../api/cuentas";
import { AdjuntosPago, ConstanciaInput } from "./ConstanciaPago";
import CuentaFinancieraField from "./CuentaFinancieraField";
import { abrirConstancia } from "../utils/abrirConstancia";
import { monto, soles } from "../utils/formato";
import { TONO_COBRO } from "../constants/estados";
import { TIPO_DOC_LABEL } from "../constants/cuentas";

const MEDIOS = [
  ["TRANSFERENCIA", "Transferencia"], ["DEPOSITO", "Depósito"], ["EFECTIVO", "Efectivo"],
  ["YAPE_PLIN", "Yape / Plin"], ["CHEQUE", "Cheque"], ["OTRO", "Otro"],
];
const etiquetaMedio = Object.fromEntries(MEDIOS);
const hoy = () => new Date().toLocaleDateString("en-CA");
const pagoVacio = (tipo = "PAGO") => ({
  tipo, fecha: hoy(), monto: "", numeroOperacion: "", nota: "", medio: tipo === "DETRACCION" ? "DEPOSITO" : "TRANSFERENCIA",
  cuentaFinancieraId: "", tipoCambioCuenta: "", banco: "",
});

// Pagos de un documento por pagar: al proveedor (neto) y el depósito de la
// detracción en su cuenta del Banco de la Nación (en soles).
export default function PagosPorPagarDrawer({ documentoId, onClose, onCambio, showToast }) {
  const [c, setC] = useState(null);
  const [pago, setPago] = useState(pagoVacio());
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!documentoId) return;
    setC(null);
    setPago(pagoVacio());
    setArchivo(null);
    setError(null);
    getDocumentoPorPagar(documentoId)
      .then(setC)
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el documento"));
  }, [documentoId]);

  const M = (v) => monto(v, c?.moneda);
  const pendiente = !c ? 0 : pago.tipo === "DETRACCION" ? c.pago.saldoDetraccion : c.pago.saldo;
  const montoPago = (p) => (p.tipo === "DETRACCION" ? soles(p.monto) : M(p.monto));

  const actualizar = (r) => {
    setC(r);
    onCambio?.();
  };

  const registrar = async () => {
    setGuardando(true);
    setError(null);
    try {
      actualizar(await registrarPagoPorPagar(documentoId, { ...pago, monto: Number(pago.monto) }, archivo));
      setPago(pagoVacio(pago.tipo));
      setArchivo(null);
      showToast("Pago registrado", "success");
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar el pago");
    } finally {
      setGuardando(false);
    }
  };

  const eliminar = async (p) => {
    if (!confirm(`¿Eliminar el pago de ${montoPago(p)} del ${new Date(p.fecha).toLocaleDateString("es-PE")}?`)) return;
    try {
      actualizar(await eliminarPagoPorPagar(documentoId, p.id));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo eliminar el pago");
    }
  };

  // Datos leídos de la constancia (OCR): solo pisan lo que se reconoció.
  const precargar = (d) => setPago((p) => ({
    ...p,
    ...(d.numeroOperacion && { numeroOperacion: d.numeroOperacion }),
    ...(d.fecha && { fecha: d.fecha }),
    ...(d.monto && { monto: String(d.monto) }),
    ...(d.medio && p.tipo !== "DETRACCION" && { medio: d.medio }),
    ...(d.banco && !p.nota && { nota: d.banco }),
    ...(d.banco && { banco: d.banco }),
  }));

  const enAdjunto = async (accion, mensajeError) => {
    setError(null);
    try {
      await accion();
    } catch (err) {
      setError(err.response?.data?.message || mensajeError);
    }
  };
  const adjuntosDe = (p) => (
    <AdjuntosPago
      adjuntos={p.adjuntos}
      onAbrir={(a) => enAdjunto(() => abrirConstancia(() => urlAdjuntoPago(documentoId, p.id, a.id)), "No se pudo abrir la constancia")}
      onEliminar={(a) => confirm(`¿Quitar la constancia ${a.nombre}?`) && enAdjunto(async () => actualizar(await eliminarAdjuntoPago(documentoId, p.id, a.id)), "No se pudo quitar la constancia")}
      onAgregar={(f) => enAdjunto(async () => actualizar(await agregarAdjuntoPago(documentoId, p.id, f)), "No se pudo adjuntar la constancia")}
    />
  );

  const fila = (label, valor, fuerte) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: fuerte ? 700 : 400 }}>
      <span>{label}</span><span>{valor}</span>
    </div>
  );

  return (
    <Drawer
      open={!!documentoId}
      onClose={onClose}
      eyebrow="Pagos al proveedor"
      title={c ? `${TIPO_DOC_LABEL[c.tipoDocumento]} ${c.documento}` : "Cargando..."}
    >
      {c && (
        <div style={{ display: "grid", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.3rem", fontSize: "var(--text-sm)" }}>
            <div><strong>{c.proveedor.razonSocial}</strong>{c.proveedor.ruc ? ` · ${c.proveedor.tipoDocIdentidad || "RUC"} ${c.proveedor.ruc}` : ""}</div>
            {(c.proveedor.banco || c.proveedor.numeroCuenta) && (
              <div style={{ color: "var(--color-text3)" }}>
                {[c.proveedor.banco, c.proveedor.numeroCuenta, c.proveedor.cci && `CCI ${c.proveedor.cci}`].filter(Boolean).join(" · ")}
              </div>
            )}
            <div><Badge tone={TONO_COBRO[c.pago.estado]}>{c.pago.estado}</Badge></div>
            {fila("Total", M(c.total))}
            {c.detraccionMonto > 0 && fila("Detracción (a depositar)", soles(c.detraccionMonto))}
            {c.retencionMonto > 0 && fila("Retención", M(c.retencionMonto))}
            {fila("Neto al proveedor", M(c.pago.neto))}
            {fila("Pagado", M(c.pago.pagado))}
            {fila("Saldo", M(c.pago.saldo), true)}
            {c.detraccionMonto > 0 && fila("Detracción por depositar", soles(c.pago.saldoDetraccion))}
          </div>

          {c.pagos.length > 0 && (
            <div style={{ display: "grid", gap: "0.4rem" }}>
              {c.pagos.map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", fontSize: "var(--text-sm)", borderBottom: "1px solid var(--color-border)", paddingBottom: "0.35rem" }}>
                  <div>
                    <strong>{montoPago(p)}</strong> · {p.tipo === "DETRACCION" ? "Detracción" : "Pago"} · {etiquetaMedio[p.medio]}
                    <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
                      {new Date(p.fecha).toLocaleDateString("es-PE")}{p.numeroOperacion ? ` · op. ${p.numeroOperacion}` : ""}{p.cuentaFinanciera ? ` · ${p.cuentaFinanciera.nombre}` : ""}{p.usuario ? ` · ${p.usuario.nombre}` : ""}
                    </div>
                    {adjuntosDe(p)}
                  </div>
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label="Eliminar pago" onClick={() => eliminar(p)} />
                </div>
              ))}
            </div>
          )}

          {c.pago.estado !== "ANULADO" && (c.pago.saldo > 0 || c.pago.saldoDetraccion > 0) && (
            <div style={{ display: "grid", gap: "0.6rem", borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
              <strong style={{ fontSize: "var(--text-sm)" }}>Registrar pago</strong>
              <Field as="select" label="Tipo" value={pago.tipo} onChange={(e) => setPago(pagoVacio(e.target.value))}>
                <option value="PAGO">Pago al proveedor</option>
                {c.detraccionMonto > 0 && <option value="DETRACCION">Depósito de detracción (S/)</option>}
              </Field>
              <Field label="Fecha" type="date" max={hoy()} value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} />
              <Field label={`Monto (pendiente ${pago.tipo === "DETRACCION" ? soles(pendiente) : M(pendiente)})`} type="number" step="any" min="0"
                value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} />
              <Field as="select" label="Medio" value={pago.medio} onChange={(e) => setPago({ ...pago, medio: e.target.value })}>
                {MEDIOS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </Field>
              <Field label="N.° de operación" value={pago.numeroOperacion} onChange={(e) => setPago({ ...pago, numeroOperacion: e.target.value })} />
              <CuentaFinancieraField
                label="Cuenta de la que sale"
                value={pago.cuentaFinancieraId} onChange={(v) => setPago((p) => ({ ...p, cuentaFinancieraId: v }))}
                tipoCambio={pago.tipoCambioCuenta} onTipoCambio={(v) => setPago((p) => ({ ...p, tipoCambioCuenta: v }))}
                monedaPago={pago.tipo === "DETRACCION" ? "PEN" : c.moneda} montoPago={pago.monto}
                tipoPago={pago.tipo} medio={pago.medio} banco={pago.banco}
              />
              <ConstanciaInput archivo={archivo} onArchivo={setArchivo} onLeido={precargar} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="ghost" onClick={() => setPago({ ...pago, monto: String(pendiente) })}>Todo lo pendiente</Button>
                <Button onClick={registrar} loading={guardando} disabled={!(Number(pago.monto) > 0) || !pago.cuentaFinancieraId}>Registrar</Button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", borderRadius: 6, color: "var(--badge-red-text)", background: "var(--color-danger-bg)" }}>{error}</div>}
    </Drawer>
  );
}
