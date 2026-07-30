import api from "./axios";

export const crearSolicitud = async ({ margenSolicitado, comentario, clienteId, cotizacionId, borradorId }) => {
  const { data } = await api.post("/solicitudes-margen", {
    margenSolicitado, comentario, clienteId, cotizacionId, borradorId,
  });
  return data;
};

export const getMisAprobadas = async ({ clienteId, cotizacionId, borradorId } = {}) => {
  if (!clienteId || (!cotizacionId && !borradorId)) return [];
  const { data } = await api.get("/solicitudes-margen/mis-aprobadas", {
    params: { clienteId, cotizacionId, borradorId },
  });
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
