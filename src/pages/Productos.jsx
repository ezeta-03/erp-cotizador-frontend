import { useEffect, useState } from "react";
import "./productoModal.module.scss";
import useAuth from "../auth/useAuth";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";
import ConfiguracionForm from "../coomponents/ConfiguracionForm";
import styles from "./productos.module.scss";
import ProductoModal from "./ProductoModal";
export default function Productos() {
  const [showModal, setShowModal] = useState(false);
  const [editProducto, setEditProducto] = useState(null);
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    categoria: "",
    servicio: "",
    material: "",
    unidad: "",
    costo_material: "",
  });
  const [deletingId, setDeletingId] = useState(null);
  const [editId, setEditId] = useState(null);

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
  };

  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleSave = async (producto) => {
    if (editProducto) {
      await updateProducto(editProducto.id, producto);
    } else {
      await createProducto(producto);
    }
    setShowModal(false);
    setEditProducto(null);
    cargarProductos();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      categoria: form.categoria,
      servicio: form.servicio,
      material: form.material,
      unidad: form.unidad,
      costo_material: Number(form.costo_material),
    };

    if (editId) {
      await updateProducto(editId, payload);
    } else {
      await createProducto(payload);
    }

    setForm({
      categoria: "",
      servicio: "",
      material: "",
      unidad: "",
      costo_material: "",
    });
    setEditId(null);
    cargarProductos();
  };

  const handleEdit = (producto) => {
    setEditProducto(producto);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    setDeletingId(id);
    setProductos((prev) => prev.filter((p) => p.id !== id));
    try {
      await deleteProducto(id);
    } catch {
      alert("No se pudo eliminar");
      cargarProductos();
    } finally {
      setDeletingId(null);
    }
  };

  // const handleImportExcel = async (e) => {
  //   const file = e.target.files[0];
  //   const formData = new FormData();
  //   formData.append("file", file);
  //   await fetch("/api/productos/import-excel", {
  //     method: "POST",
  //     body: formData,
  //   });
  //   cargarProductos();
  // };

  return (
    <div className={styles.container}>
      <h2>Productos</h2>
      <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
        🎱 Nuevo Producto
      </button>

      {/* <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} /> */}
      {showModal && (
        <ProductoModal
          producto={editProducto}
          onSave={handleSave}
          onClose={() => {
            setShowModal(false);
            setEditProducto(null);
          }}
        />
      )}

      {user.role === "ADMIN" && (
        <ConfiguracionForm onRecalcular={cargarProductos} />
      )}

      <hr />

      <table>
        <thead>
          <tr>
            <th>Categoría</th>
            <th>Servicio</th>
            <th>Material</th>
            <th>Unidad</th>
            <th>Costo Material (S/.)</th>
            <th>Costo Parcial 1</th>
            <th>Costo Parcial 2</th>
            <th>Precio Final</th>
            <th>Margen</th>
            {(user.role === "ADMIN" || user.role === "VENTAS") && (
              <th>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.categoria}</td>
              <td>{p.servicio}</td>
              <td>{p.material}</td>
              <td>{p.unidad}</td>
              <td>{p.costo_material.toFixed(2)}</td>
              <td>{p.costo_parcial_1.toFixed(2)}</td>
              <td>{p.costo_parcial_2.toFixed(2)}</td>
              <td>{p.precio_final.toFixed(2)}</td>
              <td>{p.margen.toFixed(2)}</td>
              {(user.role === "ADMIN" || user.role === "VENTAS") && (
                <td>
                  <button
                    className={styles.btnEdit}
                    onClick={() => handleEdit(p)}
                  >
                    ✒️
                  </button>
                  {user.role === "ADMIN" && (
                    <button
                      className={`${styles.btnDelete} ${deletingId === p.id ? styles.loading : ""}`}
                      onClick={() => handleDelete(p.id)}
                      disabled={deletingId === p.id}
                    >
                      {deletingId === p.id ? (
                        <span className={styles.spinner}></span>
                      ) : (
                        "❌"
                      )}
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
