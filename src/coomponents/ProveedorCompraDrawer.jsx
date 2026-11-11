import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button, Drawer, Field } from "../components/ui";
import { consultarDocumento } from "../api/comprobantes";
import { getLineasNegocio, guardarProveedorCompra } from "../api/cuentas";
import CategoriaGastoSelect from "./CategoriaGastoSelect";
import styles from "../pages/cuentas.module.scss";

const vacio = {
  tipoDocIdentidad: "RUC", ruc: "", razonSocial: "", nombreComercial: "", direccion: "", contacto: "", telefono: "", email: "",
  banco: "", numeroCuenta: "", cci: "", condicionPago: "CONTADO", diasCredito: "", activo: true,
  tipo: "PRODUCTO", afectaComercializacion: true, categoriaGastoId: "",
};
const LARGO_DOC = { RUC: 11, DNI: 8 };
const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Alta y edición de proveedores de compras y servicios (no arrendadores de paneles).
// proveedor: null = cerrado, {} = nuevo, { id, ... } = editar. Sin documento
// (vendedor informal) solo sirve para notas de venta.
export default function ProveedorCompraDrawer({ proveedor, categorias, onClose, onGuardado, showToast }) {
  const [f, setF] = useState(vacio);
  // Reparto entre líneas de negocio: { [lineaNegocioId]: "40" }
  const [lineas, setLineas] = useState([]);
  const [reparto, setReparto] = useState({});
  const [buscando, setBuscando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!proveedor) return;
    setF(Object.fromEntries(Object.entries(vacio).map(([k, v]) => [k, proveedor[k] ?? v])));
    if (proveedor.categoriaGastoId) setF((p) => ({ ...p, categoriaGastoId: String(proveedor.categoriaGastoId) }));
    setReparto(Object.fromEntries((proveedor.lineasNegocio || []).map((l) => [l.lineaNegocioId, String(l.porcentaje)])));
    setError(null);
    getLineasNegocio().then(setLineas).catch(() => setLineas([]));
  }, [proveedor]);

  // Activas, más las inactivas que este proveedor ya usa.
  const lineasVisibles = lineas.filter((l) => l.activo || reparto[l.id]);
  const sumaReparto = r2(Object.values(reparto).reduce((a, v) => a + (Number(v) || 0), 0));
  const repartoValido = sumaReparto === 0 || Math.abs(sumaReparto - 100) < 0.01;

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
        ...f,
        ruc: f.tipoDocIdentidad === "NINGUNO" ? null : f.ruc.trim(),
        diasCredito: f.condicionPago === "CREDITO" ? Number(f.diasCredito) : null,
        categoriaGastoId: f.categoriaGastoId ? Number(f.categoriaGastoId) : null,
        lineasNegocio: Object.entries(reparto)
          .filter(([, v]) => Number(v) > 0)
          .map(([id, v]) => ({ lineaNegocioId: Number(id), porcentaje: Number(v) })),
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
          <Button onClick={guardar} loading={guardando} disabled={(f.tipoDocIdentidad !== "NINGUNO" && !f.ruc) || !f.razonSocial || !repartoValido}>Guardar</Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: "0.9rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ width: 150 }}>
            <Field as="select" label="Documento" value={f.tipoDocIdentidad}
              onChange={(e) => setF((p) => ({ ...p, tipoDocIdentidad: e.target.value, ruc: e.target.value === "NINGUNO" ? "" : p.ruc }))}>
              <option value="RUC">RUC</option>
              <option value="DNI">DNI</option>
              <option value="NINGUNO">Sin documento</option>
            </Field>
          </div>
          {f.tipoDocIdentidad !== "NINGUNO" && (
            <>
              <div style={{ flex: 1, minWidth: 140 }}>
                <Field label={`N.° de ${f.tipoDocIdentidad}`} value={f.ruc} inputMode="numeric" maxLength={LARGO_DOC[f.tipoDocIdentidad]}
                  onChange={(e) => set("ruc", e.target.value.replace(/\D/g, ""))} required />
              </div>
              <Button variant="secondary" icon={Search} loading={buscando}
                disabled={f.ruc.trim().length !== LARGO_DOC[f.tipoDocIdentidad]} onClick={buscar}>Buscar</Button>
            </>
          )}
        </div>
        {f.tipoDocIdentidad === "NINGUNO" && (
          <p className={styles.sub} style={{ margin: 0 }}>Vendedor informal: solo se le podrán registrar notas de venta (gasto sin comprobante, no deducible).</p>
        )}
        <Field label={f.tipoDocIdentidad === "RUC" ? "Razón social" : "Nombre"} value={f.razonSocial} onChange={(e) => set("razonSocial", e.target.value)} required />
        <Field label="Nombre comercial" value={f.nombreComercial} onChange={(e) => set("nombreComercial", e.target.value)} />
        <Field label="Dirección" value={f.direccion} onChange={(e) => set("direccion", e.target.value)} />
        <div className={styles.grid2}>
          <Field as="select" label="Tipo de proveedor" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}
            hint={f.tipo === "PRODUCTO" ? "Sus compras se controlan con el ingreso/salida de almacén" : undefined}>
            <option value="PRODUCTO">Producto</option>
            <option value="SERVICIO">Servicio</option>
          </Field>
          <CategoriaGastoSelect categorias={categorias} value={f.categoriaGastoId} onChange={(v) => set("categoriaGastoId", v)}
            actual={proveedor?.categoriaGasto}
            label="Categoría por defecto" hint="Se precarga al registrar sus documentos" />
        </div>
        <label style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "var(--text-sm)" }}>
          <input type="checkbox" checked={f.afectaComercializacion} onChange={(e) => set("afectaComercializacion", e.target.checked)} style={{ marginTop: 3 }} />
          <span>
            Afecta la comercialización
            <span className={styles.sub} style={{ display: "block" }}>
              Marcado: su gasto es costo de venta (imprenta, materiales). Sin marcar: gasto operativo (luz, contador, alquiler).
            </span>
          </span>
        </label>
        <div style={{ display: "grid", gap: "0.4rem" }}>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: 600 }}>Reparto por línea de negocio</span>
          {lineasVisibles.length ? (
            <>
              <div className={styles.grid2}>
                {lineasVisibles.map((l) => (
                  <Field key={l.id} label={`${l.nombre}${l.activo ? "" : " (inactiva)"} — %`} type="number" min="0" max="100" step="0.01"
                    value={reparto[l.id] ?? ""} placeholder="0"
                    onChange={(e) => setReparto((p) => ({ ...p, [l.id]: e.target.value }))} />
                ))}
              </div>
              <span className={styles.sub} style={{ color: repartoValido ? undefined : "var(--color-danger)" }}>
                {sumaReparto === 0
                  ? "Sin reparto: sus gastos van a \"Sin línea de negocio\" en el Flujo de Efectivo y el Libro Mayor."
                  : `Suma ${sumaReparto} %${repartoValido ? "" : " — debe sumar 100 %"}`}
              </span>
            </>
          ) : (
            <span className={styles.sub}>Aún no hay líneas de negocio. Créalas en Por pagar → Líneas de negocio.</span>
          )}
        </div>
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
