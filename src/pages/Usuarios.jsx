import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
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

function RolBadge({ role }) {
  const map = {
    ADMIN:    { bg: "#ede9fe", color: "#5b21b6" },
    VENTAS:   { bg: "#dbeafe", color: "#1e40af" },
    CONTABLE: { bg: "#d1fae5", color: "#065f46" },
  };
  const s = map[role] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: s.bg, color: s.color, fontWeight: 600 }}>
      {role}
    </span>
  );
}

function EstadoBadge({ activo }) {
  if (activo) {
    return (
      <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
        Activo
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#fef9c3", color: "#854d0e", fontWeight: 600 }}>
      Inactivo
    </span>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <label className={`${styles.toggle} ${checked ? styles.toggleOn : ""}`}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
    </label>
  );
}

export default function Usuarios() {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [vista, setVista] = useState("tabla");
  const [form, setForm] = useState({ nombre: "", email: "", password: "", role: "VENTAS" });
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

  useEffect(() => { cargarUsuarios(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { nombre: form.nombre, email: form.email, role: form.role };
    if (editId) {
      if (form.password) payload.password = form.password;
      await updateUsuario(editId, payload);
    } else {
      await createUsuario(payload);
    }
    setForm({ nombre: "", email: "", password: "", role: "VENTAS" });
    setEditId(null);
    setShowModal(false);
    cargarUsuarios();
  };

  const handleEdit = (u) => {
    setForm({ nombre: u.nombre, email: u.email, password: "", role: u.role });
    setEditId(u.id);
    setShowModal(true);
  };

  const handleToggleEstado = async (u, nuevoEstado) => {
    const accion = nuevoEstado ? "activar" : "desactivar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${u.nombre}?`)) return;
    await cambiarEstadoUsuario(u.id, nuevoEstado);
    cargarUsuarios();
  };

  const handleReinvitar = async (u) => {
    const email = prompt(`Reinvitar a ${u.nombre}. Email:`, u.email || "");
    if (!email) return;
    await reinvitarUsuario(u.id, email);
    alert("Invitación reenviada correctamente");
  };

  if (user.role !== "ADMIN") return <p>No autorizado</p>;

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Usuarios</h2>
        <div className={styles.toolbarActions}>
          <button
            className={styles.btnView}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={15} /> : <LayoutGrid size={15} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          <button className={styles.btnAdd} onClick={() => { setEditId(null); setForm({ nombre: "", email: "", password: "", role: "VENTAS" }); setShowModal(true); }}>
            <Plus size={15} /> Invitar usuario
          </button>
        </div>
      </div>

      {/* ── Vista tarjetas ── */}
      {vista === "cards" && (
        <div className={styles.lista}>
          {usuarios.map((u) => (
            <div key={u.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.nombre}>{u.nombre}</span>
                <EstadoBadge activo={u.activo} />
              </div>
              <p className={styles.email}>{u.email}</p>
              <p className={styles.role}><RolBadge role={u.role} /></p>
              <div className={styles.cardActions}>
                {u.activo && (
                  <button className={styles.btnEdit} onClick={() => handleEdit(u)}>Editar</button>
                )}
                {!u.activo && (
                  <button className={styles.btnReinvite} onClick={() => handleReinvitar(u)}>Reinvitar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Vista tabla ── */}
      {vista === "tabla" && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Rol</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div>{u.nombre}</div>
                    <div className={styles.tdSub}>{u.email}</div>
                  </td>
                  <td><RolBadge role={u.role} /></td>
                  <td>
                    <Toggle
                      checked={u.activo}
                      onChange={(val) => handleToggleEstado(u, val)}
                    />
                  </td>
                  <td>
                    <div className={styles.tdActions}>
                      {u.activo && (
                        <button className={styles.btnSmall} onClick={() => handleEdit(u)}>Editar</button>
                      )}
                      {!u.activo && (
                        <button className={styles.btnSmall} onClick={() => handleReinvitar(u)}>Reinvitar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
