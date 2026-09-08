import { useEffect, useState, useCallback } from "react";
import { Plus, Minus, RefreshCw, X, Search, ClipboardList, PackageSearch, PackagePlus } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getItemsAlmacen, crearItemAlmacen,
  getMovimientos, registrarEntrada, registrarSalida,
} from "../api/almacen";
import { getClientes } from "../api/clientes";
import styles from "./almacen.module.scss";

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

const TIPO_LABEL = { INSUMO: "Insumo", PRODUCTO_TERMINADO: "Producto terminado" };

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
  codigo: "", nombre: "", tipo: "INSUMO", categoria: "", unidad: "",
  ubicacion: "", stockMinimo: "", stockMaximo: "", costoUnitario: "", proveedorNombre: "",
};
const ENTRADA_VACIA = { productoId: "", cantidad: "", precioUnitario: "", notas: "" };
const SALIDA_VACIA  = { productoId: "", clienteId: "", proyectoExternoId: "", cantidad: "", precioUnitario: "", precioFacturado: "", notas: "" };

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

          <F label="Tipo">
            <select value={form.tipo} onChange={set("tipo")}>
              <option value="INSUMO">Insumo</option>
              <option value="PRODUCTO_TERMINADO">Producto terminado</option>
            </select>
          </F>

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
                <option key={i.id} value={i.id}>{i.codigo} — {i.nombre}</option>
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
function SalidaFormModal({ items, clientes, onSave, onCancel }) {
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
    if (!form.clienteId && !form.proyectoExternoId) {
      setError("Indica un cliente y/o un ID de proyecto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        productoId: Number(form.productoId),
        clienteId: form.clienteId ? Number(form.clienteId) : undefined,
        proyectoExternoId: form.proyectoExternoId || undefined,
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
                <option key={i.id} value={i.id}>{i.codigo} — {i.nombre} (stock: {i.stockActual})</option>
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

          <F label="ID de proyecto (seguimiento-actividades)" optional>
            <input value={form.proyectoExternoId} onChange={set("proyectoExternoId")} placeholder="Ej. firestore-doc-id" />
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

/* ── Página principal ──────────────────────────────────────────────────── */
export default function Almacen() {
  const { user } = useAuth();
  const isAdmin  = user?.role === "ADMIN";
  const isVentas = user?.role === "VENTAS";
  const puedeVerMovimientos = isAdmin; // backend: ADMIN + CONTABLE (CONTABLE aún no tiene esta ruta en el menú)

  const [vista, setVista] = useState("stock");
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipoStock, setFiltroTipoStock] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [showItem, setShowItem] = useState(false);
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSalida, setShowSalida] = useState(false);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [its, movs, clis] = await Promise.all([
        getItemsAlmacen(),
        puedeVerMovimientos ? getMovimientos() : Promise.resolve([]),
        getClientes(),
      ]);
      setItems(its);
      setMovimientos(movs);
      setClientes(clis);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [puedeVerMovimientos]);

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
    if (!q) return true;
    return i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q) ||
      i.categoria?.toLowerCase().includes(q);
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

  const contraparte = (m) =>
    m.proveedor?.nombre || m.cliente?.nombreComercial || m.proyectoExternoId || "—";

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
        </div>
      </div>

      {puedeVerMovimientos && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${vista === "stock" ? styles.tabActive : ""}`}
            onClick={() => irAVista("stock")}
          >
            <PackageSearch size={15} /> Stock
          </button>
          <button
            className={`${styles.tab} ${vista === "movimientos" ? styles.tabActive : ""}`}
            onClick={() => irAVista("movimientos")}
          >
            <ClipboardList size={15} /> Movimientos
          </button>
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
            <select className={styles.filterSelect} value={filtroTipoStock} onChange={(e) => setFiltroTipoStock(e.target.value)}>
              <option value="">Insumos y productos terminados</option>
              <option value="INSUMO">Solo insumos</option>
              <option value="PRODUCTO_TERMINADO">Solo productos terminados</option>
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
      ) : (
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
          onSave={handleSalida}
          onCancel={() => setShowSalida(false)}
        />
      )}
    </div>
  );
}
