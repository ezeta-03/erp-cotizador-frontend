import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Check, FileDown, PackageCheck, Plus, Send, Trash2, X } from "lucide-react";
import { Badge, Button, Drawer, Field } from "../components/ui";
import useAuth from "../auth/useAuth";
import {
  accionOrdenCompra, descargarOrdenCompraPdf, getOpcionesCompras, getOrdenCompra, guardarOrdenCompra,
} from "../api/compras";
import { monto } from "../utils/formato";
import { ESTADO_OC, ESTADO_PAGO_OC, PROVEEDORES_PROPUESTOS } from "../constants/compras";

const PROPUESTOS = PROVEEDORES_PROPUESTOS;
const IGV = 0.18;
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const hoy = () => new Date().toLocaleDateString("en-CA");
const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const caja = { border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.7rem 0.75rem" };
const aviso = (tono) => ({
  padding: "0.55rem 0.75rem", borderRadius: 6, fontSize: "var(--text-sm)", display: "flex", gap: "0.5rem", alignItems: "flex-start",
  color: tono === "error" ? "var(--badge-red-text)" : tono === "warn" ? "var(--color-warning)" : "var(--badge-blue-text)",
  background: tono === "error" ? "var(--color-danger-bg)" : tono === "warn" ? "var(--color-warning-bg, #fff7e6)" : "var(--color-info-bg)",
});
const celda = { padding: "0.4rem 0.5rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", verticalAlign: "top" };

const lineaVacia = () => ({ itemAlmacenId: "", cantidad: "", precioUnitario: "", solicitudAlmacenId: null });

// Orden de compra: crear/editar (borrador o rechazada), validar en Finanzas
// (aprobar o rechazar; nunca quien la creó), recibir en almacén, anular y PDF.
// ordenId: abrir una existente. inicial: prellenado para una nueva
// ({ proveedorId?, items: [{ itemAlmacenId, cantidad, precioUnitario?, solicitudAlmacenId? }], proyectoId? }).
export default function OrdenCompraDrawer({ open, ordenId = null, inicial = null, onClose, onCambio, showToast }) {
  const { user } = useAuth();
  const [opciones, setOpciones] = useState(null);
  const [oc, setOc] = useState(null);
  const [f, setF] = useState(null);
  const [lineas, setLineas] = useState([]);
  const [ocupado, setOcupado] = useState(null);
  const [error, setError] = useState(null);
  const [recepcion, setRecepcion] = useState(null); // { documento, fecha, cantidades: { lineaId: "3" } }
  const [comentario, setComentario] = useState("");

  const cargarFormulario = (base) => {
    setF({
      proveedorId: base?.proveedorId ? String(base.proveedorId) : "",
      moneda: base?.moneda || "PEN",
      condicionPago: base?.condicionPago || "",
      diasCredito: base?.diasCredito ?? "",
      fechaEntrega: base?.fechaEntrega || "",
      proyectoId: base?.proyectoId ? String(base.proyectoId) : "",
      notas: base?.notas || "",
    });
    setLineas((base?.items?.length ? base.items : [lineaVacia()]).map((l) => ({
      itemAlmacenId: l.itemAlmacenId ? String(l.itemAlmacenId) : "",
      cantidad: l.cantidad != null ? String(l.cantidad) : "",
      precioUnitario: l.precioUnitario != null ? String(l.precioUnitario) : "",
      solicitudAlmacenId: l.solicitudAlmacenId || null,
    })));
  };

  useEffect(() => {
    if (!open) return;
    setError(null);
    setRecepcion(null);
    setComentario("");
    setOc(null);
    setF(null);
    if (!opciones) getOpcionesCompras().then(setOpciones).catch(() => setError("No se pudieron cargar proveedores e ítems"));
    if (ordenId) {
      getOrdenCompra(ordenId)
        .then((o) => {
          setOc(o);
          if (["BORRADOR", "RECHAZADA"].includes(o.estado)) cargarFormulario(o);
        })
        .catch((err) => setError(err.response?.data?.message || "No se pudo cargar la orden"));
    } else {
      cargarFormulario(inicial);
    }
  }, [open, ordenId]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => opciones?.items || [], [opciones]);
  const itemPorId = useMemo(() => new Map(items.map((i) => [String(i.id), i])), [items]);
  const proveedor = opciones?.proveedores.find((p) => String(p.id) === f?.proveedorId);
  const esCreador = oc && oc.creadoPorId === user?.id;
  const esFinanzas = ["ADMIN", "CONTABLE"].includes(user?.role);
  const editable = !oc || (["BORRADOR", "RECHAZADA"].includes(oc.estado) && (esCreador || user?.role === "ADMIN"));
  const M = (v, moneda = oc?.moneda || f?.moneda) => monto(v, moneda);

  // Precio propuesto del proveedor elegido para un ítem (misma moneda).
  const precioPropuesto = (itemId, provId = f?.proveedorId, moneda = f?.moneda) =>
    itemPorId.get(String(itemId))?.proveedores.find((p) => String(p.proveedorId) === String(provId) && p.moneda === moneda)?.precio;

  const set = (campo, valor) => setF((p) => ({ ...p, [campo]: valor }));
  const cambiarLinea = (i, campo, valor) => setLineas((ls) => ls.map((l, j) => {
    if (j !== i) return l;
    const nueva = { ...l, [campo]: valor };
    if (campo === "itemAlmacenId") {
      const p = precioPropuesto(valor);
      nueva.precioUnitario = p != null ? String(p) : "";
    }
    return nueva;
  }));
  const elegirProveedor = (id) => {
    const p = opciones?.proveedores.find((x) => String(x.id) === id);
    setF((prev) => ({ ...prev, proveedorId: id, condicionPago: p?.condicionPago || "CONTADO", diasCredito: p?.diasCredito ?? "" }));
    // Precios propuestos de este proveedor donde los haya.
    setLineas((ls) => ls.map((l) => {
      const precio = precioPropuesto(l.itemAlmacenId, id);
      return precio != null ? { ...l, precioUnitario: String(precio) } : l;
    }));
  };

  // Al abrir un prellenado, cuando llegan las opciones se completan precios y condición.
  useEffect(() => {
    if (!opciones || !f || oc) return;
    if (f.proveedorId && !f.condicionPago) elegirProveedor(f.proveedorId);
  }, [opciones, f?.proveedorId]); // eslint-disable-line react-hooks/exhaustive-deps

  const valorVenta = r2(lineas.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0));
  const igv = r2(valorVenta * IGV);
  const sinCotizaciones = [...new Set(lineas.map((l) => l.itemAlmacenId).filter(Boolean))]
    .map((id) => itemPorId.get(id))
    .filter((i) => i && i.proveedores.length < PROPUESTOS);
  const listo = f?.proveedorId && lineas.length && lineas.every((l) => l.itemAlmacenId && Number(l.cantidad) > 0 && l.precioUnitario !== "" && Number(l.precioUnitario) >= 0);

  const ejecutar = async (clave, accion, exito) => {
    setOcupado(clave);
    setError(null);
    try {
      const o = await accion();
      setOc(o);
      setRecepcion(null);
      if (["BORRADOR", "RECHAZADA"].includes(o.estado)) cargarFormulario(o);
      if (exito) showToast?.(typeof exito === "function" ? exito(o) : exito, "success");
      onCambio?.(o);
      return o;
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo completar la acción");
      return null;
    } finally {
      setOcupado(null);
    }
  };

  const guardar = (enviar) => ejecutar(enviar ? "enviar" : "guardar", () => guardarOrdenCompra(oc?.id, {
    proveedorId: Number(f.proveedorId), moneda: f.moneda,
    condicionPago: f.condicionPago || "CONTADO", diasCredito: f.condicionPago === "CREDITO" ? Number(f.diasCredito) : null,
    fechaEntrega: f.fechaEntrega || null, proyectoId: f.proyectoId ? Number(f.proyectoId) : null, notas: f.notas,
    items: lineas.map((l) => ({
      itemAlmacenId: Number(l.itemAlmacenId), cantidad: Number(l.cantidad), precioUnitario: Number(l.precioUnitario),
      solicitudAlmacenId: l.solicitudAlmacenId || null,
    })),
    enviar,
  }), (o) => (enviar ? `${o.numero} enviada a Finanzas para su validación` : `${o.numero} guardada como borrador`));

  const rechazar = () => {
    const motivo = prompt("Motivo del rechazo (lo verá quien creó la orden):");
    if (motivo?.trim()) ejecutar("rechazar", () => accionOrdenCompra(oc.id, "rechazar", { motivo: motivo.trim() }), `${oc.numero} rechazada`);
  };
  const anular = () => confirm(`¿Anular ${oc.numero}? No se podrá recibir ni pagar.`)
    && ejecutar("anular", () => accionOrdenCompra(oc.id, "anular"), `${oc.numero} anulada`);
  const recibir = () => ejecutar("recibir", () => accionOrdenCompra(oc.id, "recibir", {
    documento: recepcion.documento, fecha: recepcion.fecha,
    lineas: Object.entries(recepcion.cantidades).map(([id, cantidad]) => ({ id: Number(id), cantidad: Number(cantidad) || 0 })),
  }), (o) => `${o.numero}: mercadería ingresada al almacén`);
  const pdf = async () => {
    setOcupado("pdf");
    try {
      await descargarOrdenCompraPdf(oc);
    } catch {
      setError("No se pudo generar el PDF");
    } finally {
      setOcupado(null);
    }
  };

  const titulo = oc ? `Orden de compra ${oc.numero}` : "Nueva orden de compra";
  const estado = oc ? ESTADO_OC[oc.estado] : null;

  /* ── Pie con acciones según estado ── */
  let footer = <Button variant="ghost" onClick={onClose}>Cerrar</Button>;
  if (editable && f) {
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="secondary" loading={ocupado === "guardar"} disabled={!listo || !!ocupado} onClick={() => guardar(false)}>Guardar borrador</Button>
        <Button icon={Send} loading={ocupado === "enviar"} disabled={!listo || !!ocupado} onClick={() => guardar(true)}>Enviar a Finanzas</Button>
      </>
    );
  } else if (oc?.estado === "PENDIENTE" && esFinanzas && !esCreador) {
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button variant="secondary" icon={X} loading={ocupado === "rechazar"} disabled={!!ocupado} onClick={rechazar}>Rechazar</Button>
        <Button icon={Check} loading={ocupado === "aprobar"} disabled={!!ocupado}
          onClick={() => ejecutar("aprobar", () => accionOrdenCompra(oc.id, "aprobar", { comentario }), `${oc.numero} aprobada`)}>Aprobar</Button>
      </>
    );
  } else if (recepcion) {
    const algo = Object.values(recepcion.cantidades).some((c) => Number(c) > 0);
    footer = (
      <>
        <Button variant="ghost" onClick={() => setRecepcion(null)}>Cancelar recepción</Button>
        <Button icon={PackageCheck} loading={ocupado === "recibir"} disabled={!algo || !recepcion.documento.trim() || !!ocupado} onClick={recibir}>Ingresar al almacén</Button>
      </>
    );
  } else if (oc && ["APROBADA", "RECIBIDA_PARCIAL"].includes(oc.estado)) {
    footer = (
      <>
        <Button variant="ghost" onClick={onClose}>Cerrar</Button>
        <Button icon={PackageCheck} onClick={() => setRecepcion({
          documento: "", fecha: hoy(), cantidades: Object.fromEntries(oc.items.filter((l) => l.pendiente > 0).map((l) => [l.id, String(l.pendiente)])),
        })}>Recibir mercadería</Button>
      </>
    );
  }

  return (
    <Drawer open={open} onClose={onClose} wide eyebrow="Compras" title={titulo} footer={footer}>
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {oc && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Badge tone={estado[1]} dot>{estado[0]}</Badge>
            {!["BORRADOR", "ANULADA", "RECHAZADA", "PENDIENTE"].includes(oc.estado) && (
              <Badge tone={ESTADO_PAGO_OC[oc.pago.estado][1]}>{ESTADO_PAGO_OC[oc.pago.estado][0]}</Badge>
            )}
            <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
              Creada por {oc.creadoPor?.nombre} el {fechaCorta(oc.createdAt)}
              {oc.aprobadoPor && oc.estado !== "RECHAZADA" ? ` · aprobada por ${oc.aprobadoPor.nombre} el ${fechaCorta(oc.aprobadoAt)}` : ""}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: "0.4rem" }}>
              {!["BORRADOR", "ANULADA"].includes(oc.estado) && (
                <Button size="sm" variant="secondary" icon={FileDown} loading={ocupado === "pdf"} onClick={pdf}>PDF</Button>
              )}
              {["BORRADOR", "PENDIENTE", "RECHAZADA", "APROBADA"].includes(oc.estado) && (esCreador || esFinanzas) && (
                <Button size="sm" variant="ghost" icon={Ban} loading={ocupado === "anular"} disabled={!!ocupado} onClick={anular}>Anular</Button>
              )}
            </div>
          </div>
        )}

        {oc?.estado === "RECHAZADA" && (
          <div style={aviso("error")}><X size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Rechazada por {oc.aprobadoPor?.nombre || "Finanzas"}: <strong>{oc.motivoRechazo}</strong>. Corrígela y vuelve a enviarla.</span>
          </div>
        )}
        {oc?.estado === "PENDIENTE" && (esCreador || !esFinanzas) && (
          <div style={aviso("info")}><Send size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>Esperando la validación de Finanzas (Admin o Contable, distinto de quien la creó).</span>
          </div>
        )}
        {oc?.comentarioFinanzas && oc.estado !== "RECHAZADA" && (
          <div style={aviso("info")}><Check size={16} style={{ flexShrink: 0, marginTop: 2 }} /><span>Finanzas: {oc.comentarioFinanzas}</span></div>
        )}

        {/* Aviso de la regla de 3 proveedores propuestos (no bloquea). */}
        {(editable && f ? sinCotizaciones.map((i) => ({ nombre: i.nombre, propuestos: i.proveedores.length })) : oc?.estado === "PENDIENTE" ? oc.faltanCotizaciones : []).length > 0 && (
          <div style={aviso("warn")}><AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Faltan cotizaciones (la regla es proponer {PROPUESTOS} proveedores):{" "}
              {(editable && f ? sinCotizaciones.map((i) => ({ nombre: i.nombre, propuestos: i.proveedores.length })) : oc.faltanCotizaciones)
                .map((x) => `${x.nombre} (${x.propuestos}/${PROPUESTOS})`).join(", ")}.
              {" "}Se puede enviar igual; Finanzas lo verá al validarla.
            </span>
          </div>
        )}

        {editable && f ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <Field as="select" label="Proveedor" value={f.proveedorId} onChange={(e) => elegirProveedor(e.target.value)} required>
                <option value="">Selecciona proveedor</option>
                {(opciones?.proveedores || []).map((p) => <option key={p.id} value={p.id}>{p.razonSocial}{p.ruc ? ` — ${p.ruc}` : ""}</option>)}
              </Field>
              <Field as="select" label="Moneda" value={f.moneda} onChange={(e) => set("moneda", e.target.value)}>
                <option value="PEN">Soles (S/)</option>
                <option value="USD">Dólares (US$)</option>
              </Field>
              <Field as="select" label="Condición de pago" value={f.condicionPago || "CONTADO"}
                onChange={(e) => setF((p) => ({ ...p, condicionPago: e.target.value, diasCredito: e.target.value === "CREDITO" ? p.diasCredito || 30 : "" }))}>
                <option value="CONTADO">Contado</option>
                <option value="CREDITO">Crédito</option>
              </Field>
              {f.condicionPago === "CREDITO" && (
                <Field label="Días de crédito" type="number" min="1" max="365" value={f.diasCredito} onChange={(e) => set("diasCredito", e.target.value)} />
              )}
              <Field label="Fecha de entrega" type="date" min={hoy()} value={f.fechaEntrega} onChange={(e) => set("fechaEntrega", e.target.value)} />
              <Field as="select" label="Proyecto (opcional)" value={f.proyectoId} onChange={(e) => set("proyectoId", e.target.value)}>
                <option value="">Sin proyecto (stock)</option>
                {(opciones?.proyectos || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Field>
            </div>
            {proveedor && <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", marginTop: "-0.5rem" }}>Condición por defecto del proveedor: {proveedor.condicionPago === "CREDITO" ? `crédito a ${proveedor.diasCredito} días` : "contado"}</span>}

            <div style={{ display: "grid", gap: "0.6rem" }}>
              <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Ítems (precios sin IGV)</span>
              {lineas.map((l, i) => {
                const item = itemPorId.get(l.itemAlmacenId);
                const otros = (item?.proveedores || []).filter((p) => String(p.proveedorId) !== f.proveedorId);
                return (
                  <div key={i} style={{ ...caja, display: "grid", gap: "0.4rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 100px 130px auto", gap: "0.5rem", alignItems: "end" }}>
                      <Field as="select" label={`Ítem ${i + 1}`} value={l.itemAlmacenId} onChange={(e) => cambiarLinea(i, "itemAlmacenId", e.target.value)}>
                        <option value="">Selecciona ítem</option>
                        {items.map((it) => <option key={it.id} value={it.id}>{it.codigo} — {it.nombre}</option>)}
                      </Field>
                      <Field label={`Cant.${item ? ` (${item.unidad})` : ""}`} type="number" min="0" step="any" value={l.cantidad} onChange={(e) => cambiarLinea(i, "cantidad", e.target.value)} />
                      <Field label="P. unit." type="number" min="0" step="0.01" value={l.precioUnitario} onChange={(e) => cambiarLinea(i, "precioUnitario", e.target.value)} />
                      <Button variant="ghost" icon={Trash2} aria-label={`Quitar ítem ${i + 1}`} disabled={lineas.length === 1} onClick={() => setLineas((ls) => ls.filter((_, j) => j !== i))} />
                    </div>
                    {item && (
                      <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
                        Stock {item.stockActual} · subtotal {M((Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0))}
                        {otros.length ? ` · otros proveedores: ${otros.map((p) => `${p.proveedor.razonSocial} ${monto(p.precio, p.moneda)}`).join(", ")}` : ""}
                        {l.solicitudAlmacenId ? " · atiende una solicitud de almacén" : ""}
                      </span>
                    )}
                  </div>
                );
              })}
              <div><Button size="sm" variant="secondary" icon={Plus} onClick={() => setLineas((ls) => [...ls, lineaVacia()])}>Agregar ítem</Button></div>
            </div>

            <Field as="textarea" label="Notas (salen en el PDF)" rows={2} value={f.notas} onChange={(e) => set("notas", e.target.value)} />
            <div style={{ ...caja, display: "grid", gap: "0.2rem", justifySelf: "end", minWidth: 240, fontSize: "var(--text-sm)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>Valor de venta</span><span>{M(valorVenta)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span>IGV (18%)</span><span>{M(igv)}</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total</span><span>{M(valorVenta + igv)}</span></div>
            </div>
          </>
        ) : oc ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
              <div style={caja}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>Proveedor</div>
                <strong>{oc.proveedor.razonSocial}</strong>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{oc.proveedor.ruc || "Sin documento"}</div>
              </div>
              <div style={caja}>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>Condiciones</div>
                <div style={{ fontSize: "var(--text-sm)" }}>
                  {oc.condicionPago === "CREDITO" ? `Crédito a ${oc.diasCredito} días` : "Contado"} · {oc.moneda === "USD" ? "dólares" : "soles"}
                  <br />Entrega: {oc.fechaEntrega ? fechaCorta(`${oc.fechaEntrega}T12:00:00`) : "a coordinar"}
                  {oc.proyecto && <><br />Proyecto: {oc.proyecto.nombre}</>}
                </div>
              </div>
            </div>
            <div style={{ border: "1px solid var(--color-border)", borderRadius: 8, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>{["Ítem", "Cantidad", "Recibido", "P. unit.", "Subtotal"].map((h, i) => (
                    <th key={h} style={{ ...celda, textAlign: i ? "right" : "left", fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {oc.items.map((l) => (
                    <tr key={l.id}>
                      <td style={celda}>
                        <strong>{l.item.nombre}</strong>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{l.item.codigo}{l.solicitud ? " · atiende una solicitud" : ""}</div>
                      </td>
                      <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{l.cantidad} {l.item.unidad}</td>
                      <td style={{ ...celda, textAlign: "right" }}>
                        {recepcion && l.pendiente > 0 ? (
                          <input type="number" min="0" max={l.pendiente} step="any" aria-label={`Cantidad recibida de ${l.item.nombre}`}
                            value={recepcion.cantidades[l.id] ?? ""} style={{ width: 80, padding: "0.3rem", textAlign: "right" }}
                            onChange={(e) => setRecepcion((r) => ({ ...r, cantidades: { ...r.cantidades, [l.id]: e.target.value } }))} />
                        ) : (
                          <span style={{ color: l.pendiente > 0 ? "var(--color-text2)" : "var(--color-success)" }}>{l.cantidadRecibida}</span>
                        )}
                      </td>
                      <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{M(l.precioUnitario)}</td>
                      <td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap", fontWeight: 600 }}>{M(l.subtotal)}</td>
                    </tr>
                  ))}
                  <tr><td colSpan={4} style={{ ...celda, textAlign: "right" }}>Valor de venta · IGV</td><td style={{ ...celda, textAlign: "right", whiteSpace: "nowrap" }}>{M(oc.valorVenta)} · {M(oc.igv)}</td></tr>
                  <tr><td colSpan={4} style={{ ...celda, textAlign: "right", fontWeight: 700 }}>Total</td><td style={{ ...celda, textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{M(oc.total)}</td></tr>
                </tbody>
              </table>
            </div>
            {oc.notas && <p style={{ margin: 0, fontSize: "var(--text-sm)" }}><strong>Notas:</strong> {oc.notas}</p>}

            {recepcion && (
              <div style={{ ...caja, display: "grid", gap: "0.6rem", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
                <Field label="N.° de guía o factura" value={recepcion.documento} required
                  onChange={(e) => setRecepcion((r) => ({ ...r, documento: e.target.value }))} placeholder="Ej. GR 001-123" />
                <Field label="Fecha de recepción" type="date" max={hoy()} value={recepcion.fecha}
                  onChange={(e) => setRecepcion((r) => ({ ...r, fecha: e.target.value }))} />
                <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", gridColumn: "1 / -1" }}>
                  Indica en la tabla lo que llegó. Entra al stock, y se actualizan el costo del ítem y el precio de este proveedor.
                </span>
              </div>
            )}

            {oc.estado === "PENDIENTE" && esFinanzas && !esCreador && (
              <Field as="textarea" label="Comentario de Finanzas (opcional, al aprobar)" rows={2} value={comentario} onChange={(e) => setComentario(e.target.value)} />
            )}

            {oc.recepciones.length > 0 && (
              <div style={{ fontSize: "var(--text-sm)" }}>
                <strong>Recepciones en almacén</strong>
                <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                  {oc.recepciones.map((r) => <li key={r.id}>{fechaCorta(r.fecha)} · {r.notas}</li>)}
                </ul>
              </div>
            )}
            {!["BORRADOR", "PENDIENTE", "RECHAZADA", "ANULADA"].includes(oc.estado) && (
              <div style={{ fontSize: "var(--text-sm)" }}>
                <strong>Pago (vía Por pagar)</strong>
                {oc.pago.documentos.length ? (
                  <ul style={{ margin: "0.3rem 0 0", paddingLeft: "1.1rem" }}>
                    {oc.pago.documentos.map((d) => (
                      <li key={d.id}>{d.documento} · {monto(d.total, d.moneda)} · {d.estado === "PAGADO" ? "pagado" : `saldo ${monto(d.saldo, d.moneda)}`}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: "0.3rem 0 0", color: "var(--color-text3)" }}>
                    Aún sin factura. Regístrala en Por pagar y elige esta orden en "Orden de compra" para pagarla con Caja y Bancos.
                  </p>
                )}
              </div>
            )}
          </>
        ) : !error && <p style={{ color: "var(--color-text3)" }}>Cargando…</p>}

        {error && <div style={aviso("error")}>{error}</div>}
      </div>
    </Drawer>
  );
}
