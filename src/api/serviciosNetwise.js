import api from "./axios";

// Catálogo de servicios del módulo Netwise (usuarios Netwise y Admin).
export const getServiciosNetwise = async ({ todos = false } = {}) => {
  const { data } = await api.get("/servicios-netwise", { params: todos ? { todos: 1 } : undefined });
  return data;
};

export const guardarServicioNetwise = async ({ id, ...datos }) => {
  const { data } = id
    ? await api.put(`/servicios-netwise/${id}`, datos)
    : await api.post("/servicios-netwise", datos);
  return data;
};

export const eliminarServicioNetwise = async (id) => {
  const { data } = await api.delete(`/servicios-netwise/${id}`);
  return data;
};
