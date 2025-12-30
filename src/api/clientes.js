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
