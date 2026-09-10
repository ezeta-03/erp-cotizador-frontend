import api from "./axios";

export const getProyectos = async (params) => {
  const { data } = await api.get("/proyectos", { params });
  return data;
};

export const getProyecto = async (id) => {
  const { data } = await api.get(`/proyectos/${id}`);
  return data;
};

export const actualizarProyecto = async (id, payload) => {
  const { data } = await api.put(`/proyectos/${id}`, payload);
  return data;
};

// Proyectos que viven en seguimiento-actividades (Firestore), de solo
// lectura, anotados con si ya tienen un Proyecto interno equivalente.
export const getProyectosExternos = async () => {
  const { data } = await api.get("/proyectos/externos");
  return data;
};
