import { useState, useEffect } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import styles from "./CotizacionModal.module.scss";

export default function CotizacionModal({ onClose, onSave }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
  }, []);

  const agregarProducto = (producto) => {
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        material: producto.material,
        costo_material: producto.costo_material,
        precio: producto.precio_final,
        cantidad: 1,
        subtotal: producto.precio_final,
        adicionales:
          producto.adicionales?.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            seleccionado: false,
            precio: a.precio,
          })) || [],
      },
    ]);
  };

  const eliminarProducto = (idx) => {
    const nuevos = [...items];
    nuevos.splice(idx, 1);
    setItems(nuevos);
  };

  const toggleAdicional = (idx, j, checked) => {
    const nuevos = [...items];
    nuevos[idx].adicionales[j].seleccionado = checked;
    const adicionalesSeleccionados = nuevos[idx].adicionales
      .filter((a) => a.seleccionado)
      .reduce((acc, a) => acc + Number(a.precio), 0);
    const precioBase = nuevos[idx].costo_material * 1.1 * 1.17 * 1.3;
    nuevos[idx].precio = precioBase + adicionalesSeleccionados;
    nuevos[idx].subtotal = nuevos[idx].precio * nuevos[idx].cantidad;
    setItems(nuevos);
  };

  const actualizarCantidad = (idx, value) => {
    const nuevos = [...items];
    nuevos[idx].cantidad = Number(value);
    nuevos[idx].subtotal = nuevos[idx].precio * nuevos[idx].cantidad;
    setItems(nuevos);
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const abrirVistaPrevia = () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona cliente y productos");
      return;
    }
    setShowPreview(true);
  };

  const handleSave = () => {
    onSave({ clienteId, items });
    // onClose();
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Nueva Cotización</h2>

        {!showPreview ? (
          <>
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

            <label className={styles.label}>Producto</label>
            <select
              className={styles.select}
              onChange={(e) => {
                const producto = productos.find((p) => p.id === Number(e.target.value));
                if (producto) agregarProducto(producto);
              }}
            >
              <option value="">Selecciona producto</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.material}
                </option>
              ))}
            </select>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Precio</th>
                  <th>Cant.</th>
                  <th>Subtotal</th>
                  <th>Adicionales</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => (
                  <tr key={idx}>
                    <td>{i.material}</td>
                    <td>S/. {i.precio.toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={i.cantidad}
                        onChange={(e) => actualizarCantidad(idx, e.target.value)}
                        className={styles.input}
                      />
                    </td>
                    <td>S/. {i.subtotal.toFixed(2)}</td>
                    <td>
                      {i.adicionales.map((a, j) => (
                        <label key={a.id} className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={a.seleccionado}
                            onChange={(e) => toggleAdicional(idx, j, e.target.checked)}
                          />
                          {a.nombre} (S/. {a.precio})
                        </label>
                      ))}
                    </td>
                    <td>
                      <button
                        className={styles.btnSecondary}
                        onClick={() => eliminarProducto(idx)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className={styles.total}>Total: S/ {total.toFixed(2)}</h3>

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
            <h3 className={styles.title}>Vista Previa Cotización</h3>
            <p><strong>Cliente:</strong> {clientes.find((c) => c.id === clienteId)?.nombreComercial}</p>
            <p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio Unit.</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i, idx) => {
                  const glosa = i.adicionales
                    .filter((a) => a.seleccionado)
                    .map((a) => `con ${a.nombre}`)
                    .join(", ");
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{i.material} {glosa}</td>
                      <td>{i.cantidad}</td>
                      <td>S/. {i.precio.toFixed(2)}</td>
                      <td>S/. {i.subtotal.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h3 className={styles.total}>TOTAL: S/ {total.toFixed(2)}</h3>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setShowPreview(false)}>
                Volver
              </button>
              <button className={styles.btnPrimary} onClick={handleSave}>
                Generar PDF
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
