import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getClientes,
  createCliente,
  updateCliente,
  cambiarEstadoCliente,
  invitarCliente,
  getActividadClientes,
} from "../api/clientes";
import styles from "./clientes.module.scss";
import ClienteFormModal from "../pages/ClienteFormModal";
import ActividadClienteModal from "../pages/ActividadClienteModal";

function EstadoUsuarioBadge({ usuario }) {
  if (!usuario) {
    return (
      <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#f3f4f6", color: "#6b7280", fontWeight: 600 }}>
        Sin cuenta
      </span>
    );
  }
  if (usuario.activo) {
    return (
      <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#dcfce7", color: "#166534", fontWeight: 600 }}>
        Portal activo
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#fef9c3", color: "#854d0e", fontWeight: 600 }}>
      Invitado
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

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [vista, setVista] = useState("tabla");
  const [form, setForm] = useState({
    nombreComercial: "",
    documento: "",
    nombreContacto: "",
    telefono: "",
    email: "",
    direccion: "",
  });
  const [editId, setEditId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [actividad, setActividad] = useState([]);
  const [invitandoId, setInvitandoId] = useState(null);

  const cargarClientes = useCallback(async () => {
    const data = await getClientes();
    setClientes(data);
  }, []);

  useEffect(() => { cargarClientes(); }, [cargarClientes]);

  const resetForm = () => {
    setForm({ nombreComercial: "", documento: "", nombreContacto: "", telefono: "", email: "", direccion: "" });
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await updateCliente(editId, { ...form });
    } else {
      await createCliente({ ...form });
    }
    resetForm();
    setShowFormModal(false);
    cargarClientes();
  };

  const handleEdit = (c) => {
    setForm({
      nombreComercial: c.nombreComercial,
      documento: c.documento || "",
      nombreContacto: c.nombreContacto || "",
      telefono: c.telefono || "",
      email: c.email || "",
      direccion: c.direccion || "",
    });
    setEditId(c.id);
    setShowFormModal(true);
  };

  const handleToggleEstado = async (c, nuevoEstado) => {
    const accion = nuevoEstado ? "activar" : "desactivar";
    if (!confirm(`¿Seguro que quieres ${accion} a ${c.nombreComercial}?`)) return;
    await cambiarEstadoCliente(c.id, nuevoEstado);
    cargarClientes();
  };

  const handleInvitar = async (c) => {
    const email = prompt(
      `${c.usuario ? "Reenviar invitación a" : "Invitar a"} ${c.nombreComercial}.\nEmail:`,
      c.email || ""
    );
    if (!email) return;
    setInvitandoId(c.id);
    try {
      await invitarCliente(c.id, email);
      alert("Invitación enviada correctamente");
      cargarClientes();
    } catch (error) {
      alert("Error: " + (error.response?.data?.message || error.message));
    } finally {
      setInvitandoId(null);
    }
  };

  const handleActividad = async (c) => {
    const data = await getActividadClientes({ clienteId: c.id });
    setActividad(data);
    setSelectedCliente(c);
  };

  const puedeGestionar = user.role === "ADMIN" || user.role === "VENTAS";

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <h2>Clientes</h2>
        <div className={styles.toolbarActions}>
          <button
            className={styles.btnView}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={15} /> : <LayoutGrid size={15} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          {puedeGestionar && (
            <button className={styles.btnAdd} onClick={() => { resetForm(); setShowFormModal(true); }}>
              <Plus size={15} /> Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* ── Vista tarjetas ── */}
      {vista === "cards" && (
        <div className={styles.lista}>
          {clientes.filter((c) => c.activo !== false).map((c) => (
            <div key={c.id} className={styles.card} onClick={() => handleActividad(c)}>
              <div className={styles.cardHeader}>
                <span className={styles.nombre}>{c.nombreComercial}</span>
                <EstadoUsuarioBadge usuario={c.usuario} />
              </div>
              <p className={styles.documento}>{c.documento}</p>
              <p className={styles.contacto}>{c.nombreContacto}</p>
              <p className={styles.email}>{c.email}</p>
              <p className={styles.telefono}>{c.telefono}</p>

              {puedeGestionar && (
                <div className={styles.cardActions}>
                  <button
                    className={styles.btnEdit}
                    onClick={(e) => { e.stopPropagation(); handleEdit(c); }}
                  >
                    Editar
                  </button>
                  {(!c.usuario || !c.usuario.activo) && (
                    <button
                      className={styles.btnReinvite}
                      disabled={invitandoId === c.id}
                      onClick={(e) => { e.stopPropagation(); handleInvitar(c); }}
                    >
                      {c.usuario ? "Reinvitar" : "Invitar"}
                    </button>
                  )}
                </div>
              )}
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
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Portal</th>
                <th>Activo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>{c.nombreComercial}</div>
                    <div className={styles.tdSub}>{c.documento}</div>
                  </td>
                  <td>
                    <div>{c.nombreContacto}</div>
                    <div className={styles.tdSub}>{c.email}</div>
                  </td>
                  <td><EstadoUsuarioBadge usuario={c.usuario} /></td>
                  <td>
                    {puedeGestionar && (
                      <Toggle
                        checked={c.activo !== false}
                        onChange={(val) => handleToggleEstado(c, val)}
                      />
                    )}
                  </td>
                  <td>
                    <div className={styles.tdActions}>
                      {puedeGestionar && (
                        <button className={styles.btnSmall} onClick={() => handleEdit(c)}>Editar</button>
                      )}
                      {puedeGestionar && (!c.usuario || !c.usuario.activo) && (
                        <button
                          className={styles.btnSmall}
                          disabled={invitandoId === c.id}
                          onClick={() => handleInvitar(c)}
                        >
                          {c.usuario ? "Reinvitar" : "Invitar"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showFormModal && (
        <ClienteFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          onSubmit={handleSubmit}
          onCancel={() => { setShowFormModal(false); resetForm(); }}
        />
      )}

      {selectedCliente && (
        <ActividadClienteModal
          cliente={selectedCliente}
          actividad={actividad}
          onClose={() => setSelectedCliente(null)}
        />
      )}
    </div>
  );
}
