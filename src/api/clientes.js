import api from "./axios";

export const getClientes = async () => {
  const res = await api.get("/clientes");
  return res.data;
};

export const createCliente = async (data) => {
  const res = await api.post("/clientes", data);
  return res.data;
};

export const updateCliente = async (id, data) => {
  const res = await api.put(`/clientes/${id}`, data);
  return res.data;
};

export const deleteCliente = async (id) => {
  const res = await api.delete(`/clientes/${id}`);
  return res.data;
};

// export const getActividadClientes = async (params) => {
//   const res = await api.get("/clientes/actividad", { params });
//   return res.data;
// };

export const invitarCliente = async (clienteId, email) => {
  const res = await api.post(`/clientes/${clienteId}/invitar`, { email });
  return res.data;
};

export const getActividadClientes = async (filtros) => {
  const token = localStorage.getItem("token");
  const res = await api.get("/clientes/actividad", {
    headers: { Authorization: `Bearer ${token}` },
    params: filtros,
  });
  return res.data;
};
