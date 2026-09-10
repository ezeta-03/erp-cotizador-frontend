import { useEffect, useState, useCallback } from "react";
import {
  Plus, Minus, RefreshCw, X, Search, ClipboardList, PackageSearch, PackagePlus,
  FileStack, FileDown, Trash2,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getItemsAlmacen, crearItemAlmacen,
  getMovimientos, registrarEntrada, registrarSalida,
  getOrdenes, crearOrdenAlmacen, descargarOrdenPdf,
} from "../api/almacen";
import { getClientes } from "../api/clientes";
import { getProyectos, getProyectosExternos } from "../api/proyectos";
import styles from "./almacen.module.scss";

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

const TIPO_LABEL = {
  INSUMO: "Insumo",
  PRODUCTO_TERMINADO: "Producto terminado",
  HERRAMIENTA: "Herramienta",
  MAQUINARIA_EQUIPO: "Maquinaria y equipo",
};
const EMPRESA_LABEL = { BTL_OUTDOOR: "BTL / Outdoor", NETWISE: "Netwise" };
const EMPRESA_CORTA = { BTL_OUTDOOR: "BTL", NETWISE: "Netwise" };

/* ── Campo de formulario ────────────────────────────────────────────────── */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

const ITEM_VACIO = {
  codigo: "", nombre: "", tipo: "INSUMO", empresa: "BTL_OUTDOOR", categoria: "", unidad: "",
  ubicacion: "", stockMinimo: "", stockMaximo: "", costoUnitario: "", proveedorNombre: "",
};
const ENTRADA_VACIA = { productoId: "", cantidad: "", precioUnitario: "", notas: "" };
const SALIDA_VACIA  = { productoId: "", clienteId: "", proyectoKey: "", cantidad: "", precioUnitario: "", precioFacturado: "", notas: "" };

// Un proyecto puede vivir solo como Proyecto interno del ERP, solo en
// seguimiento-actividades (todavía sin "stub"), o en ambos — esta clave
// combina las dos listas en un único selector, y al elegir se resuelve de
// vuelta a { proyectoId } o { proyectoExternoId } según corresponda.
function resolverProyectoPayload(proyectoKey, proyectoOptions) {
  const opcion = proyectoOptions.find((o) => o.key === proyectoKey);
  if (!opcion) return {};
  return {
    proyectoId: opcion.proyectoId || undefined,
    proyectoExternoId: opcion.proyectoExternoId || undefined,
  };
}

function construirProyectoOptions(internos, externos) {
  const opcionesInternas = internos.map((p) => ({
    key: `int-${p.id}`, proyectoId: p.id, proyectoExternoId: null,
    label: p.nombre,
  }));
  // Los que ya tienen Proyecto interno (proyectoInternoId) ya están arriba —
  // acá solo van los que viven únicamente en seguimiento-actividades.
  const opcionesExternas = externos
    .filter((p) => !p.proyectoInternoId)
    .map((p) => ({
      key: `ext-${p.id}`, proyectoId: null, proyectoExternoId: p.id,
      label: `${p.nombre} (Seguimiento de Actividades)`,
    }));
  return [...opcionesInternas, ...opcionesExternas];
}

function SelectorProyecto({ value, onChange, opciones }) {
  return (
    <select value={value} onChange={onChange}>
      <option value="">Sin proyecto directo</option>
      {opciones.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Modal: nuevo ítem de catálogo (insumo o producto terminado) ─────────── */
function ItemFormModal({ onSave, onCancel }) {
  const [form, setForm] = useState(ITEM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.codigo || !form.nombre || !form.categoria || !form.unidad) {
      setError("Código, nombre, categoría y unidad son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        stockMinimo: form.stockMinimo || undefined,
        stockMaximo: form.stockMaximo || undefined,
        costoUnitario: form.costoUnitario || undefined,
        proveedorNombre: form.proveedorNombre || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al crear el ítem");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Nuevo ítem de almacén</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formRow}>
            <F label="Empresa">
              <select value={form.empresa} onChange={set("empresa")}>
                <option value="BTL_OUTDOOR">BTL / Outdoor</option>
                <option value="NETWISE">Netwise</option>
              </select>
            </F>
            <F label="Tipo">
              <select value={form.tipo} onChange={set("tipo")}>
                <option value="INSUMO">Insumo</option>
                <option value="PRODUCTO_TERMINADO">Producto terminado</option>
                <option value="HERRAMIENTA">Herramienta</option>
                <option value="MAQUINARIA_EQUIPO">Maquinaria y equipo</option>
              </select>
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Código">
              <input value={form.codigo} onChange={set("codigo")} placeholder="Ej. ZOPEINS003-01" />
            </F>
            <F label="Unidad">
              <input value={form.unidad} onChange={set("unidad")} placeholder="Metro, Unidad, Plancha…" />
            </F>
          </div>

          <F label="Nombre">
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Vinil azul - MCCAL" />
          </F>

          <F label="Categoría">
            <input value={form.categoria} onChange={set("categoria")} placeholder="Ej. Vinil, PVC, Señalética 30x20…" />
          </F>

          <div className={styles.formRow}>
            <F label="Stock mínimo" optional>
              <input type="number" min="0" step="0.01" value={form.stockMinimo} onChange={set("stockMinimo")} placeholder="0" />
            </F>
            <F label="Stock máximo" optional>
              <input type="number" min="0" step="0.01" value={form.stockMaximo} onChange={set("stockMaximo")} placeholder="0" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Ubicación" optional>
              <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Almacen" />
            </F>
            <F label="Costo unitario (S/)" optional>
              <input type="number" min="0" step="0.01" value={form.costoUnitario} onChange={set("costoUnitario")} placeholder="0.00" />
            </F>
          </div>

          <F label="Proveedor habitual" optional>
            <input value={form.proveedorNombre} onChange={set("proveedorNombre")} placeholder="Nombre del proveedor" />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Crear ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: registrar entrada (compra, o ingreso de producto terminado) ──── */
function EntradaFormModal({ items, onSave, onCancel }) {
  const [form, setForm] = useState(ENTRADA_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const itemSel = items.find((i) => String(i.id) === String(form.productoId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.productoId || !form.cantidad || form.precioUnitario === "") {
      setError("Ítem, cantidad y precio unitario son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        productoId: Number(form.productoId),
        cantidad: Number(form.cantidad),
        precioUnitario: Number(form.precioUnitario),
        notas: form.notas || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al registrar la entrada");
      setSaving(false);
    }
  };

  const total = form.cantidad && form.precioUnitario ? Number(form.cantidad) * Number(form.precioUnitario) : 0;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Registrar entrada</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Ítem">
            <select value={form.productoId} onChange={set("productoId")}>
              <option value="">Selecciona un ítem</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>[{EMPRESA_CORTA[i.empresa]}] {i.codigo} — {i.nombre}</option>
              ))}
            </select>
            {itemSel?.proveedorNombre && (
              <span className={styles.finCalculado}>Proveedor habitual: {itemSel.proveedorNombre}</span>
            )}
          </F>

          <div className={styles.formRow}>
            <F label={`Cantidad${itemSel?.unidad ? ` (${itemSel.unidad})` : ""}`}>
              <input type="number" min="0.01" step="0.01" value={form.cantidad} onChange={set("cantidad")} placeholder="100" />
            </F>
            <F label="Precio unitario (S/)">
              <input type="number" min="0" step="0.01" value={form.precioUnitario} onChange={set("precioUnitario")} placeholder="8.00" />
            </F>
          </div>

          {total > 0 && <p className={styles.totalPreview}>Total: {fmtMoney(total)}</p>}

          <F label="Notas" optional>
            <input value={form.notas} onChange={set("notas")} placeholder="Referencia, N° de guía, etc." />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Registrar entrada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: registrar salida (venta / consumo de proyecto) ────────────── */
function SalidaFormModal({ items, clientes, proyectoOptions, onSave, onCancel }) {
  const [form, setForm] = useState(SALIDA_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.productoId || !form.cantidad || form.precioUnitario === "") {
      setError("Ítem, cantidad y precio unitario son obligatorios.");
      return;
    }
    if (!form.clienteId && !form.proyectoKey) {
      setError("Indica un cliente y/o un proyecto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        productoId: Number(form.productoId),
        clienteId: form.clienteId ? Number(form.clienteId) : undefined,
        ...resolverProyectoPayload(form.proyectoKey, proyectoOptions),
        cantidad: Number(form.cantidad),
        precioUnitario: Number(form.precioUnitario),
        precioFacturado: form.precioFacturado !== "" ? Number(form.precioFacturado) : undefined,
        notas: form.notas || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al registrar la salida");
      setSaving(false);
    }
  };

  const total = form.cantidad && form.precioUnitario ? Number(form.cantidad) * Number(form.precioUnitario) : 0;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Registrar salida</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Ítem">
            <select value={form.productoId} onChange={set("productoId")}>
              <option value="">Selecciona un ítem</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>[{EMPRESA_CORTA[i.empresa]}] {i.codigo} — {i.nombre} (stock: {i.stockActual})</option>
              ))}
            </select>
          </F>

          <F label="Cliente" optional>
            <select value={form.clienteId} onChange={set("clienteId")}>
              <option value="">Sin cliente directo</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombreComercial}</option>
              ))}
            </select>
          </F>

          <F label="Proyecto" optional>
            <SelectorProyecto value={form.proyectoKey} onChange={set("proyectoKey")} opciones={proyectoOptions} />
          </F>

          <div className={styles.formRow}>
            <F label="Cantidad">
              <input type="number" min="0.01" step="0.01" value={form.cantidad} onChange={set("cantidad")} placeholder="30" />
            </F>
            <F label="Precio unitario (S/)">
              <input type="number" min="0" step="0.01" value={form.precioUnitario} onChange={set("precioUnitario")} placeholder="15.00" />
            </F>
          </div>

          <F label="Precio facturado (S/)" optional>
            <input type="number" min="0" step="0.01" value={form.precioFacturado} onChange={set("precioFacturado")} placeholder="Si difiere del total calculado" />
          </F>

          {total > 0 && <p className={styles.totalPreview}>Total: {fmtMoney(total)}</p>}

          <F label="Notas" optional>
            <input value={form.notas} onChange={set("notas")} placeholder="Referencia, motivo, etc." />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const LINEA_VACIA = { itemAlmacenId: "", cantidad: "", precioUnitario: "" };

/* ── Modal: nueva orden (varias líneas, imprimible en PDF) ────────────────── */
function OrdenFormModal({ items, clientes, proyectoOptions, soloSalida, onSave, onCancel }) {
  const [tipo, setTipo] = useState("SALIDA");
  const [ordenServicio, setOrdenServicio] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [proyectoKey, setProyectoKey] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState([{ ...LINEA_VACIA }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setLinea = (idx, campo) => (e) => {
    const valor = e.target.value;
    setLineas((ls) => ls.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  };
  const agregarLinea = () => setLineas((ls) => [...ls, { ...LINEA_VACIA }]);
  const quitarLinea = (idx) => setLineas((ls) => ls.filter((_, i) => i !== idx));

  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const lineasValidas = lineas.filter((l) => l.itemAlmacenId && l.cantidad);
    if (lineasValidas.length === 0) {
      setError("Agrega al menos un ítem con cantidad.");
      return;
    }
    if (tipo === "SALIDA" && !clienteId && !proyectoKey) {
      setError("Indica un cliente y/o un proyecto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        tipo,
        ordenServicio: ordenServicio || undefined,
        clienteId: tipo === "SALIDA" && clienteId ? Number(clienteId) : undefined,
        ...(tipo === "SALIDA" ? resolverProyectoPayload(proyectoKey, proyectoOptions) : {}),
        notas: notas || undefined,
        items: lineasValidas.map((l) => ({
          itemAlmacenId: Number(l.itemAlmacenId),
          cantidad: Number(l.cantidad),
          precioUnitario: l.precioUnitario !== "" ? Number(l.precioUnitario) : undefined,
        })),
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al crear la orden");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal} style={{ maxWidth: 640 }}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Nueva orden de almacén</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formRow}>
            {!soloSalida && (
              <F label="Tipo">
                <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                  <option value="SALIDA">Salida</option>
                  <option value="ENTRADA">Entrada</option>
                </select>
              </F>
            )}
            <F label="Orden de servicio" optional>
              <input value={ordenServicio} onChange={(e) => setOrdenServicio(e.target.value)} placeholder="Ej. OS-2026-001" />
            </F>
          </div>

          {tipo === "SALIDA" && (
            <div className={styles.formRow}>
              <F label="Cliente" optional>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Sin cliente directo</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombreComercial}</option>
                  ))}
                </select>
              </F>
              <F label="Proyecto" optional>
                <SelectorProyecto value={proyectoKey} onChange={(e) => setProyectoKey(e.target.value)} opciones={proyectoOptions} />
              </F>
            </div>
          )}

          <F label="Ítems de la orden">
            <div className={styles.lineasWrap}>
              {lineas.map((l, idx) => {
                const itemSel = items.find((i) => String(i.id) === String(l.itemAlmacenId));
                return (
                  <div key={idx} className={styles.lineaRow}>
                    <select value={l.itemAlmacenId} onChange={setLinea(idx, "itemAlmacenId")}>
                      <option value="">Selecciona un ítem</option>
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          [{EMPRESA_CORTA[i.empresa]}] {i.codigo} — {i.nombre}{tipo === "SALIDA" ? ` (stock: ${i.stockActual})` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number" min="0.01" step="0.01" placeholder="Cant."
                      value={l.cantidad} onChange={setLinea(idx, "cantidad")}
                      title={itemSel?.unidad || ""}
                    />
                    <input
                      type="number" min="0" step="0.01" placeholder="P. unit."
                      value={l.precioUnitario} onChange={setLinea(idx, "precioUnitario")}
                    />
                    <button type="button" className={styles.btnQuitarLinea} onClick={() => quitarLinea(idx)} disabled={lineas.length === 1}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
            <button type="button" className={styles.btnAgregarLinea} onClick={agregarLinea}>
              <Plus size={13} /> Agregar ítem
            </button>
          </F>

          {total > 0 && <p className={styles.totalPreview}>Total: {fmtMoney(total)}</p>}

          <F label="Notas" optional>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Referencia, motivo, etc." />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Crear orden"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────── */
export default function Almacen() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const isAdmin  = user?.role === "ADMIN";
  const isVentas = user?.role === "VENTAS";
  const puedeVerMovimientos = isAdmin; // backend: ADMIN + CONTABLE (CONTABLE aún no tiene esta ruta en el menú)
  const puedeVerOrdenes = isAdmin || isVentas;

  const [vista, setVista] = useState("stock");
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectoOptions, setProyectoOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipoStock, setFiltroTipoStock] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [showItem, setShowItem] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSalida, setShowSalida] = useState(false);
  const [showOrden, setShowOrden] = useState(false);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [its, movs, ords, clis, proys, proysExt] = await Promise.all([
        getItemsAlmacen(),
        puedeVerMovimientos ? getMovimientos() : Promise.resolve([]),
        puedeVerOrdenes ? getOrdenes() : Promise.resolve([]),
        getClientes(),
        puedeVerOrdenes ? getProyectos() : Promise.resolve([]),
        // Si seguimiento-actividades/Firestore no responde, no debe tumbar
        // toda la carga de Almacén — el selector simplemente queda más corto.
        puedeVerOrdenes ? getProyectosExternos().catch(() => []) : Promise.resolve([]),
      ]);
      setItems(its);
      setMovimientos(movs);
      setOrdenes(ords);
      setClientes(clis);
      setProyectoOptions(construirProyectoOptions(proys, proysExt));
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [puedeVerMovimientos, puedeVerOrdenes]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const recargarMovimientos = async (tipo) => {
    if (!puedeVerMovimientos) return;
    try {
      setMovimientos(await getMovimientos(tipo ? { tipo } : undefined));
    } catch { /* silencioso */ }
  };

  const irAVista = (v) => {
    setVista(v);
    if (v === "movimientos") recargarMovimientos(filtroTipo);
  };

  const cambiarFiltroTipo = (tipo) => {
    setFiltroTipo(tipo);
    recargarMovimientos(tipo);
  };

  const q = busqueda.trim().toLowerCase();
  const itemsFiltrados = items.filter((i) => {
    if (filtroTipoStock && i.tipo !== filtroTipoStock) return false;
    if (filtroEmpresa && i.empresa !== filtroEmpresa) return false;
    if (!q) return true;
    return i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q) ||
      i.categoria?.toLowerCase().includes(q) ||
      i.departamento?.toLowerCase().includes(q);
  });

  const handleCrearItem = async (payload) => {
    await crearItemAlmacen(payload);
    setShowItem(false);
    cargarTodo();
  };

  const handleEntrada = async (payload) => {
    await registrarEntrada(payload);
    setShowEntrada(false);
    cargarTodo();
  };

  const handleSalida = async (payload) => {
    await registrarSalida(payload);
    setShowSalida(false);
    cargarTodo();
  };

  const handleCrearOrden = async (payload) => {
    const orden = await crearOrdenAlmacen(payload);
    setShowOrden(false);
    cargarTodo();
    try { await descargarOrdenPdf(orden.id, token); } catch { /* la orden ya quedó creada igual */ }
  };

  const contraparte = (m) =>
    m.proveedor?.nombre || m.cliente?.nombreComercial || m.proyecto?.nombre || m.proyectoExternoId || "—";
  const contraparteOrden = (o) => o.cliente?.nombreComercial || o.proyecto?.nombre || o.proyectoExternoId || "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Almacén</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${items.length} ítem${items.length !== 1 ? "s" : ""} en catálogo`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargarTodo} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (
            <button className={styles.btnOutline} onClick={() => setShowItem(true)}>
              <PackagePlus size={16} /> Nuevo ítem
            </button>
          )}
          {isAdmin && (
            <button className={styles.btnOutline} onClick={() => setShowEntrada(true)}>
              <Plus size={16} /> Entrada
            </button>
          )}
          {(isAdmin || isVentas) && (
            <button className={styles.btnPrimary} onClick={() => setShowSalida(true)}>
              <Minus size={16} /> Salida
            </button>
          )}
          {puedeVerOrdenes && (
            <button className={styles.btnOutline} onClick={() => setShowOrden(true)}>
              <FileStack size={16} /> Nueva orden
            </button>
          )}
        </div>
      </div>

      {(puedeVerMovimientos || puedeVerOrdenes) && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${vista === "stock" ? styles.tabActive : ""}`}
            onClick={() => irAVista("stock")}
          >
            <PackageSearch size={15} /> Stock
          </button>
          {puedeVerMovimientos && (
            <button
              className={`${styles.tab} ${vista === "movimientos" ? styles.tabActive : ""}`}
              onClick={() => irAVista("movimientos")}
            >
              <ClipboardList size={15} /> Movimientos
            </button>
          )}
          {puedeVerOrdenes && (
            <button
              className={`${styles.tab} ${vista === "ordenes" ? styles.tabActive : ""}`}
              onClick={() => irAVista("ordenes")}
            >
              <FileStack size={15} /> Órdenes
            </button>
          )}
        </div>
      )}

      {vista === "stock" ? (
        <>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por código, nombre, categoría…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.searchClear} onClick={() => setBusqueda("")}>
                  <X size={13} />
                </button>
              )}
            </div>
            <select className={styles.filterSelect} value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
              <option value="">Todas las empresas</option>
              <option value="BTL_OUTDOOR">BTL / Outdoor</option>
              <option value="NETWISE">Netwise</option>
            </select>
            <select className={styles.filterSelect} value={filtroTipoStock} onChange={(e) => setFiltroTipoStock(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="INSUMO">Insumos</option>
              <option value="PRODUCTO_TERMINADO">Productos terminados</option>
              <option value="HERRAMIENTA">Herramientas</option>
              <option value="MAQUINARIA_EQUIPO">Maquinaria y equipo</option>
            </select>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.empty}>Cargando stock…</p>
            ) : itemsFiltrados.length === 0 ? (
              <p className={styles.empty}>No hay ítems que coincidan.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ítem</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th>Stock actual</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFiltrados.map((i) => (
                    <tr key={i.id}>
                      <td>{i.codigo}</td>
                      <td>{i.nombre}</td>
                      <td>{EMPRESA_LABEL[i.empresa] || i.empresa}</td>
                      <td>
                        <span className={`${styles.badge} ${i.tipo === "INSUMO" ? styles.badgeEntrada : styles.badgeSalida}`}>
                          {TIPO_LABEL[i.tipo]}
                        </span>
                      </td>
                      <td>{i.categoria}</td>
                      <td>{i.unidad || "—"}</td>
                      <td>
                        <span className={`${styles.stockBadge} ${i.stockActual <= 0 ? styles.stockBadgeVacio : ""}`}>
                          {i.stockActual}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : vista === "movimientos" ? (
        <>
          <div className={styles.filtersBar}>
            <select className={styles.filterSelect} value={filtroTipo} onChange={(e) => cambiarFiltroTipo(e.target.value)}>
              <option value="">Todos los movimientos</option>
              <option value="ENTRADA">Solo entradas</option>
              <option value="SALIDA">Solo salidas</option>
            </select>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.empty}>Cargando movimientos…</p>
            ) : movimientos.length === 0 ? (
              <p className={styles.empty}>No hay movimientos registrados aún.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Ítem</th>
                    <th>Cantidad</th>
                    <th>P. Unitario</th>
                    <th>Total</th>
                    <th>Contraparte</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>{fmtFecha(m.fecha)}</td>
                      <td>
                        <span className={`${styles.badge} ${m.tipo === "ENTRADA" ? styles.badgeEntrada : styles.badgeSalida}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td>{m.item?.codigo} — {m.item?.nombre}</td>
                      <td>{m.cantidad}</td>
                      <td>{fmtMoney(m.precioUnitario)}</td>
                      <td>{fmtMoney(m.precioTotal)}</td>
                      <td>{contraparte(m)}</td>
                      <td>{m.usuario?.nombre || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div className={styles.tableContainer}>
          {loading ? (
            <p className={styles.empty}>Cargando órdenes…</p>
          ) : ordenes.length === 0 ? (
            <p className={styles.empty}>No hay órdenes registradas aún.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Orden de servicio</th>
                  <th>Contraparte</th>
                  <th>Ítems</th>
                  <th>Registrado por</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id}>
                    <td>{fmtFecha(o.fecha)}</td>
                    <td>
                      <span className={`${styles.badge} ${o.tipo === "ENTRADA" ? styles.badgeEntrada : styles.badgeSalida}`}>
                        {o.tipo}
                      </span>
                    </td>
                    <td>{o.ordenServicio || "—"}</td>
                    <td>{contraparteOrden(o)}</td>
                    <td>{o.items.length}</td>
                    <td>{o.usuario?.nombre || "—"}</td>
                    <td>
                      <button className={styles.btnGhost} onClick={() => descargarOrdenPdf(o.id, token)} title="Descargar PDF">
                        <FileDown size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showItem && (
        <ItemFormModal onSave={handleCrearItem} onCancel={() => setShowItem(false)} />
      )}

      {showEntrada && (
        <EntradaFormModal
          items={items.filter((i) => i.activo)}
          onSave={handleEntrada}
          onCancel={() => setShowEntrada(false)}
        />
      )}

      {showSalida && (
        <SalidaFormModal
          items={items.filter((i) => i.activo)}
          clientes={clientes}
          proyectoOptions={proyectoOptions}
          onSave={handleSalida}
          onCancel={() => setShowSalida(false)}
        />
      )}

      {showOrden && (
        <OrdenFormModal
          items={items.filter((i) => i.activo)}
          clientes={clientes}
          proyectoOptions={proyectoOptions}
          soloSalida={!isAdmin}
          onSave={handleCrearOrden}
          onCancel={() => setShowOrden(false)}
        />
      )}
    </div>
  );
}
