import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";

export default function Productos() {
  const { user } = useAuth();
  const [productos, setProductos] = useState([]);
  const [form, setForm] = useState({
    categoria: "",
    servicio: "",
    material: "",
    unidad: "",
    costo_material: "",
  });

  const [editId, setEditId] = useState(null);

  // ✅ función normal (NO useCallback)
  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
  };

  // ✅ effect correcto
  useEffect(() => {
    cargarProductos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      nombre: "",
      precio_material: "",
      precio_mano_obra: "",
    });
    setEditId(null);
    cargarProductos();
  };

  const handleEdit = (producto) => {
    setForm({
      nombre: producto.nombre,
      precio_material: producto.precio_material,
      precio_mano_obra: producto.precio_mano_obra,
    });
    setEditId(producto.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;
    await deleteProducto(id);
    cargarProductos();
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);
    await fetch("/api/productos/import-excel", {
      method: "POST",
      body: formData,
    });
    cargarProductos();
  };

  return (
    <div>
      <h2>Productos</h2>
      <input type="file" accept=".xlsx,.xls" onChange={handleImportExcel} />
      {(user.role === "ADMIN" || user.role === "VENTAS") && (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <input
            placeholder="Precio"
            type="number"
            step="0.01"
            value={form.precio_material}
            onChange={(e) =>
              setForm({ ...form, precio_material: e.target.value })
            }
            required
          />

          <input
            placeholder="Precio Mano de Obra"
            type="number"
            step="0.01"
            value={form.precio_mano_obra}
            onChange={(e) =>
              setForm({ ...form, precio_mano_obra: e.target.value })
            }
            required
          />

          <button className="btn-primary">
            {editId ? "Actualizar" : "Crear"}
          </button>
        </form>
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
                  <button onClick={() => handleEdit(p)}>Editar</button>
                  {user.role === "ADMIN" && (
                    <button onClick={() => handleDelete(p.id)}>Eliminar</button>
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
