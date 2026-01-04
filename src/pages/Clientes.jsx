import { useEffect, useState, useCallback } from "react";
import useAuth from "../auth/useAuth";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from "../api/clientes";
import "../styles/_table.scss";
import "../styles/_forms.scss";
import "../styles/_buttons.scss";

export default function Clientes() {
  const { user } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    documento: "",
    telefono: "",
    email: "",
    direccion: "",
  });
  const [editId, setEditId] = useState(null);

  // ✅ cargar clientes (sin warnings)
  const cargarClientes = useCallback(async () => {
    const data = await getClientes();
    setClientes(data);
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nombre: form.nombre,
      documento: form.documento || null,
      telefono: form.telefono || null,
      email: form.email || null,
      direccion: form.direccion || null,
    };

    if (editId) {
      await updateCliente(editId, payload);
    } else {
      await createCliente(payload);
    }

    setForm({
      nombre: "",
      documento: "",
      telefono: "",
      email: "",
      direccion: "",
    });
    setEditId(null);
    cargarClientes();
  };

  const handleEdit = (cliente) => {
    setForm({
      nombre: cliente.nombre,
      documento: cliente.documento || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });
    setEditId(cliente.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar cliente?")) return;
    await deleteCliente(id);
    cargarClientes();
  };

  return (
    <div>
      <h2>Clientes</h2>

      {(user.role === "ADMIN" || user.role === "VENTAS") && (
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <input
            placeholder="Documento"
            value={form.documento}
            onChange={(e) => setForm({ ...form, documento: e.target.value })}
          />

          <input
            placeholder="Teléfono"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />

          <input
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <input
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
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
            <th>Nombre</th>
            <th>Correo</th>
            <th>Teléfono</th>
            {(user.role === "ADMIN" || user.role === "VENTAS") && (
              <th>Acciones</th>
            )}
          </tr>
        </thead>
        <tbody>
          {clientes.map((c) => (
            <tr key={c.id}>
              <td>{c.nombre}</td>
              <td>{c.email}</td>
              <td>{c.telefono}</td>
              {(user.role === "ADMIN" || user.role === "VENTAS") && (
                <td>
                  <button className="btn-edit" onClick={() => handleEdit(c)}>
                    Editar
                  </button>
                  {user.role === "ADMIN" && (
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(c.id)}
                    >
                      Eliminar
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
