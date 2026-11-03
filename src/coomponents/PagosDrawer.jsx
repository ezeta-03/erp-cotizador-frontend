import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge, Button, Drawer, Field } from "../components/ui";
import {
  agregarAdjuntoCobro, eliminarAdjuntoCobro, eliminarPagoComprobante, getPagosComprobante, registrarPagoComprobante, urlAdjuntoCobro,
} from "../api/comprobantes";
import { AdjuntosPago, ConstanciaInput } from "./ConstanciaPago";
import CuentaFinancieraField from "./CuentaFinancieraField";
import { abrirConstancia } from "../utils/abrirConstancia";
import { monto, soles } from "../utils/formato";
import { TONO_COBRO } from "../constants/estados";

const MEDIOS = [
  ["TRANSFERENCIA", "Transferencia"], ["DEPOSITO", "Depósito"], ["EFECTIVO", "Efectivo"],
  ["YAPE_PLIN", "Yape / Plin"], ["CHEQUE", "Cheque"], ["OTRO", "Otro"],
];
const etiquetaMedio = Object.fromEntries(MEDIOS);

const hoy = () => new Date().toLocaleDateString("en-CA");
const pagoVacio = (tipo = "COBRO") => ({
  tipo, fecha: hoy(), monto: "", numeroOperacion: "", nota: "", cuentaFinancieraId: "", tipoCambioCuenta: "", banco: "",
  medio: tipo === "DETRACCION" ? "DEPOSITO" : tipo === "RETENCION" ? "OTRO" : "TRANSFERENCIA",
});
const ETIQUETA_TIPO = { COBRO: "Cobro", DETRACCION: "Detracción", RETENCION: "Retención" };

// Cobros de un comprobante: lo que paga el cliente (neto = total − detracción)
// y el depósito de la detracción en el Banco de la Nación, cada uno con su saldo.
export default function PagosDrawer({ comprobanteId, onClose, onCambio, showToast }) {
  const [datos, setDatos] = useState(null);
  const [pago, setPago] = useState(pagoVacio());
  const [archivo, setArchivo] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!comprobanteId) return;
    setDatos(null);
    setPago(pagoVacio());
    setArchivo(null);
    setError(null);
    getPagosComprobante(comprobanteId)
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar los pagos"));
  }, [comprobanteId]);

  const cobro = datos?.cobro;
  // Cobro y retención en la moneda del comprobante; la detracción, en soles.
  const moneda = datos?.comprobante.moneda || "PEN";
  const M = (v) => monto(v, moneda);
  const pendiente = !cobro ? 0
    : pago.tipo === "DETRACCION" ? cobro.saldoDetraccion
    : pago.tipo === "RETENCION" ? Math.min(Math.max(cobro.retencionEsperada - cobro.retenido, 0), cobro.saldo)
    : cobro.saldo;
  const montoPago = (p) => (p.tipo === "DETRACCION" ? soles(p.monto) : M(p.monto));

  const actualizar = (r) => {
    setDatos(r);
    onCambio();
  };

  const registrar = async () => {
    setError(null);
    setGuardando(true);
    try {
      actualizar(await registrarPagoComprobante(comprobanteId, { ...pago, monto: Number(pago.monto) }, archivo));
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
      actualizar(await eliminarPagoComprobante(comprobanteId, p.id));
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
      onAbrir={(a) => enAdjunto(() => abrirConstancia(() => urlAdjuntoCobro(comprobanteId, p.id, a.id)), "No se pudo abrir la constancia")}
      onEliminar={(a) => confirm(`¿Quitar la constancia ${a.nombre}?`) && enAdjunto(async () => actualizar(await eliminarAdjuntoCobro(comprobanteId, p.id, a.id)), "No se pudo quitar la constancia")}
      onAgregar={(f) => enAdjunto(async () => actualizar(await agregarAdjuntoCobro(comprobanteId, p.id, f)), "No se pudo adjuntar la constancia")}
    />
  );

  const fila = (label, valor, fuerte) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: fuerte ? 700 : 400 }}>
      <span>{label}</span><span>{valor}</span>
    </div>
  );

  const puedeRegistrar = cobro && !["PAGADO", "ANULADO"].includes(cobro.estado);
  const conDetraccion = cobro?.detraccion > 0;
  const conRetencion = !!datos?.comprobante.agenteRetencion;

  return (
    <Drawer
      open={!!comprobanteId}
      onClose={onClose}
      eyebrow="Cobros"
      title={datos ? `${datos.comprobante.numero} — ${datos.comprobante.clienteNombre}` : "Cobros"}
    >
      {!datos ? <p>{error || "Cargando…"}</p> : !cobro ? (
        <p>Este comprobante no se cobra (solo facturas y boletas aceptadas por SUNAT).</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }}>
          <div style={{ display: "grid", gap: "0.25rem", padding: "0.75rem", background: "var(--color-input-bg)", borderRadius: 8 }}>
            <div><Badge tone={TONO_COBRO[cobro.estado]} dot>{cobro.estado}</Badge></div>
            {fila("Importe total", M(datos.comprobante.total))}
            {conDetraccion && fila("Detracción (en soles)", soles(cobro.detraccion))}
            {cobro.notasCredito > 0 && fila("Notas de crédito", `− ${M(cobro.notasCredito)}`)}
            {cobro.notasDebito > 0 && fila("Notas de débito", `+ ${M(cobro.notasDebito)}`)}
            {fila("Neto a cobrar al cliente", M(cobro.netoCliente), true)}
            {fila("Cobrado", M(cobro.cobrado))}
            {conRetencion && fila(`Retenido (esperado ${M(cobro.retencionEsperada)})`, M(cobro.retenido))}
            {fila("Saldo del cliente", M(cobro.saldo), true)}
            {conDetraccion && fila("Detracción por depositar", soles(cobro.saldoDetraccion))}
            {cobro.proximoVencimiento && fila("Próximo vencimiento", cobro.proximoVencimiento.split("-").reverse().join("/"))}
          </div>

          <div>
            <strong>Pagos registrados</strong>
            {datos.pagos.length === 0 ? (
              <p style={{ color: "var(--color-text3)" }}>Sin pagos todavía.</p>
            ) : (
              <table style={{ width: "100%", minWidth: 0, borderCollapse: "collapse", marginTop: "0.5rem", fontSize: "var(--text-sm)" }}>
                <tbody>
                  {datos.pagos.map((p) => (
                    <tr key={p.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "0.4rem 0.25rem" }}>{new Date(p.fecha).toLocaleDateString("es-PE", { timeZone: "America/Lima" })}</td>
                      <td>
                        {ETIQUETA_TIPO[p.tipo] || p.tipo} · {etiquetaMedio[p.medio] || p.medio}
                        {(p.numeroOperacion || p.cuentaFinanciera) && (
                          <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
                            {[p.numeroOperacion && `Op. ${p.numeroOperacion}`, p.cuentaFinanciera?.nombre].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {p.nota && <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{p.nota}</div>}
                        {adjuntosDe(p)}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>{montoPago(p)}</td>
                      <td style={{ width: 32 }}>
                        <Button size="sm" variant="ghost" icon={Trash2} aria-label="Eliminar pago" onClick={() => eliminar(p)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {puedeRegistrar && (
            <div style={{ display: "grid", gap: "0.75rem", borderTop: "1px solid var(--color-border)", paddingTop: "1rem" }}>
              <strong>Registrar pago</strong>
              {(conDetraccion || conRetencion) && (
                <Field as="select" label="Tipo" value={pago.tipo} onChange={(e) => setPago(pagoVacio(e.target.value))}>
                  <option value="COBRO">Cobro al cliente</option>
                  {conDetraccion && <option value="DETRACCION">Depósito de detracción (Banco de la Nación)</option>}
                  {conRetencion && <option value="RETENCION">Retención del cliente (3%)</option>}
                </Field>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
                <Field label="Fecha" type="date" max={hoy()} value={pago.fecha} onChange={(e) => setPago((p) => ({ ...p, fecha: e.target.value }))} />
                <Field
                  label="Monto" type="number" step="any" min="0" value={pago.monto}
                  hint={`Pendiente: ${pago.tipo === "DETRACCION" ? soles(pendiente) : M(pendiente)}`}
                  onChange={(e) => setPago((p) => ({ ...p, monto: e.target.value }))}
                />
                <Field as="select" label="Medio" value={pago.medio} onChange={(e) => setPago((p) => ({ ...p, medio: e.target.value }))}>
                  {MEDIOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Field>
                <Field label={pago.tipo === "RETENCION" ? "N° de comprobante de retención" : "N° de operación"} value={pago.numeroOperacion} onChange={(e) => setPago((p) => ({ ...p, numeroOperacion: e.target.value }))} />
              </div>
              {pago.tipo !== "RETENCION" && (
                <CuentaFinancieraField
                  label="Cuenta donde entró"
                  value={pago.cuentaFinancieraId} onChange={(v) => setPago((p) => ({ ...p, cuentaFinancieraId: v }))}
                  tipoCambio={pago.tipoCambioCuenta} onTipoCambio={(v) => setPago((p) => ({ ...p, tipoCambioCuenta: v }))}
                  monedaPago={pago.tipo === "DETRACCION" ? "PEN" : moneda} montoPago={pago.monto}
                  tipoPago={pago.tipo} medio={pago.medio} banco={pago.banco}
                />
              )}
              <ConstanciaInput archivo={archivo} onArchivo={setArchivo} onLeido={precargar} />
              <Field label="Nota" value={pago.nota} onChange={(e) => setPago((p) => ({ ...p, nota: e.target.value }))} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="ghost" size="sm" onClick={() => setPago((p) => ({ ...p, monto: String(pendiente) }))}>Pagar todo lo pendiente</Button>
                <Button onClick={registrar} loading={guardando} disabled={!(Number(pago.monto) > 0) || (pago.tipo !== "RETENCION" && !pago.cuentaFinancieraId)}>Registrar pago</Button>
              </div>
            </div>
          )}

          {error && (
            <div style={{ color: "var(--badge-red-text)", background: "var(--color-danger-bg)", padding: "0.5rem 0.75rem", borderRadius: 6 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
}
