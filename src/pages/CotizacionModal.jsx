import { useState, useEffect } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import styles from "./CotizacionModal.module.scss";

const MARKUP = 1.1 * 1.17 * 1.3; // costo_indirecto × administrativo × rentabilidad

const nombreProducto = (p) => p?.nombre || p?.servicio || p?.material || "(sin nombre)";

export default function CotizacionModal({ onClose, onSave }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const productosFiltrados = productos.filter((p) =>
    nombreProducto(p).toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  const agregarProducto = (producto) => {
    const precioBase = parseFloat((producto.costo_material * MARKUP).toFixed(2));
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        nombre: nombreProducto(producto),
        costo_material: producto.costo_material,
        precio: precioBase,
        cantidad: 1,
        subtotal: precioBase,
        adicionales:
          producto.adicionales?.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            seleccionado: false,
            precio: a.precio,
          })) || [],
      },
    ]);
    setBusquedaProducto("");
  };

  const eliminarProducto = (idx) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAdicional = (idx, j, checked) => {
    const nuevos = [...items];
    nuevos[idx].adicionales[j].seleccionado = checked;
    const sumaAdicionales = nuevos[idx].adicionales
      .filter((a) => a.seleccionado)
      .reduce((acc, a) => acc + Number(a.precio), 0);
    const precioBase = nuevos[idx].costo_material * MARKUP;
    nuevos[idx].precio = parseFloat((precioBase + sumaAdicionales).toFixed(2));
    nuevos[idx].subtotal = parseFloat((nuevos[idx].precio * nuevos[idx].cantidad).toFixed(2));
    setItems(nuevos);
  };

  const actualizarCantidad = (idx, value) => {
    const nuevos = [...items];
    nuevos[idx].cantidad = Math.max(1, Number(value));
    nuevos[idx].subtotal = parseFloat((nuevos[idx].precio * nuevos[idx].cantidad).toFixed(2));
    setItems(nuevos);
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const abrirVistaPrevia = () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona un cliente y agrega al menos un producto");
      return;
    }
    setShowPreview(true);
  };

  const handleSave = () => {
    onSave({ clienteId, items });
    onClose();
  };

  const fmt = (v) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Nueva Cotización</h2>

        {!showPreview ? (
          <>
            {/* Cliente */}
            <label className={styles.label}>Cliente</label>
            <select
              className={styles.select}
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercial}
                </option>
              ))}
            </select>

            {/* Buscar y agregar producto */}
            <label className={styles.label}>Agregar producto</label>
            <input
              className={styles.select}
              placeholder="Buscar producto..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
            />
            {busquedaProducto && productosFiltrados.length > 0 && (
              <div className={styles.dropdown}>
                {productosFiltrados.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    className={styles.dropdownItem}
                    onClick={() => agregarProducto(p)}
                    type="button"
                  >
                    <span>{nombreProducto(p)}</span>
                    <span className={styles.dropdownPrice}>{fmt(p.costo_material * MARKUP)}</span>
                  </button>
                ))}
              </div>
            )}
            {busquedaProducto && productosFiltrados.length === 0 && (
              <p className={styles.noResults}>Sin resultados para "{busquedaProducto}"</p>
            )}

            {/* Tabla de items */}
            {items.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio unit.</th>
                    <th>Cant.</th>
                    <th>Subtotal</th>
                    <th>Adicionales</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.nombre}</td>
                      <td>{fmt(item.precio)}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(idx, e.target.value)}
                          className={styles.inputCantidad}
                        />
                      </td>
                      <td>{fmt(item.subtotal)}</td>
                      <td>
                        {item.adicionales.map((a, j) => (
                          <label key={a.id} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={a.seleccionado}
                              onChange={(e) => toggleAdicional(idx, j, e.target.checked)}
                            />
                            {a.nombre} ({fmt(a.precio)})
                          </label>
                        ))}
                      </td>
                      <td>
                        <button className={styles.btnRemove} onClick={() => eliminarProducto(idx)}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 className={styles.total}>Total: {fmt(total)}</h3>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button className={styles.btnPrimary} onClick={abrirVistaPrevia}>
                Vista Previa
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>Vista Previa</h3>
            <p>
              <strong>Cliente:</strong>{" "}
              {clientes.find((c) => String(c.id) === String(clienteId))?.nombreComercial}
            </p>
            <p>
              <strong>Fecha:</strong> {new Date().toLocaleDateString("es-PE")}
            </p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const glosa = item.adicionales
                    .filter((a) => a.seleccionado)
                    .map((a) => `con ${a.nombre}`)
                    .join(", ");
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        {item.nombre}
                        {glosa && <span className={styles.glosa}> — {glosa}</span>}
                      </td>
                      <td>{item.cantidad}</td>
                      <td>{fmt(item.precio)}</td>
                      <td>{fmt(item.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h3 className={styles.total}>TOTAL: {fmt(total)}</h3>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setShowPreview(false)}>
                Volver
              </button>
              <button className={styles.btnPrimary} onClick={handleSave}>
                Generar Cotización
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
