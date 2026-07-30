import api from "./axios";

export const crearSolicitud = async ({ margenSolicitado, comentario, clienteId }) => {
  const { data } = await api.post("/solicitudes-margen", { margenSolicitado, comentario, clienteId });
  return data;
};

export const getMisAprobadas = async (clienteId) => {
  if (!clienteId) return [];
  const { data } = await api.get("/solicitudes-margen/mis-aprobadas", { params: { clienteId } });
  return data;
};

export const getSolicitudes = async (estado) => {
  const { data } = await api.get("/solicitudes-margen", { params: { estado } });
  return data;
};

export const aprobarSolicitud = async (id) => {
  const { data } = await api.post(`/solicitudes-margen/${id}/aprobar`);
  return data;
};

export const rechazarSolicitud = async (id, motivo) => {
  const { data } = await api.post(`/solicitudes-margen/${id}/rechazar`, { motivo });
  return data;
};
