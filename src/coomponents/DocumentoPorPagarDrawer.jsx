import { useEffect, useRef, useState } from "react";
import { Paperclip, Plus, Trash2, X } from "lucide-react";
import { Badge, Button, Drawer, Field } from "../components/ui";
import {
  agregarAdjuntoDocumento, eliminarAdjuntoDocumento, guardarDocumentoPorPagar, urlAdjuntoDocumento,
} from "../api/cuentas";
import { IGV_RATE } from "../config/negocio";
import { monto } from "../utils/formato";
import { ESTADO_ALMACEN, REQUIEREN_RUC, TIPO_DOC_LABEL } from "../constants/cuentas";
import { abrirConstancia } from "../utils/abrirConstancia";
import { AdjuntosPago } from "./ConstanciaPago";
import CategoriaGastoSelect from "./CategoriaGastoSelect";
import styles from "../pages/cuentas.module.scss";

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


const vacio = () => ({
  proveedorId: "", tipoDocumento: "FACTURA", serie: "", numero: "", fechaEmision: hoy(), moneda: "PEN", tipoCambio: "",
  total: "", igv: "", igvManual: false, detraccionMonto: "", retencionMonto: "", categoriaGastoId: "", descripcion: "",
  formaPago: "CONTADO", proyectoId: "", ordenAlmacenId: "", movimientoAlmacenId: "", pasaPorAlmacen: true,
});

// Valores que se precargan al elegir un proveedor: condición de pago, categoría
// por defecto y, si no tiene RUC, el tipo "Nota de venta".
function valoresDeProveedor(p, prev = {}) {
  if (!p) return {};
  return {
    formaPago: p.condicionPago || "CONTADO",
    ...(p.categoriaGastoId && { categoriaGastoId: String(p.categoriaGastoId) }),
    ...(p.tipoDocIdentidad !== "RUC" && REQUIEREN_RUC.includes(prev.tipoDocumento || "FACTURA") && { tipoDocumento: "NOTA_VENTA" }),
    pasaPorAlmacen: p.tipo === "PRODUCTO",
  };
}

// Registrar o editar un documento por pagar. documento: null = cerrado, {} = nuevo.
// Con pagos registrados el backend solo acepta cambios de descripción, categoría y vínculos.
export default function DocumentoPorPagarDrawer({ documento, proveedores, opciones, onClose, onGuardado, onNuevoProveedor, showToast }) {
  const [f, setF] = useState(vacio());
  const [cuotas, setCuotas] = useState([]);
  const [adjuntos, setAdjuntos] = useState([]);
  const [archivo, setArchivo] = useState(null); // foto elegida para un documento nuevo
  const inputArchivo = useRef(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);
  const editando = !!documento?.id;
  const conPagos = editando && documento.pagos?.length > 0;

  useEffect(() => {
    if (!documento) return;
    const base = vacio();
    if (documento.id) {
      Object.assign(base, {
        ...Object.fromEntries(Object.keys(base).map((k) => [k, documento[k] ?? base[k]])),
        fechaEmision: String(documento.fechaEmision).slice(0, 10),
        igvManual: true,
      });
      for (const k of ["proveedorId", "proyectoId", "ordenAlmacenId", "movimientoAlmacenId", "total", "igv", "detraccionMonto", "retencionMonto", "tipoCambio", "categoriaGastoId"]) {
        base[k] = documento[k] == null ? "" : String(documento[k]);
      }
      setCuotas((documento.cuotas || []).map((q) => ({ monto: String(q.monto), fechaVencimiento: q.fechaVencimiento })));
    } else {
      if (documento.proveedorId) {
        const p = proveedores.find((x) => x.id === documento.proveedorId);
        Object.assign(base, valoresDeProveedor(p));
        base.proveedorId = String(documento.proveedorId);
      }
      setCuotas([]);
    }
    setF(base);
    setAdjuntos(documento.adjuntos || []);
    setArchivo(null);
    setError(null);
  }, [documento]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (campo, valor) => setF((p) => ({ ...p, [campo]: valor }));
  const proveedor = proveedores.find((p) => String(p.id) === String(f.proveedorId));
  const total = Number(f.total) || 0;
  const notaVenta = f.tipoDocumento === "NOTA_VENTA";
  const sinRuc = proveedor && proveedor.tipoDocIdentidad !== "RUC";
  const igvAuto = ["RECIBO_HONORARIOS", "NOTA_VENTA"].includes(f.tipoDocumento) ? 0 : r2(total - total / (1 + IGV_RATE));
  const igv = notaVenta ? 0 : f.igvManual && f.igv !== "" ? Number(f.igv) : igvAuto;
  const detraccionMoneda = f.moneda === "PEN" ? Number(f.detraccionMonto) || 0 : r2((Number(f.detraccionMonto) || 0) / (Number(f.tipoCambio) || 1));
  const neto = r2(total - detraccionMoneda - (Number(f.retencionMonto) || 0));
  const M = (v) => monto(v, f.moneda);
  const sumaCuotas = r2(cuotas.reduce((a, q) => a + (Number(q.monto) || 0), 0));

  // Al elegir proveedor se precargan su condición de pago y su categoría; sin RUC, pasa a nota de venta.
  const elegirProveedor = (id) => {
    const p = proveedores.find((x) => String(x.id) === String(id));
    setF((prev) => ({ ...prev, proveedorId: id, ...valoresDeProveedor(p, prev) }));
    setCuotas([]);
  };

  useEffect(() => {
    if (f.formaPago === "CREDITO" && cuotas.length === 0 && neto > 0 && !conPagos) {
      setCuotas([{ monto: String(neto), fechaVencimiento: sumarDias(f.fechaEmision || hoy(), proveedor?.diasCredito || 30) }]);
    }
  }, [f.formaPago, f.fechaEmision, cuotas.length, neto, proveedor, conPagos]);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      let c = await guardarDocumentoPorPagar(documento.id, {
        proveedorId: Number(f.proveedorId), tipoDocumento: f.tipoDocumento, serie: f.serie, numero: f.numero,
        fechaEmision: f.fechaEmision, moneda: f.moneda, tipoCambio: f.moneda === "USD" ? Number(f.tipoCambio) || undefined : undefined,
        total, igv, detraccionMonto: Number(f.detraccionMonto) || null, retencionMonto: Number(f.retencionMonto) || null,
        categoriaGastoId: f.categoriaGastoId ? Number(f.categoriaGastoId) : null, descripcion: f.descripcion, formaPago: f.formaPago,
        pasaPorAlmacen: f.pasaPorAlmacen,
        cuotas: f.formaPago === "CREDITO" ? cuotas.map((q) => ({ monto: Number(q.monto), fechaVencimiento: q.fechaVencimiento })) : undefined,
        proyectoId: f.proyectoId ? Number(f.proyectoId) : null,
        ordenAlmacenId: f.ordenAlmacenId ? Number(f.ordenAlmacenId) : null,
        movimientoAlmacenId: f.movimientoAlmacenId ? Number(f.movimientoAlmacenId) : null,
      });
      // Foto del documento nuevo: se sube una vez creado; si falla, el documento ya quedó guardado.
      if (archivo) {
        try {
          c = await agregarAdjuntoDocumento(c.id, archivo);
        } catch (err) {
          showToast(`${c.documento} guardado, pero no se pudo subir el archivo: ${err.response?.data?.message || "error"}`);
        }
      }
      showToast(`${c.documento} guardado`, "success");
      onGuardado?.(c);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar el documento");
    } finally {
      setGuardando(false);
    }
  };

  const bloqueado = conPagos; // montos y datos del documento ya no cambian

  const enAdjunto = async (accion, mensajeError) => {
    setError(null);
    try {
      await accion();
    } catch (err) {
      setError(err.response?.data?.message || mensajeError);
    }
  };
  const actualizarAdjuntos = (c) => {
    setAdjuntos(c.adjuntos || []);
    onGuardado?.(c);
  };

  return (
    <Drawer
      open={!!documento}
      onClose={onClose}
      wide
      eyebrow="Cuentas por pagar"
      title={editando ? `Documento ${documento.documento}` : "Registrar documento de proveedor"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando} disabled={!f.proveedorId || (!notaVenta && (!f.serie || !f.numero)) || !total}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        {bloqueado && (
          <p className={styles.sub} style={{ margin: 0 }}>Tiene pagos registrados: solo se puede cambiar la categoría, la descripción y los vínculos.</p>
        )}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field as="select" label="Proveedor" value={f.proveedorId} disabled={bloqueado} onChange={(e) => elegirProveedor(e.target.value)} required>
              <option value="">Selecciona proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.razonSocial} — {p.ruc || "sin documento"}</option>)}
            </Field>
          </div>
          {!bloqueado && <Button variant="secondary" icon={Plus} onClick={onNuevoProveedor}>Nuevo</Button>}
        </div>

        <div className={styles.grid2}>
          <Field as="select" label="Tipo" value={f.tipoDocumento} disabled={bloqueado} onChange={(e) => set("tipoDocumento", e.target.value)}>
            {(opciones?.tiposDocumento || Object.keys(TIPO_DOC_LABEL))
              .filter((t) => !sinRuc || !REQUIEREN_RUC.includes(t))
              .map((t) => <option key={t} value={t}>{TIPO_DOC_LABEL[t]}</option>)}
          </Field>
          <Field label="Serie" value={f.serie} maxLength={4} disabled={bloqueado} placeholder={notaVenta ? "NV" : undefined}
            onChange={(e) => set("serie", e.target.value.toUpperCase())} required={!notaVenta} />
          <Field label="Número" value={f.numero} disabled={bloqueado} placeholder={notaVenta ? "Opcional" : undefined}
            onChange={(e) => set("numero", e.target.value)} required={!notaVenta} />
          <Field label="Fecha de emisión" type="date" max={hoy()} value={f.fechaEmision} disabled={bloqueado} onChange={(e) => set("fechaEmision", e.target.value)} />
        </div>

        <div className={styles.grid2}>
          <Field as="select" label="Moneda" value={f.moneda} disabled={bloqueado} onChange={(e) => set("moneda", e.target.value)}>
            <option value="PEN">Soles</option>
            <option value="USD">Dólares</option>
          </Field>
          {f.moneda === "USD" && (
            <Field label="Tipo de cambio" type="number" step="any" value={f.tipoCambio} disabled={bloqueado}
              hint="Vacío = venta SUNAT de la fecha" onChange={(e) => set("tipoCambio", e.target.value)} />
          )}
          <Field label="Total" type="number" step="any" min="0" value={f.total} disabled={bloqueado}
            onChange={(e) => { set("total", e.target.value); setCuotas([]); }} required />
          {notaVenta ? (
            <p className={styles.sub} style={{ alignSelf: "center", margin: 0 }}>
              Nota de venta: sin IGV ni crédito fiscal; el gasto queda como <strong>no deducible</strong>.
            </p>
          ) : (
            <Field label="IGV" type="number" step="any" min="0" value={f.igvManual ? f.igv : String(igvAuto)} disabled={bloqueado}
              hint={f.igvManual ? "Editado" : "Calculado (18% incluido)"} onChange={(e) => setF((p) => ({ ...p, igv: e.target.value, igvManual: true }))} />
          )}
        </div>

        <div className={styles.grid2}>
          <Field label="Detracción (S/)" type="number" step="any" min="0" value={f.detraccionMonto} disabled={bloqueado}
            hint="La depositas en su cuenta del Banco de la Nación" onChange={(e) => { set("detraccionMonto", e.target.value); setCuotas([]); }} />
          <Field label="Retención" type="number" step="any" min="0" value={f.retencionMonto} disabled={bloqueado}
            hint={f.tipoDocumento === "RECIBO_HONORARIOS" ? "Renta de 4.ª: 8% si supera S/ 1 500" : "Opcional"}
            onChange={(e) => { set("retencionMonto", e.target.value); setCuotas([]); }} />
          <div style={{ alignSelf: "center", fontSize: "var(--text-sm)" }}>
            Neto a pagar al proveedor: <strong>{M(neto)}</strong>
          </div>
        </div>

        <div style={{ display: "grid", gap: "0.5rem" }}>
          <Field as="select" label="Forma de pago" value={f.formaPago} disabled={bloqueado}
            hint={proveedor?.condicionPago === "CREDITO" ? `Condición del proveedor: crédito a ${proveedor.diasCredito} días` : undefined}
            onChange={(e) => { set("formaPago", e.target.value); setCuotas([]); }}>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </Field>
          {f.formaPago === "CREDITO" && (
            <>
              {cuotas.map((q, i) => (
                <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ width: 70 }}>Cuota {i + 1}</span>
                  <input style={inputCelda} type="number" step="any" value={q.monto} disabled={bloqueado}
                    onChange={(e) => setCuotas((p) => p.map((x, j) => (j === i ? { ...x, monto: e.target.value } : x)))} />
                  <input style={inputCelda} type="date" value={q.fechaVencimiento} disabled={bloqueado}
                    onChange={(e) => setCuotas((p) => p.map((x, j) => (j === i ? { ...x, fechaVencimiento: e.target.value } : x)))} />
                  <Button size="sm" variant="ghost" icon={Trash2} aria-label="Quitar cuota" disabled={bloqueado || cuotas.length === 1}
                    onClick={() => setCuotas((p) => p.filter((_, j) => j !== i))} />
                </div>
              ))}
              {!bloqueado && (
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  <Button size="sm" variant="ghost" icon={Plus}
                    onClick={() => setCuotas((p) => [...p, { monto: "0", fechaVencimiento: sumarDias(f.fechaEmision, 30 * (p.length + 1)) }])}>
                    Agregar cuota
                  </Button>
                  <span style={{ fontSize: "var(--text-xs)", color: Math.abs(sumaCuotas - neto) > 0.009 ? "var(--badge-red-text)" : "var(--color-text3)" }}>
                    Cuotas: {M(sumaCuotas)} de {M(neto)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.grid2}>
          <CategoriaGastoSelect categorias={opciones?.categorias} value={f.categoriaGastoId} onChange={(v) => set("categoriaGastoId", v)}
            actual={documento?.categoriaGasto} label="Categoría" />
          <Field as="select" label="Proyecto (opcional)" value={f.proyectoId} onChange={(e) => set("proyectoId", e.target.value)}>
            <option value="">Sin proyecto</option>
            {(opciones?.proyectos || []).map((p) => <option key={p.id} value={p.id}>{p.nombre}{p.cliente ? ` — ${p.cliente}` : ""}</option>)}
          </Field>
        </div>
        <div className={styles.grid2}>
          <Field as="select" label="Orden de entrada de almacén (opcional)" value={f.ordenAlmacenId} onChange={(e) => set("ordenAlmacenId", e.target.value)}>
            <option value="">Ninguna</option>
            {(opciones?.ordenesAlmacen || []).map((o) => <option key={o.id} value={o.id}>#{o.id} · {o.fecha} · {o.resumen}</option>)}
          </Field>
          <Field as="select" label="Entrada suelta de almacén (opcional)" value={f.movimientoAlmacenId} onChange={(e) => set("movimientoAlmacenId", e.target.value)}>
            <option value="">Ninguna</option>
            {(opciones?.movimientosAlmacen || []).map((m) => <option key={m.id} value={m.id}>{m.fecha} · {m.resumen}</option>)}
          </Field>
        </div>
        {proveedor?.tipo === "PRODUCTO" && (
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", fontSize: "var(--text-sm)" }}>
            <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input type="checkbox" checked={f.pasaPorAlmacen} onChange={(e) => set("pasaPorAlmacen", e.target.checked)} />
              La mercadería pasa por almacén
            </label>
            {editando && documento.estadoAlmacen && f.pasaPorAlmacen && (
              <Badge tone={ESTADO_ALMACEN[documento.estadoAlmacen][1]}>{ESTADO_ALMACEN[documento.estadoAlmacen][0]}</Badge>
            )}
            <span className={styles.sub}>
              {f.pasaPorAlmacen
                ? "Queda como INGRESO PENDIENTE hasta vincular la entrada; si es para un proyecto, como SALIDA PENDIENTE hasta despacharla."
                : "Entrega directa: no se controla ingreso ni salida."}
            </span>
          </div>
        )}
        <Field as="textarea" label="Descripción" rows={2} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} />

        <div style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Foto o PDF del documento{notaVenta ? " (recomendado en notas de venta)" : ""}</span>
          {editando ? (
            <AdjuntosPago
              adjuntos={adjuntos}
              etiqueta="Adjuntar archivo"
              onAbrir={(a) => enAdjunto(() => abrirConstancia(() => urlAdjuntoDocumento(documento.id, a.id)), "No se pudo abrir el archivo")}
              onEliminar={(a) => confirm(`¿Quitar ${a.nombre}?`) && enAdjunto(async () => actualizarAdjuntos(await eliminarAdjuntoDocumento(documento.id, a.id)), "No se pudo quitar el archivo")}
              onAgregar={(file) => enAdjunto(async () => actualizarAdjuntos(await agregarAdjuntoDocumento(documento.id, file)), "No se pudo adjuntar el archivo")}
            />
          ) : (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <input ref={inputArchivo} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden
                onChange={(e) => { setArchivo(e.target.files?.[0] || null); e.target.value = ""; }} />
              {archivo ? (
                <>
                  <span className={styles.sub}><Paperclip size={12} /> {archivo.name}</span>
                  <Button size="sm" variant="ghost" icon={X} onClick={() => setArchivo(null)}>Quitar</Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" icon={Paperclip} onClick={() => inputArchivo.current.click()}>Elegir archivo</Button>
              )}
            </div>
          )}
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Drawer>
  );
}
