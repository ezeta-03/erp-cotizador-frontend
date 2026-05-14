import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, List, Plus, Activity } from "lucide-react";
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
import ClienteFormModal from "./ClienteFormModal";
import ActividadClienteModal from "./ActividadClienteModal";

function EstadoUsuarioBadge({ usuario }) {
  if (!usuario) {
    return (
      <span className={styles.badgeInactivo}>
        Sin cuenta
      </span>
    );
  }
  if (usuario.activo) {
    return (
      <span className={styles.badgeActivo}>
        Portal activo
      </span>
    );
  }
  return (
    <span className={styles.badgeInvitado}>
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
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Clientes</h1>
          <p className={styles.subtitle}>Gestión y control de clientes</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.btnOutline}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={18} /> : <LayoutGrid size={18} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          {puedeGestionar && (
            <button className={styles.btnPrimary} onClick={() => { resetForm(); setShowFormModal(true); }}>
              <Plus size={18} /> Nuevo cliente
            </button>
          )}
        </div>
      </div>

      {/* ── Vista tarjetas ── */}
      {vista === "cards" && (
        <div className={styles.lista}>
          {clientes.filter((c) => c.activo !== false).map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.nombre}>{c.nombreComercial}</span>
                <EstadoUsuarioBadge usuario={c.usuario} />
              </div>
              <div className={styles.cardBody}>
                <p className={styles.documento}>{c.documento}</p>
                <p className={styles.contacto}>{c.nombreContacto}</p>
                <p className={styles.email}>{c.email}</p>
                <p className={styles.telefono}>{c.telefono}</p>
              </div>

              <div className={styles.cardActions}>
                <button
                  className={styles.btnOutline}
                  onClick={() => handleActividad(c)}
                >
                  <Activity size={15} /> Actividad
                </button>
                {puedeGestionar && (
                  <button
                    className={styles.btnOutline}
                    onClick={() => handleEdit(c)}
                  >
                    Editar
                  </button>
                )}
                {puedeGestionar && (!c.usuario || !c.usuario.activo) && (
                  <button
                    className={styles.btnOutline}
                    disabled={invitandoId === c.id}
                    onClick={() => handleInvitar(c)}
                  >
                    {c.usuario ? "Reinvitar" : "Invitar"}
                  </button>
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
                      <button className={styles.btnGhost} onClick={() => handleActividad(c)}>
                        <Activity size={14} /> Actividad
                      </button>
                      {puedeGestionar && (
                        <button className={styles.btnGhost} onClick={() => handleEdit(c)}>Editar</button>
                      )}
                      {puedeGestionar && (!c.usuario || !c.usuario.activo) && (
                        <button
                          className={styles.btnGhost}
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
