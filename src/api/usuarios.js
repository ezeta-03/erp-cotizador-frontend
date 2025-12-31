import api from "./axios";

export const getUsuarios = async () => {
  const res = await api.get("/usuarios");
  return res.data;
};

export const createUsuario = async (data) => {
  const res = await api.post("/usuarios", data);
  return res.data;
};

export const updateUsuario = async (id, data) => {
  const res = await api.put(`/usuarios/${id}`, data);
  return res.data;
};

export const deleteUsuario = async (id) => {
  const res = await api.delete(`/usuarios/${id}`);
  return res.data;
};
