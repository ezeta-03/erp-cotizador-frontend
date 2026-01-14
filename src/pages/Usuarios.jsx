import { useEffect, useState } from "react";
import useAuth from "../auth/useAuth";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  cambiarEstadoUsuario,
  reinvitarUsuario,
} from "../api/usuarios";
import styles from "./usuarios.module.scss";
import UsuarioFormModal from "../pages/UsuarioFormModal";

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
  const [showModal, setShowModal] = useState(false);

  const cargarUsuarios = async () => {
    try {
      const data = await getUsuarios();
      setUsuarios(data);
    } catch (error) {
      console.error("Error cargando usuarios", error);
      setUsuarios([]);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      nombre: form.nombre,
      email: form.email,
      role: form.role,
    };
    if (!editId) {
      payload.password = form.password;
      await createUsuario(payload);
    } else {
      if (form.password) payload.password = form.password;
      await updateUsuario(editId, payload);
    }
    setForm({ nombre: "", email: "", password: "", role: "VENTAS", clienteId: "" });
    setEditId(null);
    setShowModal(false);
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
    setShowModal(true);
  };

  const handleToggleEstado = async (id, activo) => {
    if (!confirm(`¿Seguro que quieres ${activo ? "activar" : "desactivar"} este usuario?`)) return;
    await cambiarEstadoUsuario(id, activo);
    cargarUsuarios();
  };

  const handleReinvitar = async (usuario) => {
    const email = prompt(`Email para reinvitar a ${usuario.nombre}:`, usuario.email || "");
    if (!email) return;
    await reinvitarUsuario(usuario.id, email);
    alert("📧 Invitación reenviada correctamente");
  };

  if (user.role !== "ADMIN") {
    return <p>No autorizado</p>;
  }

  return (
    <div className={styles.container}>
      <h2>Gestión de Usuarios</h2>

      <button className={styles.btnAdd} onClick={() => setShowModal(true)}>
        ➕ Crear Usuario
      </button>

      <div className={styles.lista}>
        {usuarios.map((u) => (
          <div key={u.id} className={styles.card}>
            <div className={styles.header}>
              <span className={styles.nombre}>{u.nombre}</span>
              <span className={`${styles.estado} ${u.activo ? styles.activo : styles.invitado}`}>
                {u.activo ? "Activo" : "Invitado"}
              </span>
            </div>
            <p className={styles.email}>{u.email}</p>
            <p className={styles.role}>Rol: {u.role}</p>

            <div className={styles.actions}>
              {u.activo && (
                <button className={styles.btnEdit} onClick={() => handleEdit(u)}>Editar</button>
              )}
              {u.activo ? (
                <button className={styles.btnToggle} onClick={() => handleToggleEstado(u.id, false)}>
                  Desactivar
                </button>
              ) : (
                <>
                  <button className={styles.btnToggle} onClick={() => handleToggleEstado(u.id, true)}>
                    Activar
                  </button>
                  <button className={styles.btnReinvite} onClick={() => handleReinvitar(u)}>
                    Reinvitar
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <UsuarioFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          onSubmit={handleSubmit}
          onCancel={() => { setShowModal(false); setEditId(null); }}
        />
      )}
    </div>
  );
}
