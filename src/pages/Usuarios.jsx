import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  deleteUsuario,
} from "../api/usuarios";

export default function Usuarios() {
  const { user } = useAuth();

  const [usuarios, setUsuarios] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    role: "VENTAS",
  });
  const [editId, setEditId] = useState(null);
  // const [loading, setLoading] = useState(false);

  const cargarUsuarios = async () => {
    // setLoading(true);
    const data = await getUsuarios();
    setUsuarios(data);
    // setLoading(false);
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nombre: form.nombre,
      email: Number(form.email),
      password: "",
      role: form.role,
    };

    if (editId) {
      await updateUsuario(editId, payload);
    } else {
      await createUsuario(payload);
    }

    setForm({
      nombre: "",
      email: "",
      password: "",
      role: "VENTAS",
    });
    setEditId(null);
    cargarUsuarios();
  };

  const handleEdit = (u) => {
    setForm({
      nombre: u.nombre,
      email: u.email,
      password: "",
      role: u.role,
    });
    setEditId(u.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;
    await deleteUsuario(id);
    cargarUsuarios();
  };

  if (user.role !== "ADMIN") {
    return <p>No autorizado</p>;
  }

  return (
    <div>
      <h2>Gestión de Usuarios</h2>

      {/* FORM */}
      {user.role === "ADMIN" && (
        <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
          <input
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />

          <input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />

          {!editId && (
            <input
              placeholder="Contraseña temporal"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}

          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">Administrador</option>
            <option value="VENTAS">Ventas</option>
            <option value="CLIENTE">Cliente</option>
          </select>

          <button className="btn-primary">
            {editId ? "Actualizar" : "Crear Usuario"}
          </button>
        </form>
      )}
      {/* LISTADO */}
      {/* {loading ? (
        <p>Cargando...</p>
      ) : ( */}
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            {user.role === "ADMIN" && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.email}</td>
              <td>{u.role}</td>
              {user.role === "ADMIN" && (
                <td>
                  <button onClick={() => handleEdit(u)}>Editar</button>
                  <button onClick={() => handleDelete(u.id)}>Eliminar</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {/* )} */}
    </div>
  );
}
