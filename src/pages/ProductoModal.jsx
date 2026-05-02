import { useState, useEffect } from "react";
import { X } from "lucide-react";
import styles from "./productos.module.scss";

export default function ProductoModal({ producto, onSave, onClose }) {
  const [form, setForm] = useState({
    categoria: "",
    servicio: "",
    material: "",
    unidad: "",
    costo_material: "",
    adicionales: [],
  });

  useEffect(() => {
    if (producto) {
      setForm({
        categoria: producto.categoria || "",
        servicio: producto.servicio || "",
        material: producto.material || "",
        unidad: producto.unidad || "",
        costo_material: producto.costo_material?.toString() || "",
        adicionales: producto.adicionales || [],
      });
    }
  }, [producto]);

  // Conversión a número
  const costoMaterialNum = parseFloat(form.costo_material) || 0;

  // Cálculos automáticos
  const costoParcial1 = costoMaterialNum * 1.1;
  const costoParcial2 = costoParcial1 * 1.17;
  const precioFinal = costoParcial2; // solo el resultado de los incrementos
  const margen = precioFinal * 0.2;

  // Manejo de adicionales
  const addAdicional = () => {
    setForm({
      ...form,
      adicionales: [...form.adicionales, { nombre: "", precio: "" }],
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
      costo_material: costoMaterialNum,
      costo_parcial_1: costoParcial1,
      costo_parcial_2: costoParcial2,
      precio_final: precioFinal,
      margen,
      adicionales: form.adicionales.map((a) => ({
        ...a,
        precio: parseFloat(a.precio) || 0,
      })),
    });
  };

  return (
    <div className={styles.formOverlay}>
      <div className={styles.formModal}>
        <div className={styles.formModalHeader}>
          <h3>{producto ? "Editar Producto" : "Nuevo Producto"}</h3>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className={styles.formModalBody}>
          {/* Primera fila: Categoría y Servicio */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Categoría</label>
              <input
                placeholder="Categoría"
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Servicio</label>
              <input
                placeholder="Servicio"
                value={form.servicio}
                onChange={(e) => setForm({ ...form, servicio: e.target.value })}
              />
            </div>
          </div>

          {/* Segunda fila: Material */}
          <div className={styles.formField}>
            <label>Material</label>
            <input
              placeholder="Material"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
            />
          </div>

          {/* Tercera fila: Unidad y Costo Material */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Unidad</label>
              <input
                placeholder="Unidad"
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
              />
            </div>
            <div className={styles.formField}>
              <label>Costo Material</label>
              <input
                type="number"
                step="0.01"
                placeholder="Costo Material"
                value={form.costo_material}
                onChange={(e) =>
                  setForm({ ...form, costo_material: e.target.value })
                }
              />
            </div>
          </div>

          <h3>Adicionales</h3>
          {form.adicionales.map((a, i) => (
            <div key={i} className={styles.adicionalItem}>
              <input
                className={styles.adicionalInput}
                placeholder="Nombre"
                value={a.nombre}
                onChange={(e) => updateAdicional(i, "nombre", e.target.value)}
              />
              <input
                className={styles.adicionalInput}
                type="number"
                step="0.01"
                placeholder="Precio"
                value={a.precio}
                onChange={(e) => updateAdicional(i, "precio", e.target.value)}
              />
              <button
                type="button"
                className={styles.btnEliminarAdicional}
                onClick={() => removeAdicional(i)}
              >
                ❌
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addAdicional}
            className={styles.btnAdicional}
          >
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

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>
              Guardar
            </button>
            <button
              type="button"
              className={styles.btnGhost}
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
