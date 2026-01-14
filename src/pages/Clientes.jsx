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

  const cargarClientes = useCallback(async () => {
    const data = await getClientes();
    setClientes(data);
  }, []);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (editId) {
      await updateCliente(editId, payload);
    } else {
      await createCliente(payload);
    }
    setForm({
      nombreComercial: "",
      documento: "",
      nombreContacto: "",
      telefono: "",
      email: "",
      direccion: "",
    });
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
    const email = prompt(`Email para invitar a ${cliente.nombreComercial}:`, cliente.email || "");
    if (!email) return;
    await invitarCliente(cliente.id, email);
    alert("📧 Invitación enviada correctamente");
  };

  const handleActividad = async (cliente) => {
    const data = await getActividadClientes({ clienteId: cliente.id });
    setActividad(data);
    setSelectedCliente(cliente);
  };

  return (
    <div className={styles.container}>
      <h2>Gestión de Clientes</h2>

      {(user.role === "ADMIN" || user.role === "VENTAS") && (
        <button className={styles.btnAdd} onClick={() => setShowFormModal(true)}>
          ➕ Crear Cliente
        </button>
      )}

      <div className={styles.lista}>
        {clientes.map((c) => (
          <div key={c.id} className={styles.card} onClick={() => handleActividad(c)}>
            <div className={styles.header}>
              <span className={styles.nombre}>{c.nombreComercial}</span>
              <span className={styles.documento}>{c.documento}</span>
            </div>
            <p className={styles.contacto}>{c.nombreContacto}</p>
            <p className={styles.email}>{c.email}</p>
            <p className={styles.telefono}> {c.telefono}</p>
            <p className={styles.direccion}> {c.direccion}</p>

            {(user.role === "ADMIN" || user.role === "VENTAS") && (
              <div className={styles.actions}>
                <button className={styles.btnEdit} onClick={(e) => { e.stopPropagation(); handleEdit(c); }}>
                  Editar
                </button>
                {user.role === "ADMIN" && (
                  <>
                    <button className={styles.btnDelete} onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                      Eliminar
                    </button>
                    <button className={styles.btnInvite} onClick={(e) => { e.stopPropagation(); handleInvitar(c); }}>
                      Invitar
                    </button>
                  </>
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
