import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, Drawer, Field } from "../components/ui";
import { consultarDocumento } from "../api/comprobantes";
import { guardarProveedorCompra } from "../api/cuentas";
import styles from "../pages/cuentas.module.scss";

const vacio = {
  ruc: "", razonSocial: "", nombreComercial: "", direccion: "", contacto: "", telefono: "", email: "",
  banco: "", numeroCuenta: "", cci: "", condicionPago: "CONTADO", diasCredito: "", activo: true,
};

// Alta y edición de proveedores de compras y servicios (no arrendadores de paneles).
// proveedor: null = cerrado, {} = nuevo, { id, ... } = editar.
export default function ProveedorCompraDrawer({ proveedor, onClose, onGuardado, showToast }) {
  const [f, setF] = useState(vacio);
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!proveedor) return;
    setF(Object.fromEntries(Object.entries(vacio).map(([k, v]) => [k, proveedor[k] ?? v])));
    setError(null);
  }, [proveedor]);

  const set = (campo, valor) => setF((p) => ({ ...p, [campo]: valor }));

  const buscar = async () => {
    setBuscando(true);
    setError(null);
    try {
      const r = await consultarDocumento(f.ruc.trim());
      setF((p) => ({ ...p, ruc: r.numDoc, razonSocial: r.nombre || p.razonSocial, direccion: r.direccion || p.direccion }));
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo consultar el RUC");
    } finally {
      setBuscando(false);
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const p = await guardarProveedorCompra(proveedor.id, {
        ...f, diasCredito: f.condicionPago === "CREDITO" ? Number(f.diasCredito) : null,
      });
      showToast(`Proveedor ${p.razonSocial} guardado`, "success");
      onGuardado?.(p);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "No se pudo guardar el proveedor");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Drawer
      open={!!proveedor}
      onClose={onClose}
      eyebrow="Cuentas por pagar"
      title={proveedor?.id ? "Editar proveedor" : "Nuevo proveedor"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={guardar} loading={guardando} disabled={!f.ruc || !f.razonSocial}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <Field label="RUC (o DNI)" value={f.ruc} onChange={(e) => set("ruc", e.target.value)} required />
          </div>
          <Button variant="secondary" icon={Search} loading={buscando} disabled={!/^\d{8}$|^\d{11}$/.test(f.ruc.trim())} onClick={buscar}>Buscar</Button>
        </div>
        <Field label="Razón social" value={f.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} required />
        <Field label="Nombre comercial" value={f.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} />
        <Field label="Dirección" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} />
        <div className={styles.grid2}>
          <Field label="Contacto" value={f.contacto} onChange={(e) => set("contacto", e.target.value)} />
          <Field label="Teléfono" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} />
          <Field label="Correo" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className={styles.grid2}>
          <Field label="Banco" value={f.banco} onChange={(e) => set("banco", e.target.value)} />
          <Field label="N.° de cuenta" value={f.numeroCuenta} onChange={(e) => set("numeroCuenta", e.target.value)} />
          <Field label="CCI" value={f.cci} onChange={(e) => set("cci", e.target.value)} />
        </div>
        <div className={styles.grid2}>
          <Field as="select" label="Condición de pago" value={f.condicionPago}
            onChange={(e) => setF((p) => ({ ...p, condicionPago: e.target.value, diasCredito: e.target.value === "CREDITO" ? p.diasCredito || 30 : "" }))}>
            <option value="CONTADO">Contado</option>
            <option value="CREDITO">Crédito</option>
          </Field>
          {f.condicionPago === "CREDITO" && (
            <Field label="Días de crédito" type="number" min="1" max="365" value={f.diasCredito} onChange={(e) => set("diasCredito", e.target.value)} />
          )}
        </div>
        {proveedor?.id && (
          <label style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <input type="checkbox" checked={f.activo} onChange={(e) => set("activo", e.target.checked)} /> Activo
          </label>
        )}
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </Drawer>
  );
}
