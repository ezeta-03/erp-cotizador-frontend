import { useState, useEffect } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import styles from "./CotizacionModal.module.scss";

const nombreProducto = (p) => p?.nombre || p?.servicio || p?.material || "(sin nombre)";

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

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
    const precio = parseFloat(Number(producto.precio_final).toFixed(2));
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        nombre: nombreProducto(producto),
        precio_final: producto.precio_final,
        precio,
        cantidad: 1,
        subtotal: precio,
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

  const eliminarProducto = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const toggleAdicional = (idx, j, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].adicionales[j].seleccionado = checked;
      const sumaAdicionales = next[idx].adicionales
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);
      next[idx].precio = parseFloat((next[idx].precio_final + sumaAdicionales).toFixed(2));
      next[idx].subtotal = parseFloat((next[idx].precio * next[idx].cantidad).toFixed(2));
      return next;
    });
  };

  const actualizarCantidad = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].cantidad = Math.max(1, Number(value));
      next[idx].subtotal = parseFloat((next[idx].precio * next[idx].cantidad).toFixed(2));
      return next;
    });
  };

  const total = parseFloat(items.reduce((s, i) => s + i.subtotal, 0).toFixed(2));

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
                    <span className={styles.dropdownPrice}>{fmt(p.precio_final)}</span>
                  </button>
                ))}
              </div>
            )}
            {busquedaProducto && productosFiltrados.length === 0 && (
              <p className={styles.noResults}>Sin resultados para "{busquedaProducto}"</p>
            )}

            {/* Tabla de items */}
            {items.length > 0 && (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio unit.</th>
                      <th>Cant.</th>
                      <th>Adicionales</th>
                      <th>Subtotal</th>
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
                        <td>
                          {item.adicionales.map((a, j) => (
                            <label key={a.id} className={styles.checkbox}>
                              <input
                                type="checkbox"
                                checked={a.seleccionado}
                                onChange={(e) => toggleAdicional(idx, j, e.target.checked)}
                              />
                              {a.nombre} (+{fmt(a.precio)})
                            </label>
                          ))}
                        </td>
                        <td>{fmt(item.subtotal)}</td>
                        <td>
                          <button className={styles.btnRemove} onClick={() => eliminarProducto(idx)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.resumenFinanciero}>
                  <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
                    <span>Total</span>
                    <span>{fmt(total)}</span>
                  </div>
                </div>
              </>
            )}

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button
                className={styles.btnPrimary}
                onClick={abrirVistaPrevia}
                disabled={items.length === 0 || !clienteId}
              >
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

            <div className={styles.resumenFinanciero}>
              <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

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
