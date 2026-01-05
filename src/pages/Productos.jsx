import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";
import ConfiguracionForm from "../coomponents/ConfiguracionForm";

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

  const cargarProductos = async () => {
    const data = await getProductos();
    setProductos(data);
  };

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
    setForm({
      categoria: producto.categoria,
      servicio: producto.servicio,
      material: producto.material,
      unidad: producto.unidad,
      costo_material: producto.costo_material,
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

      {user.role === "ADMIN" && (
        <ConfiguracionForm onRecalcular={cargarProductos} />
      )}

      {(user.role === "ADMIN" || user.role === "VENTAS") && (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Categoría"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
            required
          />

          <input
            placeholder="Servicio"
            value={form.servicio}
            onChange={(e) => setForm({ ...form, servicio: e.target.value })}
            required
          />

          <input
            placeholder="Material"
            value={form.material}
            onChange={(e) => setForm({ ...form, material: e.target.value })}
            required
          />

          <input
            placeholder="Unidad"
            value={form.unidad}
            onChange={(e) => setForm({ ...form, unidad: e.target.value })}
            required
          />

          <input
            placeholder="Costo Material"
            type="number"
            step="0.01"
            value={form.costo_material}
            onChange={(e) =>
              setForm({ ...form, costo_material: e.target.value })
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
