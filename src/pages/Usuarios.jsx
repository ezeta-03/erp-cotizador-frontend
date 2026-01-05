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
    clienteId: "",
  });
  const [editId, setEditId] = useState(null);
  // const [loading, setLoading] = useState(false);

  const cargarUsuarios = async () => {
    try {
      // setLoading(true);
      const data = await getUsuarios();
      setUsuarios(data);
      // setLoading(false);
    } catch (error) {
      console.error("Error cargando usuarios", error);
      setUsuarios([]);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getUsuarios();
        if (mounted) setUsuarios(data);
      } catch (error) {
        console.error("Error cargando usuarios", error);
        if (mounted) setUsuarios([]);
      }
    })();
    return () => (mounted = false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Construir payload correctamente
    const base = {
      nombre: form.nombre,
      email: form.email,
      role: form.role,
    };

    if (form.role === "CLIENTE" && form.clienteId) {
      base.clienteId = Number(form.clienteId);
    }

    const payload = { ...base };

    // En creación siempre enviar password (requerido); en edición enviar solo si se proporcionó
    if (!editId) {
      payload.password = form.password;
    } else if (form.password) {
      payload.password = form.password;
    }

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
      clienteId: "",
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
      clienteId: u.clienteId || "",
    });
    setEditId(u.id);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar usuario?")) return;
    await deleteUsuario(id);
    cargarUsuarios();
  };

  const handleCancel = () => {
    setForm({
      nombre: "",
      email: "",
      password: "",
      role: "",
      clienteId: "",
    });
    setEditId(null);
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

          
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
            >
              {" "}
              Cancelar{" "}
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
            <th>Estado</th>
            <th>Rol</th>
            {user.role === "ADMIN" && <th>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => (
            <tr key={u.id}>
              <td>{u.nombre}</td>
              <td>{u.email}</td>
              <td>{u.activo ? "✅ Activo" : "⏳ Invitado"}</td>
              <td>{u.role}</td>
              {user.role === "ADMIN" && (
                <td>
                  {u.activo && (
                    <button onClick={() => handleEdit(u)}>Editar</button>
                  )}
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
