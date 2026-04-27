import { useEffect, useState, useCallback } from "react";
import useAuth from "../auth/useAuth";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  invitarCliente,
  getActividadClientes,
} from "../api/clientes";
import styles from "./clientes.module.scss";
import ClienteFormModal from "../pages/ClienteFormModal";
import ActividadClienteModal from "../pages/ActividadClienteModal";

// Badge de estado del usuario vinculado al cliente
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
        Activo
      </span>
    );
  }
  return (
    <span style={{ fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "99px", background: "#fef9c3", color: "#854d0e", fontWeight: 600 }}>
      Invitado
    </span>
  );
}

export default function Clientes() {
  const { user } = useAuth();
  const [clientes, setClientes] = useState([]);
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

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editId) {
      await updateCliente(editId, { ...form });
    } else {
      await createCliente({ ...form });
    }
    setForm({ nombreComercial: "", documento: "", nombreContacto: "", telefono: "", email: "", direccion: "" });
    setEditId(null);
    setShowFormModal(false);
    cargarClientes();
  };

  const handleEdit = (cliente) => {
    setForm({
      nombreComercial: cliente.nombreComercial,
      documento: cliente.documento || "",
      nombreContacto: cliente.nombreContacto || "",
      telefono: cliente.telefono || "",
      email: cliente.email || "",
      direccion: cliente.direccion || "",
    });
    setEditId(cliente.id);
    setShowFormModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Eliminar cliente?")) return;
    await deleteCliente(id);
    cargarClientes();
  };

  const handleInvitar = async (cliente) => {
    const emailSugerido = cliente.email || "";
    const email = prompt(
      `${cliente.usuario ? "Reenviar invitación a" : "Invitar a"} ${cliente.nombreComercial}.\nEmail:`,
      emailSugerido
    );
    if (!email) return;
    setInvitandoId(cliente.id);
    try {
      await invitarCliente(cliente.id, email);
      alert("📧 Invitación enviada correctamente");
      cargarClientes();
    } catch (error) {
      alert("❌ " + (error.response?.data?.message || error.message));
    } finally {
      setInvitandoId(null);
    }
  };

  const handleActividad = async (cliente) => {
    const data = await getActividadClientes({ clienteId: cliente.id });
    setActividad(data);
    setSelectedCliente(cliente);
  };

  const puedeGestionar = user.role === "ADMIN" || user.role === "VENTAS";

  return (
    <div className={styles.container}>
      <h2>Gestión de Clientes</h2>

      {puedeGestionar && (
        <button className={styles.btnAdd} onClick={() => setShowFormModal(true)}>
          🙋 Crear Cliente
        </button>
      )}

      <div className={styles.lista}>
        {clientes.map((c) => (
          <div key={c.id} className={styles.card} onClick={() => handleActividad(c)}>
            <div className={styles.header}>
              <span className={styles.nombre}>{c.nombreComercial}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <EstadoUsuarioBadge usuario={c.usuario} />
                <span className={styles.documento}>{c.documento}</span>
              </div>
            </div>
            <p className={styles.contacto}>{c.nombreContacto}</p>
            <p className={styles.email}>{c.email}</p>
            <p className={styles.telefono}>{c.telefono}</p>
            <p className={styles.direccion}>{c.direccion}</p>

            {puedeGestionar && (
              <div className={styles.actions}>
                <button className={styles.btnEdit} onClick={(e) => { e.stopPropagation(); handleEdit(c); }}>
                  🛡 Editar
                </button>
                <button className={styles.btnDelete} onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                  ❌ Eliminar
                </button>
                {/* Solo mostrar invitar si el cliente no tiene cuenta activa */}
                {(!c.usuario || !c.usuario.activo) && (
                  <button
                    className={styles.btnInvite}
                    disabled={invitandoId === c.id}
                    onClick={(e) => { e.stopPropagation(); handleInvitar(c); }}
                  >
                    🚸 {c.usuario ? "Reinvitar" : "Invitar"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showFormModal && (
        <ClienteFormModal
          form={form}
          setForm={setForm}
          editId={editId}
          onSubmit={handleSubmit}
          onCancel={() => { setShowFormModal(false); setEditId(null); }}
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
