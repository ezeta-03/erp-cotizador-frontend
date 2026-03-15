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
  const [filters, setFilters] = useState({
    categoria: "",
    servicio: "",
    material: "",
  });

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleEdit = (producto) => {
    setEditProducto(producto);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await deleteProducto(id);
      cargarProductos();
    } catch {
      alert("No se pudo eliminar");
    }
  };

  // Filtrado dinámico
  const productosFiltrados = productos.filter((p) => {
    return (
      (filters.categoria ? p.categoria.includes(filters.categoria) : true) &&
      (filters.servicio ? p.servicio.includes(filters.servicio) : true) &&
      (filters.material ? p.material?.includes(filters.material) : true)
    );
  });

  return (
    <div className={styles.container}>
      <h2>Productos</h2>
      <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
        🎱 Nuevo Producto
      </button>

      {showModal && (
        <ProductoModal
          producto={editProducto}
          onSave={() => {
            setShowModal(false);
            setEditProducto(null);
            cargarProductos();
          }}
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

      {/* Filtros */}
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Filtrar por categoría"
          value={filters.categoria}
          onChange={(e) =>
            setFilters({ ...filters, categoria: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Filtrar por servicio"
          value={filters.servicio}
          onChange={(e) =>
            setFilters({ ...filters, servicio: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Filtrar por material"
          value={filters.material}
          onChange={(e) =>
            setFilters({ ...filters, material: e.target.value })
          }
        />
      </div>

      {/* Cards */}
      <div className={styles.lista}>
        {productosFiltrados.map((p) => (
          <div key={p.id} className={styles.card}>
            <h3>{p.categoria} - {p.servicio}</h3>
            <p><strong>Material:</strong> {p.material}</p>
            <p><strong>Unidad:</strong> {p.unidad}</p>
            <p><strong>Costo:</strong> S/. {p.costo_material.toFixed(2)}</p>
            <p><strong>Precio Final:</strong> S/. {p.precio_final.toFixed(2)}</p>
            {(user.role === "ADMIN" || user.role === "VENTAS") && (
              <div className={styles.actions}>
                <button onClick={() => handleEdit(p)}>✒️ Editar</button>
                {user.role === "ADMIN" && (
                  <button onClick={() => handleDelete(p.id)}>❌ Eliminar</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
