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
    nombre: "",
    precio_material: "",
    precio_mano_obra: "",
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
      nombre: form.nombre,
      precio_material: Number(form.precio_material),
      precio_mano_obra: Number(form.precio_mano_obra),
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

  return (
    <div>
      <h2>Productos</h2>

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

          <button>{editId ? "Actualizar" : "Crear"}</button>
        </form>
      )}

      <hr />

      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Precio Material</th>
            <th>Precio Mano de Obra</th>

            {(user.role === "ADMIN" || user.role === "VENTAS") && (
              <th>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {productos.map((p) => (
            <tr key={p.id}>
              <td>{p.nombre}</td>
              <td>{Number(p.precio_material).toFixed(2)}</td>
              <td>{Number(p.precio_mano_obra).toFixed(2)}</td>

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
