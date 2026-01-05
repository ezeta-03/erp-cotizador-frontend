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
import FiltrosClientes from "..//coomponents/FiltrosClientes";
import { getActividadClientes } from "../api/clientes";
import { invitarCliente } from "../api/clientes";

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

  const [actividad, setActividad] = useState([]);
  const buscarActividad = async (filtros) => {
    const data = await getActividadClientes(filtros);
    setActividad(data);
  };
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

  const handleInvitar = async (cliente) => {
    const email = prompt(
      `Email para invitar a ${cliente.nombre}:`,
      cliente.email || ""
    );

    if (!email) return;

    try {
      await invitarCliente(cliente.id, email);
      alert("📧 Invitación enviada correctamente");
    } catch (error) {
      alert(error.response?.data?.message || "Error enviando invitación");
    }
  };

  return (
    <div>
      <h2>Clientes</h2>
      <FiltrosClientes onBuscar={buscarActividad} />

      {actividad.length > 0 && (
        <>
          <h3>Actividad de Clientes</h3>
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>N° Cotización</th>
                <th>Producto</th>
                <th>Fecha</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {actividad.map((c) => (
                <tr key={c.id}>
                  <td>{c.cliente.nombre}</td>
                  <td>{c.numero}</td>
                  <td>{c.items.map((i) => i.producto.nombre).join(", ")}</td>
                  <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td>S/. {c.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

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
                    <>
                      <button
                        className="btn-delete"
                        onClick={() => handleDelete(c.id)}
                      >
                        Eliminar
                      </button>
                      <button
                        className="btn-secondary"
                        onClick={() => handleInvitar(c)}
                      >
                        Invitar
                      </button>
                    </>
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
