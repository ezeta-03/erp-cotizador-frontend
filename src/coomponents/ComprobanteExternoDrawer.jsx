import { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Drawer, Field } from "../components/ui";
import { consultarDocumento, registrarComprobanteExterno } from "../api/comprobantes";
import { monto } from "../utils/formato";

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const hoy = () => new Date().toLocaleDateString("en-CA");
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}
const inputCelda = {
  width: "100%", padding: "0.4rem", border: "1px solid var(--color-input-border)",
  borderRadius: 6, background: "var(--color-input-bg)", font: "inherit",
};
const fila2 = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" };

const vacio = () => ({
  tipo: "FACTURA", serie: "E001", correlativo: "", fechaEmision: hoy(),
  numDoc: "", nombre: "", moneda: "PEN", total: "", detraccionPorcentaje: "",
  agenteRetencion: false, formaPago: "CONTADO", cobrado: "", observacion: "",
});

// Registra una factura o boleta emitida fuera del ERP (portal SOL) para
// cobrarla aquí. Con "cotizacion" se prellena el cliente, el total y la
// condición de pago, y al guardar la cotización pasa a FACTURADA.
export default function ComprobanteExternoDrawer({ open, onClose, onRegistrado, showToast, cotizacion = null }) {
  const [f, setF] = useState(vacio());
  const [cuotas, setCuotas] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    const base = vacio();
    if (cotizacion) {
      Object.assign(base, {
        numDoc: cotizacion.cliente?.documento || "",
        nombre: cotizacion.cliente?.nombreComercial || "",
        total: String(cotizacion.total ?? ""),
        formaPago: cotizacion.condicionPago === "CREDITO" ? "CREDITO" : "CONTADO",
      });
    }
    setF(base);
    setCuotas([]);
    setError(null);
  }, [open, cotizacion]);

  const set = (campo, valor) => setF((p) => ({ ...p, [campo]: valor }));
  const total = Number(f.total) || 0;
  const pct = Number(f.detraccionPorcentaje) || 0;
  const neto = r2(total - r2(total * pct / 100));
  const M = (v) => monto(v, f.moneda);
  const sumaCuotas = r2(cuotas.reduce((a, q) => a + (Number(q.monto) || 0), 0));

  // Crédito sin cuotas: una sola por el neto, a los días pactados (o 30).
  useEffect(() => {
    if (f.formaPago === "CREDITO" && cuotas.length === 0 && neto > 0) {
      setCuotas([{ monto: String(neto), fechaVencimiento: sumarDias(f.fechaEmision || hoy(), cotizacion?.diasCredito || 30) }]);
    }
  }, [f.formaPago, f.fechaEmision, cuotas.length, neto, cotizacion]);

  const buscar = async () => {
    const doc = f.numDoc.trim();
    if (!/^\d{8}$|^\d{11}$/.test(doc)) return setError("Ingresa un RUC de 11 dígitos o un DNI de 8");
    setBuscando(true);
    setError(null);
    try {
      const r = await consultarDocumento(doc);
      setF((p) => ({ ...p, numDoc: r.numDoc, nombre: r.nombre || p.nombre, agenteRetencion: !!r.agenteRetencion }));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo consultar el documento");
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      const c = await registrarComprobanteExterno({
        tipo: f.tipo, serie: f.serie, correlativo: Number(f.correlativo), fechaEmision: f.fechaEmision,
        cliente: { numDoc: f.numDoc.trim(), nombre: f.nombre },
        moneda: f.moneda, total, detraccionPorcentaje: pct || undefined, agenteRetencion: f.agenteRetencion,
        formaPago: f.tipo === "FACTURA" ? f.formaPago : "CONTADO",
        cuotas: f.tipo === "FACTURA" && f.formaPago === "CREDITO"
          ? cuotas.map((q) => ({ monto: Number(q.monto), fechaVencimiento: q.fechaVencimiento }))
          : undefined,
        cobrado: Number(f.cobrado) || 0,
        observacion: f.observacion,
        cotizacionId: cotizacion?.id,
      });
      showToast(`${c.numero} registrado`, "success");
      onRegistrado?.(c);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo registrar el comprobante");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      eyebrow={cotizacion ? `Cotización ${cotizacion.numero}` : "Cuentas por cobrar"}
      title="Comprobante emitido en el portal SOL"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando} disabled={!f.correlativo || !total || !f.nombre}>Registrar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <p style={{ margin: 0, color: "var(--color-text3)", fontSize: "var(--text-sm)" }}>
          Solo se registra para controlar su cobro: no se envía a SUNAT. Para corregirlo o anularlo emite la nota en el portal SOL.
        </p>
        <div style={fila2}>
          <Field as="select" label="Tipo" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>
            <option value="FACTURA">Factura</option>
            <option value="BOLETA">Boleta</option>
          </Field>
          <Field label="Serie" value={f.serie} maxLength={4} onChange={(e) => set("serie", e.target.value.toUpperCase())} />
          <Field label="Número" type="number" min="1" value={f.correlativo} onChange={(e) => set("correlativo", e.target.value)} required />
          <Field label="Fecha de emisión" type="date" max={hoy()} value={f.fechaEmision} onChange={(e) => set("fechaEmision", e.target.value)} />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="RUC / DNI del cliente" value={f.numDoc} onChange={(e) => set("numDoc", e.target.value)} />
          </div>
          <Button variant="secondary" icon={Search} loading={buscando} onClick={buscar}>Buscar</Button>
        </div>
        <Field label="Razón social / nombre" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} required />

        <div style={fila2}>
          <Field as="select" label="Moneda" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
            <option value="PEN">Soles</option>
            <option value="USD">Dólares</option>
          </Field>
          <Field label="Total con IGV" type="number" step="any" min="0" value={f.total} onChange={(e) => { set("total", e.target.value); setCuotas([]); }} required />
          {f.tipo === "FACTURA" && (
            <Field label="Detracción %" type="number" step="any" min="0" max="100" value={f.detraccionPorcentaje}
              hint="Vacío si no tiene" onChange={(e) => { set("detraccionPorcentaje", e.target.value); setCuotas([]); }} />
          )}
          <Field label="Ya cobrado" type="number" step="any" min="0" value={f.cobrado} hint="Opcional" onChange={(e) => set("cobrado", e.target.value)} />
        </div>
        {f.tipo === "FACTURA" && (
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" checked={f.agenteRetencion} onChange={(e) => set("agenteRetencion", e.target.checked)} />
            El cliente es agente de retención (retiene 3%)
          </label>
        )}

        {f.tipo === "FACTURA" && (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Field as="select" label="Forma de pago" value={f.formaPago} onChange={(e) => { set("formaPago", e.target.value); setCuotas([]); }}
              hint={cotizacion?.condicionPago === "CREDITO" ? `Condición de la cotización: crédito a ${cotizacion.diasCredito} días` : undefined}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </Field>
            {f.formaPago === "CREDITO" && (
              <>
                {cuotas.map((q, i) => (
                  <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <span style={{ width: 70 }}>Cuota {i + 1}</span>
                    <input style={inputCelda} type="number" step="any" value={q.monto}
                      onChange={(e) => setCuotas((p) => p.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))} />
                    <input style={inputCelda} type="date" value={q.fechaVencimiento}
                      onChange={(e) => setCuotas((p) => p.map((x, j) => (j === i ? { ...x, fechaVencimiento: e.target.value } : x)))} />
                    <Button size="sm" variant="ghost" icon={Trash2} aria-label="Quitar cuota" disabled={cuotas.length === 1}
                      onClick={() => setCuotas((p) => p.filter((_, j) => j !== i))} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" icon={Plus}
                    onClick={() => setCuotas((p) => [...p, { monto: "0", fechaVencimiento: sumarDias(f.fechaEmision, 30 * (p.length + 1)) }])}>
                    Agregar cuota
                  </Button>
                  <span style={{ fontSize: "var(--text-xs)", color: Math.abs(sumaCuotas - neto) > 0.009 ? "var(--badge-red-text)" : "var(--color-text3)" }}>
                    Cuotas: {M(sumaCuotas)} de {M(neto)} (neto de detracción)
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Field as="textarea" label="Observación" rows={2} value={f.observacion} onChange={(e) => set("observacion", e.target.value)} />
        {error && (
          <div style={{ padding: "0.5rem 0.75rem", borderRadius: 6, color: "var(--badge-red-text)", background: "var(--color-danger-bg)" }}>{error}</div>
        )}
      </div>
    </Drawer>
  );
}
