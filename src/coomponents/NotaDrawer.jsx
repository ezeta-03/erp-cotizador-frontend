import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Drawer, Field } from "../components/ui";
import { emitirNota, getComprobante, getOpcionesComprobante } from "../api/comprobantes";
import { IGV_RATE } from "../config/negocio";
import { monto } from "../utils/formato";

const UNIDADES = [["NIU", "Unidad"], ["ZZ", "Servicio"], ["MTK", "m²"], ["MTR", "Metro"], ["KGM", "Kg"]];
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const celda = { padding: "0.25rem", verticalAlign: "top" };
const inputCelda = {
  width: "100%", padding: "0.4rem", border: "1px solid var(--color-input-border)",
  borderRadius: 6, background: "var(--color-input-bg)", font: "inherit",
};

// Nota de crédito (anulación total, devolución, descuento) o de débito
// (intereses, aumento de valor, penalidades) sobre una factura o boleta.
// nota: { comprobanteId, tipo: "NOTA_CREDITO" | "NOTA_DEBITO" } o null.
export default function NotaDrawer({ nota, onClose, onEmitida, showToast }) {
  const [ref, setRef] = useState(null);
  const [opciones, setOpciones] = useState(null);
  const [motivo, setMotivo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [items, setItems] = useState([]);
  const [emitiendo, setEmitiendo] = useState(false);
  const [error, setError] = useState(null);

  const esCredito = nota?.tipo === "NOTA_CREDITO";

  useEffect(() => {
    if (!nota) return;
    setRef(null);
    setError(null);
    Promise.all([getComprobante(nota.comprobanteId), getOpcionesComprobante()])
      .then(([c, ops]) => {
        setRef(c);
        setOpciones(ops);
        const primero = Object.keys(ops.motivosNota[nota.tipo])[0];
        setMotivo(primero);
        setDescripcion(ops.motivosNota[nota.tipo][primero]);
        setItems(nota.tipo === "NOTA_CREDITO"
          ? c.items.map((it) => ({ cantidad: String(it.cantidad), unidad: it.unidad, descripcion: it.descripcion, valorUnitario: String(it.valorUnitario) }))
          : [{ cantidad: "1", unidad: "ZZ", descripcion: "", valorUnitario: "" }]);
      })
      .catch((err) => setError(err.response?.data?.message || "No se pudo cargar el comprobante"));
  }, [nota]);

  const motivos = opciones?.motivosNota[nota?.tipo] || {};
  const total = esCredito && opciones?.motivosNotaCreditoTotal.includes(motivo);
  const totales = useMemo(() => {
    const valorVenta = r2(items.reduce((a, it) => a + r2((Number(it.cantidad) || 0) * (Number(it.valorUnitario) || 0)), 0));
    const igv = r2(valorVenta * IGV_RATE);
    return { valorVenta, igv, total: r2(valorVenta + igv) };
  }, [items]);
  const yaAcreditado = r2((ref?.notasCredito || [])
    .filter((n) => n.tipo === "NOTA_CREDITO" && n.estado !== "RECHAZADO")
    .reduce((a, n) => a + n.total, 0));

  const cambiarMotivo = (m) => {
    setMotivo(m);
    setDescripcion(motivos[m]);
  };
  const cambiarItem = (i, campo, valor) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)));

  const emitir = async () => {
    const nombre = esCredito ? "nota de crédito" : "nota de débito";
    const importe = total ? ref.total : totales.total;
    if (!confirm(`¿Emitir ${nombre} por ${monto(importe, ref.moneda)} sobre ${ref.numero}? Se enviará a SUNAT.`)) return;
    setEmitiendo(true);
    setError(null);
    try {
      const c = await emitirNota(ref.id, nota.tipo, {
        motivoCodigo: motivo,
        motivoDescripcion: descripcion,
        items: total ? undefined : items.map((it) => ({ ...it, cantidad: Number(it.cantidad), valorUnitario: Number(it.valorUnitario) })),
      });
      if (c.estado === "ACEPTADO") showToast(`${c.numero} aceptada por SUNAT`, "success");
      else showToast(`${c.numero}: ${c.estado}. ${c.sunatMensaje || ""}`);
      onEmitida();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo emitir la nota");
    } finally {
      setEmitiendo(false);
    }
  };

  return (
    <Drawer
      open={!!nota}
      onClose={onClose}
      wide
      eyebrow={ref ? `Sobre ${ref.numero} — ${ref.clienteNombre}` : "Nota"}
      title={esCredito ? "Nota de crédito" : "Nota de débito"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant={esCredito ? "danger" : "primary"} onClick={emitir} loading={emitiendo} disabled={!ref}>Emitir a SUNAT</Button>
        </>
      }
    >
      {!ref ? <p>{error || "Cargando…"}</p> : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: "1rem" }}>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--color-text3)" }}>
            Comprobante por {monto(ref.total, ref.moneda)}
            {esCredito && yaAcreditado > 0 && <> · ya acreditado {monto(yaAcreditado, ref.moneda)} · disponible {monto(r2(ref.total - yaAcreditado), ref.moneda)}</>}
          </div>
          <Field as="select" label="Motivo" value={motivo} onChange={(e) => cambiarMotivo(e.target.value)}>
            {Object.entries(motivos).map(([cod, desc]) => (
              <option key={cod} value={cod} disabled={esCredito && yaAcreditado > 0 && opciones.motivosNotaCreditoTotal.includes(cod)}>
                {cod} — {desc}{opciones.motivosNotaCreditoTotal.includes(cod) && esCredito ? " (anula todo)" : ""}
              </option>
            ))}
          </Field>
          <Field label="Sustento (aparece en la nota)" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />

          {total ? (
            <div style={{ padding: "0.75rem", background: "var(--color-input-bg)", borderRadius: 8 }}>
              Anula el comprobante completo: se copian sus {ref.items.length} ítems por {monto(ref.total, ref.moneda)}.
            </div>
          ) : (
            <div>
              <strong>Ítems de la nota</strong>
              <span style={{ color: "var(--color-text3)", fontSize: "var(--text-xs)" }}>
                {" "}— {esCredito ? "deja solo lo devuelto o descontado, con su valor sin IGV" : "el cargo adicional, valor sin IGV"}
              </span>
              <table style={{ width: "100%", minWidth: 0, borderCollapse: "collapse", marginTop: "0.5rem" }}>
                <thead>
                  <tr style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)", textAlign: "left" }}>
                    <th style={{ ...celda, width: 70 }}>Cant.</th>
                    <th style={{ ...celda, width: 95 }}>Unidad</th>
                    <th style={celda}>Descripción</th>
                    <th style={{ ...celda, width: 90 }}>V. unit.</th>
                    <th style={{ ...celda, width: 32 }} />
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td style={celda}><input style={inputCelda} type="number" min="0" step="any" value={it.cantidad} onChange={(e) => cambiarItem(i, "cantidad", e.target.value)} /></td>
                      <td style={celda}>
                        <select style={inputCelda} value={it.unidad} onChange={(e) => cambiarItem(i, "unidad", e.target.value)}>
                          {UNIDADES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td style={celda}><textarea style={{ ...inputCelda, resize: "vertical" }} rows={2} value={it.descripcion} onChange={(e) => cambiarItem(i, "descripcion", e.target.value)} /></td>
                      <td style={celda}><input style={inputCelda} type="number" min="0" step="any" value={it.valorUnitario} onChange={(e) => cambiarItem(i, "valorUnitario", e.target.value)} /></td>
                      <td style={celda}>
                        <Button size="sm" variant="ghost" icon={Trash2} aria-label="Quitar ítem" disabled={items.length === 1}
                          onClick={() => setItems((p) => p.filter((_, j) => j !== i))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Button size="sm" variant="ghost" icon={Plus}
                onClick={() => setItems((p) => [...p, { cantidad: "1", unidad: "ZZ", descripcion: "", valorUnitario: "" }])}>Agregar ítem</Button>
              <div style={{ display: "grid", gap: "0.25rem", padding: "0.75rem", background: "var(--color-input-bg)", borderRadius: 8, marginTop: "0.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Valor venta</span><span>{monto(totales.valorVenta, ref.moneda)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>IGV</span><span>{monto(totales.igv, ref.moneda)}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>Total de la nota</span><span>{monto(totales.total, ref.moneda)}</span></div>
              </div>
            </div>
          )}

          {error && <div style={{ color: "var(--badge-red-text)", background: "var(--color-danger-bg)", padding: "0.5rem 0.75rem", borderRadius: 6 }}>{error}</div>}
        </div>
      )}
    </Drawer>
  );
}
