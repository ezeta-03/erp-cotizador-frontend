import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Drawer, Field } from "../components/ui";
import { getOpcionesCompras, guardarProveedoresItem } from "../api/compras";

const PROPUESTOS = 3;
const fecha = (iso) => (iso ? new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "");
const fila = (p = {}) => ({ proveedorId: p.proveedorId ? String(p.proveedorId) : "", precio: p.precio != null ? String(p.precio) : "", moneda: p.moneda || "PEN", fechaPrecio: p.fechaPrecio, origen: p.origen });

// Proveedores propuestos de un ítem de almacén (la regla es proponer 3) con su
// último precio unitario sin IGV. item: null = cerrado. El precio se actualiza
// solo al recibir una orden de compra.
export default function ProveedoresItemDrawer({ item, onClose, onGuardado, showToast }) {
  const [proveedores, setProveedores] = useState(null);
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!item) return;
    setFilas((item.proveedores || []).map(fila));
    setError(null);
    if (!proveedores) getOpcionesCompras().then((o) => setProveedores(o.proveedores)).catch(() => setProveedores([]));
  }, [item]); // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (i, campo, valor) => setFilas((f) => f.map((x, j) => (j === i ? { ...x, [campo]: valor } : x)));
  const elegidos = new Set(filas.map((f) => f.proveedorId));

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const lista = await guardarProveedoresItem(item.id, filas
        .filter((f) => f.proveedorId)
        .map((f) => ({ proveedorId: Number(f.proveedorId), precio: Number(f.precio), moneda: f.moneda })));
      showToast?.(`Proveedores de ${item.nombre} guardados`, "success");
      onGuardado?.(item.id, lista);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudieron guardar los proveedores");
    } finally {
      setGuardando(false);
    }
  };

  const completos = filas.filter((f) => f.proveedorId).length;

  return (
    <Drawer
      open={!!item}
      onClose={onClose}
      eyebrow="Almacén · proveedores propuestos"
      title={item ? `${item.codigo} — ${item.nombre}` : ""}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando}
            disabled={filas.some((f) => f.proveedorId && !(Number(f.precio) >= 0 && f.precio !== ""))}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text2)" }}>
          La regla es proponer {PROPUESTOS} proveedores con su precio unitario <strong>sin IGV</strong>.
          Al recibir una orden de compra se actualiza el precio del proveedor elegido.{" "}
          {completos < PROPUESTOS
            ? <Badge tone="yellow">Faltan {PROPUESTOS - completos}</Badge>
            : <Badge tone="green">Completo</Badge>}
        </p>
        {filas.map((f, i) => (
          <div key={i} style={{ display: "grid", gap: "0.4rem", padding: "0.7rem 0.75rem", border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Field as="select" label={`Proveedor ${i + 1}`} value={f.proveedorId} onChange={(e) => cambiar(i, "proveedorId", e.target.value)}>
                  <option value="">Selecciona proveedor</option>
                  {(proveedores || [])
                    .filter((p) => String(p.id) === f.proveedorId || !elegidos.has(String(p.id)))
                    .map((p) => <option key={p.id} value={p.id}>{p.razonSocial}{p.ruc ? ` — ${p.ruc}` : ""}</option>)}
                </Field>
              </div>
              <Button variant="ghost" icon={Trash2} aria-label={`Quitar proveedor ${i + 1}`} onClick={() => setFilas((x) => x.filter((_, j) => j !== i))} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: "0.5rem" }}>
              <Field label="Precio unitario (sin IGV)" type="number" min="0" step="0.01" value={f.precio} onChange={(e) => cambiar(i, "precio", e.target.value)} />
              <Field as="select" label="Moneda" value={f.moneda} onChange={(e) => cambiar(i, "moneda", e.target.value)}>
                <option value="PEN">S/</option>
                <option value="USD">US$</option>
              </Field>
            </div>
            {f.fechaPrecio && (
              <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
                Precio del {fecha(f.fechaPrecio)}{f.origen === "COMPRA" ? " · actualizado por una compra" : ""}
              </span>
            )}
          </div>
        ))}
        {filas.length < PROPUESTOS && (
          <div><Button variant="secondary" icon={Plus} onClick={() => setFilas((f) => [...f, fila()])}>Agregar proveedor</Button></div>
        )}
        {proveedores && proveedores.length === 0 && (
          <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>No hay proveedores registrados. Se crean en Por pagar → Proveedores.</span>
        )}
        {error && <div style={{ color: "var(--color-danger)", fontSize: "var(--text-sm)" }}>{error}</div>}
      </div>
    </Drawer>
  );
}
