import { useState, useEffect } from "react";
import styles from "./productoModal.module.scss";

export default function ProductoModal({ producto, onSave, onClose }) {
  const [form, setForm] = useState({
    categoria: "",
    servicio: "",
    material: "",
    unidad: "",
    costo_material: "",
    costo_parcial_1: "",
    costo_parcial_2: "",
    precio_final: "",
    margen: "",
    adicionales: [],
  });

  useEffect(() => {
    if (producto) {
      setForm({
        categoria: producto.categoria || "",
        servicio: producto.servicio || "",
        material: producto.material || "",
        unidad: producto.unidad || "",
        costo_material: producto.costo_material || "",
        costo_parcial_1: producto.costo_parcial_1 || "",
        costo_parcial_2: producto.costo_parcial_2 || "",
        precio_final: producto.precio_final || "",
        margen: producto.margen || "",
        adicionales: producto.adicionales || [],
      });
    }
  }, [producto]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  // const addAdicional = () => {
  //   setForm({
  //     ...form,
  //     adicionales: [...form.adicionales, { nombre: "", precio: 0 }],
  //   });
  // };

  // const updateAdicional = (index, field, value) => {
  //   const nuevos = [...form.adicionales];
  //   nuevos[index][field] = value;
  //   setForm({ ...form, adicionales: nuevos });
  // };

  // const precioFinal =
  //   Number(form.costo_material) +
  //   form.adicionales.reduce((acc, a) => acc + Number(a.precio), 0);

  // const handleSubmit = (e) => {
  //   e.preventDefault();
  //   onSave({ ...form, precio_final: precioFinal });
  // };

  return (
    <div className={styles.modalOverlay}>
      {" "}
      <div className={styles.modal}>
        {" "}
        <h2>{producto ? "Editar Producto" : "Nuevo Producto"}</h2>{" "}
        <form onSubmit={handleSubmit}>
          {" "}
          <input
            placeholder="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          />{" "}
          <input
            placeholder="Servicio"
            value={form.servicio}
            onChange={(e) => setForm({ ...form, servicio: e.target.value })}
          />{" "}
          <input
            placeholder="Material"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
          />{" "}
          <input
            placeholder="Unidad"
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
          />{" "}
          <input
            type="number"
            step="0.01"
            placeholder="Costo Material"
            value={form.costo_material}
            onChange={(e) =>
              setForm({ ...form, costo_material: e.target.value })
            }
          />{" "}
          {/* campos adicionales */}{" "}
          <input
            type="number"
            step="0.01"
            placeholder="Costo Parcial 1"
            value={form.costo_parcial_1}
            onChange={(e) =>
              setForm({ ...form, costo_parcial_1: e.target.value })
            }
          />{" "}
          <input
            type="number"
            step="0.01"
            placeholder="Costo Parcial 2"
            value={form.costo_parcial_2}
            onChange={(e) =>
              setForm({ ...form, costo_parcial_2: e.target.value })
            }
          />{" "}
          <input
            type="number"
            step="0.01"
            placeholder="Precio Final"
            value={form.precio_final}
            onChange={(e) => setForm({ ...form, precio_final: e.target.value })}
          />{" "}
          <input
            type="number"
            step="0.01"
            placeholder="Margen"
            value={form.margen}
            onChange={(e) => setForm({ ...form, margen: e.target.value })}
          />{" "}
          <div className={styles.actions}>
            {" "}
            <button type="submit" className={styles.btnPrimary}>
              {" "}
              Guardar{" "}
            </button>{" "}
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onClose}
            >
              {" "}
              Cancelar{" "}
            </button>{" "}
          </div>{" "}
        </form>{" "}
      </div>{" "}
    </div>
  );
}
