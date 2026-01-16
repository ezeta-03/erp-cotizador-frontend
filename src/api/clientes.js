import api from "./axios";

// Obtener clientes
export const getClientes = async () => {
  const { data } = await api.get("/clientes");
  return data;
};

// Crear cliente
export const createCliente = async (data) => {
  const res = await api.post("/clientes", data);
  return res.data;
};

// Actualizar cliente
export const updateCliente = async (id, data) => {
  const res = await api.put(`/clientes/${id}`, data);
  return res.data;
};

// Eliminar cliente
export const deleteCliente = async (id) => {
  const res = await api.delete(`/clientes/${id}`);
  return res.data;
};

// Invitar cliente
export const invitarCliente = async (clienteId, email) => {
  const res = await api.post(`/clientes/${clienteId}/invitar`, { email });
  return res.data;
};

// Actividad general de clientes
export const getActividadClientes = async (filtros) => {
  const res = await api.get("/clientes/actividad", {
    params: filtros,
  });
  return res.data;
};

// Actividades por cliente
export const actividadesClientes = async (clienteId) => {
  const res = await api.get(`/clientes/${clienteId}/actividad`);
  return res.data;
};
