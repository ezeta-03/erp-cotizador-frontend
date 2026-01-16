import api from "./axios";

export const cambiarEstadoUsuario = async (id, activo) => {
  const { data } = await api.patch(`/usuarios/${id}/estado`, { activo });
  return data;
};

// Reinvitar usuario (ADMIN)
export const reinvitarUsuario = async (id, email) => {
  const { data } = await api.post(`/usuarios/${id}/reinvitacion`, { email });
  return data;
};

export const getUsuarios = async () => {
  const { data } = await api.get("/usuarios");
  return data;
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
