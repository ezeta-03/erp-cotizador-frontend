import api from "./axios";

export const getProyectos = async (params) => {
  const { data } = await api.get("/proyectos", { params });
  return data;
};

// Un Proyecto puede crearse en cualquier momento, sin depender de una
// cotización — a la par de ellas, no como consecuencia de aprobar una.
export const crearProyecto = async (payload) => {
  const { data } = await api.post("/proyectos", payload);
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

// Presupuesto y control de costos del proyecto. Si todavía no se guardó,
// el backend devuelve un borrador armado desde el catálogo (guardado: false).
export const getPresupuestoProyecto = async (id) => {
  const { data } = await api.get(`/proyectos/${id}/presupuesto`);
  return data;
};

export const guardarPresupuestoProyecto = async (id, payload) => {
  const { data } = await api.put(`/proyectos/${id}/presupuesto`, payload);
  return data;
};

// Catálogo de partidas que aparecen precargadas en cada presupuesto nuevo.
export const getPartidasPresupuesto = async () => {
  const { data } = await api.get("/proyectos/partidas-presupuesto");
  return data;
};

export const guardarPartidasPresupuesto = async (partidas) => {
  const { data } = await api.put("/proyectos/partidas-presupuesto", { partidas });
  return data;
};
