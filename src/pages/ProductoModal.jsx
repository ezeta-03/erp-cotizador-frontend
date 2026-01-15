import { useState, useEffect } from "react";
import styles from "./productoModal.module.scss";

export default function ProductoModal({ producto, onSave, onClose }) {
  const [form, setForm] = useState({
    categoria: "",
    servicio: "",
    material: "",
    unidad: "",
    costo_material: 0,
    adicionales: [],
  });

  // Si estamos editando, rellenar el form con los datos del producto
  useEffect(() => {
    if (producto) {
      setForm({
        categoria: producto.categoria || "",
        servicio: producto.servicio || "",
        material: producto.material || "",
        unidad: producto.unidad || "",
        costo_material: producto.costo_material || 0,
        adicionales: producto.adicionales || [],
      });
    }
  }, [producto]);

  // Cálculos automáticos
  const costoParcial1 = Number(form.costo_material) * 1.1;
  const costoParcial2 = Number(form.costo_material) * 1.17;
  const precioFinal =
    Number(form.costo_material) +
    form.adicionales.reduce((acc, a) => acc + Number(a.precio || 0), 0);
  const margen = precioFinal * 0.2;

  // Manejo de adicionales
  const addAdicional = () => {
    setForm({
      ...form,
      adicionales: [...form.adicionales, { nombre: "", precio: 0 }],
    });
  };

  const updateAdicional = (i, field, value) => {
    const nuevos = [...form.adicionales];
    nuevos[i][field] = value;
    setForm({ ...form, adicionales: nuevos });
  };

  const removeAdicional = (i) => {
    const nuevos = [...form.adicionales];
    nuevos.splice(i, 1);
    setForm({ ...form, adicionales: nuevos });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      costo_parcial_1: costoParcial1,
      costo_parcial_2: costoParcial2,
      precio_final: precioFinal,
      margen,
      adicionales: form.adicionales,
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>{producto ? "Editar Producto" : "Nuevo Producto"}</h2>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />
          <input
            placeholder="Servicio"
            value={form.servicio}
            onChange={(e) => setForm({ ...form, servicio: e.target.value })}
          />
          <input
            placeholder="Material"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
          />
          <input
            placeholder="Unidad"
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Costo Material"
            value={form.costo_material}
            onChange={(e) =>
              setForm({ ...form, costo_material: Number(e.target.value) })
            }
          />

          <h3>Adicionales</h3>
          {form.adicionales.map((a, i) => (
            <div key={i} className={styles.adicional}>
              <input
                placeholder="Nombre"
                value={a.nombre}
                onChange={(e) => updateAdicional(i, "nombre", e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio"
                value={a.precio}
                onChange={(e) => updateAdicional(i, "precio", e.target.value)}
              />
              <button type="button" onClick={() => removeAdicional(i)}>
                ❌
              </button>
            </div>
          ))}
          <button type="button" onClick={addAdicional}>
            + Adicional
          </button>

          <p>
            <strong>Costo Parcial 1:</strong> S/. {costoParcial1.toFixed(2)}
          </p>
          <p>
            <strong>Costo Parcial 2:</strong> S/. {costoParcial2.toFixed(2)}
          </p>
          <p>
            <strong>Precio Final:</strong> S/. {precioFinal.toFixed(2)}
          </p>
          <p>
            <strong>Margen:</strong> S/. {margen.toFixed(2)}
          </p>

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>
              Guardar
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
