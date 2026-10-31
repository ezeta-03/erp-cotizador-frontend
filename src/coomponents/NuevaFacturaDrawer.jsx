import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { Button, Drawer, Field } from "../components/ui";
import {
  consultarDocumento, emitirComprobanteManual, getBorradorCotizacion, getOpcionesComprobante, getTipoCambio,
} from "../api/comprobantes";
import { IGV_RATE } from "../config/negocio";
import { monto, soles } from "../utils/formato";

// Catálogo 03 (unidades de medida) que acepta el backend.
const UNIDADES = [
  ["NIU", "Unidad"], ["ZZ", "Servicio"], ["MTK", "m²"], ["MTR", "Metro"], ["KGM", "Kg"],
];

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const itemVacio = () => ({ cantidad: "1", unidad: "NIU", descripcion: "", valorUnitario: "" });
const esRuc = (doc) => /^(10|15|17|20)\d{9}$/.test(String(doc || "").trim());

function enDias(dias = 30) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

const celda = { padding: "0.25rem", verticalAlign: "top" };
const inputCelda = {
  width: "100%", padding: "0.4rem", border: "1px solid var(--color-input-border)",
  borderRadius: 6, background: "var(--color-input-bg)", font: "inherit",
};
const aviso = (tono) => ({
  padding: "0.5rem 0.75rem", borderRadius: 6,
  color: tono === "error" ? "var(--badge-red-text)" : "var(--badge-blue-text)",
  background: tono === "error" ? "var(--color-danger-bg)" : "var(--color-info-bg)",
});

// Factura o boleta. Sin cotizacionId los ítems son libres; con cotizacionId el
// formulario se prellena con el cliente y los ítems de la cotización (editables)
// y al emitir la cotización pasa a FACTURADA. Totales, detracción y neto son una
// vista previa: el backend vuelve a calcularlos.
export default function NuevaFacturaDrawer({ open, onClose, onEmitido, showToast, cotizacionId = null, tipoInicial = "FACTURA" }) {
  const [opciones, setOpciones] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [tipo, setTipo] = useState("FACTURA");
  const [cliente, setCliente] = useState({ numDoc: "", nombre: "", direccion: "" });
  const [advertencia, setAdvertencia] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [items, setItems] = useState([itemVacio()]);
  const [formaPago, setFormaPago] = useState("CONTADO");
  const [cuotas, setCuotas] = useState([]);
  // Días de crédito pactados (cotización o cliente): fijan el vencimiento sugerido.
  const [diasCredito, setDiasCredito] = useState(null);
  // null = automática (factura > monto mínimo); true/false = elegida por el usuario
  const [aplicarDetraccion, setAplicarDetraccion] = useState(null);
  const [codigoDetraccion, setCodigoDetraccion] = useState(null);
  const [observacion, setObservacion] = useState("");
  const [moneda, setMoneda] = useState("PEN");
  const [tipoCambio, setTipoCambio] = useState(null); // { fecha, venta } (solo USD)
  const [agenteRetencion, setAgenteRetencion] = useState(null); // true/false/null (no consultado)
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState(null);

  // Al abrir: catálogos y, si viene de una cotización, el borrador prellenado.
  useEffect(() => {
    if (!open) return;
    setTipo(tipoInicial);
    setCliente({ numDoc: "", nombre: "", direccion: "" });
    setAdvertencia(null);
    setItems([itemVacio()]);
    setFormaPago("CONTADO");
    setCuotas([]);
    setDiasCredito(null);
    setAplicarDetraccion(null);
    setMoneda("PEN");
    setTipoCambio(null);
    setAgenteRetencion(null);
    setCodigoDetraccion(null);
    setObservacion("");
    setError(null);
    setCotizacion(null);

    let vigente = true;
    setCargando(true);
    Promise.all([
      getOpcionesComprobante(),
      cotizacionId ? getBorradorCotizacion(cotizacionId) : null,
    ])
      .then(([ops, borrador]) => {
        if (!vigente) return;
        setOpciones(ops);
        if (borrador) {
          setCotizacion({ ...borrador.cotizacion, puedeFactura: borrador.puedeFactura });
          setAgenteRetencion(borrador.agenteRetencion);
          setTipo(borrador.puedeFactura ? tipoInicial : "BOLETA");
          setCliente({ numDoc: borrador.cliente.numDoc || "", nombre: borrador.cliente.nombre || "", direccion: borrador.cliente.direccion || "" });
          setItems(borrador.items.map((it) => ({ ...it, cantidad: String(it.cantidad), valorUnitario: String(it.valorUnitario) })));
          aplicarCondicion(borrador.condicion, borrador.puedeFactura);
        }
      })
      .catch((err) => vigente && setError(err.response?.data?.message || "No se pudo preparar el comprobante"))
      .finally(() => vigente && setCargando(false));
    return () => { vigente = false; };
  }, [open, cotizacionId, tipoInicial]);

  const codigos = opciones?.detraccion.codigos || [];
  const codigoElegido = codigoDetraccion || opciones?.detraccion.codigoPorDefecto;
  const datosCodigo = codigos.find((d) => d.codigo === codigoElegido);

  // En dólares: topes de S/ 700 y detracción en soles (tipo de cambio venta SUNAT);
  // total, neto y cuotas en dólares.
  const totales = useMemo(() => {
    const valorVenta = r2(items.reduce((a, it) => a + r2((Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0)), 0));
    const igv = r2(valorVenta * IGV_RATE);
    const total = r2(valorVenta + igv);
    const totalSoles = moneda === "USD" ? r2(total * (tipoCambio?.venta || 0)) : total;
    const superaMinimo = tipo === "FACTURA" && totalSoles > (opciones?.detraccion.montoMinimo ?? 700);
    const aplica = superaMinimo && (aplicarDetraccion ?? true);
    const pct = aplica && datosCodigo ? datosCodigo.porcentaje : 0;
    const detraccionSoles = r2(totalSoles * pct / 100);
    const detraccion = moneda === "USD" ? r2(total * pct / 100) : detraccionSoles;
    const retencion = tipo === "FACTURA" && agenteRetencion && !aplica && totalSoles > 700
      ? r2(total * (opciones?.retencionPorcentaje ?? 3) / 100) : 0;
    return { valorVenta, igv, total, totalSoles, superaMinimo, aplica, detraccion, detraccionSoles, retencion, neto: r2(total - detraccion) };
  }, [items, tipo, opciones, aplicarDetraccion, datosCodigo, moneda, tipoCambio, agenteRetencion]);
  const M = (v) => monto(v, moneda);

  const cambiarMoneda = async (m) => {
    setMoneda(m);
    setCuotas([]);
    setFormaPago("CONTADO");
    if (m !== "USD" || tipoCambio) return;
    try {
      setTipoCambio(await getTipoCambio());
    } catch (err) {
      setMoneda("PEN");
      setError(err.response?.data?.message || "No se pudo obtener el tipo de cambio");
    }
  };

  // Condición pactada → forma de pago precargada (el crédito solo aplica a facturas).
  function aplicarCondicion(condicion, puedeFactura = true) {
    if (condicion?.condicionPago !== "CREDITO" || !puedeFactura) return;
    setDiasCredito(condicion.diasCredito || 30);
    setFormaPago("CREDITO");
    setCuotas([]);
  }

  // Crédito sin cuotas aún (recién precargado): una sola cuota por el neto.
  useEffect(() => {
    if (formaPago === "CREDITO" && cuotas.length === 0 && totales.neto > 0) {
      setCuotas([{ monto: String(totales.neto), fechaVencimiento: enDias(diasCredito || 30) }]);
    }
  }, [formaPago, cuotas.length, totales.neto, diasCredito]);

  const sumaCuotas = r2(cuotas.reduce((a, q) => a + (Number(q.monto) || 0), 0));
  const facturaSinRuc = tipo === "FACTURA" && cliente.numDoc && !esRuc(cliente.numDoc);

  const buscar = async () => {
    const doc = cliente.numDoc.trim();
    if (!/^\d{8}$|^\d{11}$/.test(doc)) return setError("Ingresa un RUC de 11 dígitos o un DNI de 8");
    setBuscando(true);
    setError(null);
    try {
      const r = await consultarDocumento(doc);
      setCliente({ numDoc: r.numDoc, nombre: r.nombre || "", direccion: r.direccion || "" });
      setAdvertencia(r.advertencia);
      setAgenteRetencion(r.agenteRetencion ?? null);
      if (tipo === "FACTURA") aplicarCondicion(r.condicion);
    } catch (err) {
      setAdvertencia(null);
      setError(err.response?.data?.message || "No se pudo consultar el documento");
    } finally {
      setBuscando(false);
    }
  };

  const cambiarItem = (i, campo, valor) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));

  const cambiarFormaPago = (fp) => {
    setFormaPago(fp);
    if (fp === "CREDITO" && cuotas.length === 0) {
      setCuotas([{ monto: String(totales.neto), fechaVencimiento: enDias(diasCredito || 30) }]);
    }
  };

  // Reparte el neto pendiente en partes iguales (la última absorbe los céntimos).
  const repartirCuotas = () => {
    const n = cuotas.length || 1;
    const parte = r2(totales.neto / n);
    setCuotas((prev) => (prev.length ? prev : [{ fechaVencimiento: enDias(diasCredito || 30) }]).map((q, i) => ({
      ...q, monto: String(i === n - 1 ? r2(totales.neto - parte * (n - 1)) : parte),
    })));
  };

  const emitir = async () => {
    setError(null);
    const etiqueta = tipo === "FACTURA" ? "la factura" : "la boleta";
    if (!confirm(`¿Emitir ${etiqueta} por ${M(totales.total)} a ${cliente.nombre || "este cliente"}? Se enviará a SUNAT.`)) return;
    setEmitiendo(true);
    try {
      const c = await emitirComprobanteManual({
        tipo,
        cotizacionId: cotizacion?.id,
        cliente,
        items: items.map((it) => ({ ...it, cantidad: Number(it.cantidad), valorUnitario: Number(it.valorUnitario) })),
        moneda,
        formaPago: tipo === "FACTURA" ? formaPago : "CONTADO",
        cuotas: tipo === "FACTURA" && formaPago === "CREDITO"
          ? cuotas.map((q) => ({ monto: Number(q.monto), fechaVencimiento: q.fechaVencimiento }))
          : undefined,
        detraccion: tipo === "FACTURA" ? { aplicar: totales.aplica, codigo: codigoElegido } : undefined,
        observacion,
      });
      if (c.estado === "ACEPTADO") showToast(`${c.numero} aceptada por SUNAT`, "success");
      else showToast(`${c.numero}: ${c.estado}. ${c.sunatMensaje || ""}`);
      onEmitido(c);
      onClose();
    } catch (err) {
      console.error("❌ Error emitiendo comprobante:", err);
      setError(err.response?.data?.message || "No se pudo emitir el comprobante");
    } finally {
      setEmitiendo(false);
    }
  };

  const fila = (label, valor, fuerte) => (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: fuerte ? 700 : 400 }}>
      <span>{label}</span><span>{valor}</span>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      wide
      eyebrow={cotizacion ? `Desde cotización ${cotizacion.numero}` : "Comprobante electrónico"}
      title={tipo === "FACTURA" ? "Nueva factura" : "Nueva boleta"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={emitir} loading={emitiendo} disabled={cargando || facturaSinRuc}>Emitir a SUNAT</Button>
        </>
      }
    >
      {cargando ? <p>Cargando…</p> : (
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }}>
        <Field as="select" label="Tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="FACTURA" disabled={cotizacion && !cotizacion.puedeFactura}>
            Factura{cotizacion && !cotizacion.puedeFactura ? " (el cliente no tiene RUC)" : ""}
          </option>
          <option value="BOLETA">Boleta</option>
        </Field>
        <Field as="select" label="Moneda" value={moneda} onChange={(e) => cambiarMoneda(e.target.value)}
          hint={moneda === "USD" && tipoCambio ? `Tipo de cambio venta SUNAT del ${tipoCambio.fecha}: ${tipoCambio.venta}` : undefined}>
          <option value="PEN">Soles (S/)</option>
          <option value="USD">Dólares (US$)</option>
        </Field>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field
              label={tipo === "FACTURA" ? "RUC del cliente" : "DNI o RUC del cliente"}
              value={cliente.numDoc}
              inputMode="numeric"
              maxLength={11}
              onChange={(e) => setCliente((c) => ({ ...c, numDoc: e.target.value.replace(/\D/g, "") }))}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              error={facturaSinRuc ? "La factura requiere RUC (11 dígitos). Para DNI usa boleta." : undefined}
            />
          </div>
          <Button variant="secondary" icon={Search} loading={buscando} onClick={buscar}>Buscar en SUNAT</Button>
        </div>
        {advertencia && <div style={aviso("error")}>⚠ {advertencia}</div>}
        <Field label="Razón social / Nombre" value={cliente.nombre} onChange={(e) => setCliente((c) => ({ ...c, nombre: e.target.value }))} />
        <Field label="Dirección" value={cliente.direccion} onChange={(e) => setCliente((c) => ({ ...c, direccion: e.target.value }))} />

        <div>
          <strong>Ítems</strong>
          <span style={{ color: "var(--color-text3)", fontSize: "var(--text-xs)" }}> — valor unitario sin IGV</span>
          <table style={{ width: "100%", minWidth: 0, borderCollapse: "collapse", marginTop: "0.5rem" }}>
            <thead>
              <tr style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", textAlign: "left" }}>
                <th style={{ ...celda, width: 70 }}>Cant.</th>
                <th style={{ ...celda, width: 95 }}>Unidad</th>
                <th style={celda}>Descripción</th>
                <th style={{ ...celda, width: 90 }}>V. unit.</th>
                <th style={{ ...celda, width: 90, textAlign: "right" }}>Importe</th>
                <th style={{ ...celda, width: 32 }} />
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td style={celda}>
                    <input style={inputCelda} type="number" min="0" step="any" value={it.cantidad}
                      onChange={(e) => cambiarItem(i, "cantidad", e.target.value)} />
                  </td>
                  <td style={celda}>
                    <select style={inputCelda} value={it.unidad} onChange={(e) => cambiarItem(i, "unidad", e.target.value)}>
                      {UNIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </td>
                  <td style={celda}>
                    <textarea style={{ ...inputCelda, resize: "vertical" }} rows={2} value={it.descripcion}
                      onChange={(e) => cambiarItem(i, "descripcion", e.target.value)} />
                  </td>
                  <td style={celda}>
                    <input style={inputCelda} type="number" min="0" step="any" value={it.valorUnitario}
                      onChange={(e) => cambiarItem(i, "valorUnitario", e.target.value)} />
                  </td>
                  <td style={{ ...celda, textAlign: "right", paddingTop: "0.6rem" }}>
                    {M(r2((Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0)))}
                  </td>
                  <td style={celda}>
                    <Button size="sm" variant="ghost" icon={Trash2} aria-label="Quitar ítem"
                      disabled={items.length === 1} onClick={() => setItems((p) => p.filter((_, j) => j !== i))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => setItems((p) => [...p, itemVacio()])}>Agregar ítem</Button>
        </div>

        <div style={{ display: "grid", gap: "0.25rem", padding: "0.75rem", background: "var(--color-input-bg)", borderRadius: 8 }}>
          {fila("Valor venta", M(totales.valorVenta))}
          {fila(`IGV (${IGV_RATE * 100}%)`, M(totales.igv))}
          {fila("Importe total", M(totales.total), true)}
          {moneda === "USD" && fila(`Equivale a (TC ${tipoCambio?.venta ?? "…"})`, soles(totales.totalSoles))}
          {totales.aplica && (
            <>
              {fila(`Detracción ${datosCodigo?.porcentaje}% (${codigoElegido})`,
                `− ${M(totales.detraccion)}${moneda === "USD" ? ` (${soles(totales.detraccionSoles)})` : ""}`)}
              {fila("Neto a cobrar al cliente", M(totales.neto), true)}
            </>
          )}
        </div>
        {cotizacion && Math.abs(totales.total - cotizacion.total) > 0.009 && (
          <div style={aviso("info")}>
            El total ({M(totales.total)}) es distinto al de la cotización ({soles(cotizacion.total)}).
          </div>
        )}
        {totales.retencion > 0 && (
          <div style={aviso("info")}>
            El cliente es <strong>agente de retención</strong>: al pagar retendrá el {opciones?.retencionPorcentaje ?? 3}% ({M(totales.retencion)}).
            Regístralo en Cobros como "Retención" con el n.° de su comprobante de retención.
          </div>
        )}

        {tipo === "FACTURA" && totales.superaMinimo && (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={totales.aplica} onChange={(e) => setAplicarDetraccion(e.target.checked)} />
              Aplicar detracción (factura mayor a {soles(opciones?.detraccion.montoMinimo)})
            </label>
            {totales.aplica && (
              <Field as="select" label="Bien o servicio sujeto a detracción" value={codigoElegido}
                onChange={(e) => setCodigoDetraccion(e.target.value)}>
                {codigos.map((d) => (
                  <option key={d.codigo} value={d.codigo}>{d.codigo} — {d.descripcion} ({d.porcentaje}%)</option>
                ))}
              </Field>
            )}
          </div>
        )}

        {tipo === "FACTURA" && (
          <div style={{ display: "grid", gap: "0.5rem" }}>
            <Field as="select" label="Forma de pago" value={formaPago} onChange={(e) => cambiarFormaPago(e.target.value)}
              hint={diasCredito ? `Condición pactada: crédito a ${diasCredito} días` : undefined}>
              <option value="CONTADO">Contado</option>
              <option value="CREDITO">Crédito</option>
            </Field>
            {formaPago === "CREDITO" && (
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
                    onClick={() => setCuotas((p) => [...p, { monto: "0", fechaVencimiento: enDias(diasCredito || 30) }])}>Agregar cuota</Button>
                  <Button size="sm" variant="ghost" onClick={repartirCuotas}>Repartir neto en partes iguales</Button>
                  <span style={{ fontSize: "var(--text-xs)", color: Math.abs(sumaCuotas - totales.neto) > 0.009 ? "var(--badge-red-text)" : "var(--color-text3)" }}>
                    Cuotas: {M(sumaCuotas)} de {M(totales.neto)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <Field as="textarea" label="Observación (uso interno)" rows={2} value={observacion} onChange={(e) => setObservacion(e.target.value)} />

        {error && <div style={aviso("error")}>{error}</div>}
      </div>
      )}
    </Drawer>
  );
}
