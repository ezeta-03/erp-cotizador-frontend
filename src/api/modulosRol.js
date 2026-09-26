import api from "./axios";

// { disponibles: { VENTAS: [...], CONTABLE: [...] }, habilitados: { ... } }
export const getModulosRol = async () => {
  const { data } = await api.get("/modulos-rol");
  return data;
};

export const guardarModulosRol = async (rol, modulos) => {
  const { data } = await api.put(`/modulos-rol/${rol}`, { modulos });
  return data;
};
