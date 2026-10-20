import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, History, X, ToggleRight } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getUsuarios,
  createUsuario,
  updateUsuario,
  cambiarEstadoUsuario,
  reinvitarUsuario,
  getUsuarioLog,
} from "../api/usuarios";
import styles from "./usuarios.module.scss";
import UsuarioFormModal from "./UsuarioFormModal";
import ModulosRolModal from "./ModulosRolModal";

const EVENTO_LABEL = {
  INVITADO:      { label: "Invitado",        bg: "var(--badge-blue-bg)", color: "var(--badge-blue-text)" },
  REINVITADO:    { label: "Re-invitado",     bg: "var(--badge-yellow-bg)", color: "var(--badge-yellow-text)" },
  ACTIVADO:      { label: "Cuenta activada", bg: "var(--badge-green-bg)", color: "var(--badge-green-text)" },
  DESACTIVADO:   { label: "Desactivado",     bg: "var(--badge-red-bg)", color: "var(--badge-red-text)" },
  ACTIVADO_ADMIN:{ label: "Activado (admin)",bg: "var(--badge-green-bg)", color: "var(--badge-green-text)" },
};

function RolBadge({ role }) {
  return (
    <span className={styles.roleBadge} data-role={role}>
      {role}
    </span>
  );
}

function EstadoBadge({ activo }) {
  if (activo) return <span className={styles.badgeActivo}>Activo</span>;
  return <span className={styles.badgeInactivo}>Inactivo</span>;
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
  const [logUsuario, setLogUsuario] = useState(null);
  const [logEntradas, setLogEntradas] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [showModulos, setShowModulos] = useState(false);

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

  const handleVerLog = async (u) => {
    setLogUsuario(u);
    setLoadingLog(true);
    setLogEntradas([]);
    try {
      const data = await getUsuarioLog(u.id);
      setLogEntradas(data);
    } catch {
      setLogEntradas([]);
    } finally {
      setLoadingLog(false);
    }
  };

  if (user.role !== "ADMIN") return <p>No autorizado</p>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Usuarios</h1>
          <p className={styles.subtitle}>Gestión de accesos y roles del sistema</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={() => setShowModulos(true)} title="Qué módulos ve cada rol">
            <ToggleRight size={18} /> Módulos por rol
          </button>
          <button
            className={styles.btnOutline}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={18} /> : <LayoutGrid size={18} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          <button className={styles.btnPrimary} onClick={() => { setEditId(null); setForm({ nombre: "", email: "", password: "", role: "VENTAS" }); setShowModal(true); }}>
            <Plus size={18} /> Invitar usuario
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
              <div className={styles.cardBody}>
                <p className={styles.email}>{u.email}</p>
                <p className={styles.role}><RolBadge role={u.role} /></p>
              </div>
              <div className={styles.cardActions}>
                {u.activo && (
                  <button className={styles.btnOutline} onClick={() => handleEdit(u)}>Editar</button>
                )}
                {!u.activo && (
                  <button className={styles.btnOutline} onClick={() => handleReinvitar(u)}>Reinvitar</button>
                )}
                <button className={styles.btnOutline} onClick={() => handleVerLog(u)} title="Ver historial">
                  <History size={14} />
                </button>
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
                        <button className={styles.btnGhost} onClick={() => handleEdit(u)}>Editar</button>
                      )}
                      {!u.activo && (
                        <button className={styles.btnGhost} onClick={() => handleReinvitar(u)}>Reinvitar</button>
                      )}
                      <button
                        className={styles.btnGhost}
                        onClick={() => handleVerLog(u)}
                        title="Ver historial de actividad"
                        style={{ padding: "0.3rem 0.5rem" }}
                      >
                        <History size={14} />
                      </button>
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

      {/* ── Modal historial de usuario ── */}
      {logUsuario && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(3px)", zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: "12px", width: "100%", maxWidth: "500px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "var(--text-md)" }}>
                  Historial — {logUsuario.nombre}
                </p>
                <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>{logUsuario.email}</p>
              </div>
              <button
                onClick={() => setLogUsuario(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text3)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1rem 1.25rem", maxHeight: "400px", overflowY: "auto" }}>
              {loadingLog ? (
                <p style={{ color: "var(--color-text3)", fontSize: "var(--text-base)" }}>Cargando...</p>
              ) : logEntradas.length === 0 ? (
                <p style={{ color: "var(--color-text3)", fontSize: "var(--text-base)" }}>Sin actividad registrada aún.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {logEntradas.map((e) => {
                    const ev = EVENTO_LABEL[e.evento] || { label: e.evento, bg: "var(--badge-gray-bg)", color: "var(--color-text2)" };
                    return (
                      <div key={e.id} style={{
                        display: "flex", gap: "0.75rem", alignItems: "flex-start",
                        padding: "0.6rem 0.75rem", background: "var(--color-bg)",
                        borderRadius: "8px", border: "1px solid var(--color-border)",
                      }}>
                        <span style={{
                          fontSize: "var(--text-2xs)", fontWeight: 700, padding: "0.15rem 0.5rem",
                          borderRadius: "99px", background: ev.bg, color: ev.color,
                          whiteSpace: "nowrap", marginTop: "0.1rem",
                        }}>
                          {ev.label}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {e.realizadoPor && (
                            <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-text2)", fontWeight: 500 }}>
                              por {e.realizadoPor.nombre}
                            </p>
                          )}
                          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
                            {new Date(e.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                            {" · "}
                            {new Date(e.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showModulos && <ModulosRolModal onClose={() => setShowModulos(false)} />}
    </div>
  );
}
