import { useEffect, useState, useCallback } from "react";
import { Plus, Minus, RefreshCw, X, Search, ClipboardList, PackageSearch } from "lucide-react";
import useAuth from "../auth/useAuth";
import { getStock, getMovimientos, registrarEntrada, registrarSalida } from "../api/almacen";
import { getProductos } from "../api/productos";
import { getProveedores } from "../api/proveedores";
import { getClientes } from "../api/clientes";
import styles from "./almacen.module.scss";

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

/* ── Campo de formulario ────────────────────────────────────────────────── */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

const ENTRADA_VACIA = { productoId: "", proveedorId: "", cantidad: "", precioUnitario: "", notas: "" };
const SALIDA_VACIA  = { productoId: "", clienteId: "", proyectoExternoId: "", cantidad: "", precioUnitario: "", precioFacturado: "", notas: "" };

/* ── Modal: registrar entrada (compra) ─────────────────────────────────── */
function EntradaFormModal({ productos, proveedores, onSave, onCancel }) {
  const [form, setForm] = useState(ENTRADA_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.productoId || !form.cantidad || form.precioUnitario === "") {
      setError("Producto, cantidad y precio unitario son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        productoId: Number(form.productoId),
        proveedorId: form.proveedorId ? Number(form.proveedorId) : undefined,
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
          <h2 className={styles.formTitle}>Registrar entrada (compra)</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Producto">
            <select value={form.productoId} onChange={set("productoId")}>
              <option value="">Selecciona un producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre || p.servicio}</option>
              ))}
            </select>
          </F>

          <F label="Proveedor" optional>
            <select value={form.proveedorId} onChange={set("proveedorId")}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </F>

          <div className={styles.formRow}>
            <F label="Cantidad">
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
function SalidaFormModal({ productos, clientes, onSave, onCancel }) {
  const [form, setForm] = useState(SALIDA_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.productoId || !form.cantidad || form.precioUnitario === "") {
      setError("Producto, cantidad y precio unitario son obligatorios.");
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
          <h2 className={styles.formTitle}>Registrar salida (venta)</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Producto">
            <select value={form.productoId} onChange={set("productoId")}>
              <option value="">Selecciona un producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre || p.servicio} (stock: {p.stockActual})</option>
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
  const [stock, setStock] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSalida, setShowSalida] = useState(false);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [st, movs, prods, provs, clis] = await Promise.all([
        getStock(),
        puedeVerMovimientos ? getMovimientos() : Promise.resolve([]),
        getProductos(),
        isAdmin ? getProveedores() : Promise.resolve([]),
        getClientes(),
      ]);
      setStock(st);
      setMovimientos(movs);
      setProductos(prods);
      setProveedores(provs);
      setClientes(clis);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [isAdmin, puedeVerMovimientos]);

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
  const stockFiltrado = q
    ? stock.filter((p) =>
        p.nombre?.toLowerCase().includes(q) ||
        p.servicio?.toLowerCase().includes(q) ||
        p.categoria?.toLowerCase().includes(q)
      )
    : stock;

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
            {loading ? "Cargando…" : `${stock.length} producto${stock.length !== 1 ? "s" : ""} con stock registrado`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargarTodo} title="Actualizar"><RefreshCw size={16} /></button>
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
                placeholder="Buscar producto, categoría…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.searchClear} onClick={() => setBusqueda("")}>
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.empty}>Cargando stock…</p>
            ) : stockFiltrado.length === 0 ? (
              <p className={styles.empty}>No hay productos que coincidan.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Categoría</th>
                    <th>Unidad</th>
                    <th>Stock actual</th>
                  </tr>
                </thead>
                <tbody>
                  {stockFiltrado.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre || p.servicio}</td>
                      <td>{p.categoria}</td>
                      <td>{p.unidad || "—"}</td>
                      <td>
                        <span className={`${styles.stockBadge} ${p.stockActual <= 0 ? styles.stockBadgeVacio : ""}`}>
                          {p.stockActual}
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
                    <th>Producto</th>
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
                      <td>{m.producto?.nombre || m.producto?.servicio}</td>
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

      {showEntrada && (
        <EntradaFormModal
          productos={productos}
          proveedores={proveedores}
          onSave={handleEntrada}
          onCancel={() => setShowEntrada(false)}
        />
      )}

      {showSalida && (
        <SalidaFormModal
          productos={productos.map((p) => ({ ...p, stockActual: stock.find((s) => s.id === p.id)?.stockActual ?? 0 }))}
          clientes={clientes}
          onSave={handleSalida}
          onCancel={() => setShowSalida(false)}
        />
      )}
    </div>
  );
}
