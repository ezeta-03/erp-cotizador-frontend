import api from "./axios";

export const cambiarEstadoUsuario = (id, activo) =>
  api.patch(`/usuarios/${id}/estado`, { activo }).then((res) => res.data);

// Reinvitar usuario (ADMIN
export const reinvitarUsuario = (id, email) =>
  api.post(`/usuarios/${id}/reinvitacion`, { email }).then((res) => res.data);

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
