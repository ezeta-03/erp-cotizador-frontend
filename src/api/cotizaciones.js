import api from "./axios";

// ADMIN / VENTAS
export const crearCotizacion = async (data) => {
  const { data: res } = await api.post("/cotizaciones", data);
  return res;
};

export const getCotizaciones = async () => {
  const { data } = await api.get("/cotizaciones");
  return data;
};

// CLIENTE → última cotización
export const getMiUltimaCotizacion = async () => {
  const { data } = await api.get("/cotizaciones/mia");
  return data;
};

// Obtener cotización específica por ID
export const getCotizacionById = async (id) => {
  const { data } = await api.get(`/cotizaciones/${id}`);
  return data;
};

// CLIENTE → todas sus cotizaciones
export const getMisCotizaciones = async () => {
  const { data } = await api.get("/cotizaciones/mis-cotizaciones");
  return data;
};

// CLIENTE → aprobar / rechazar
export const responderCotizacion = async (id, estado, comentario) => {
  const { data } = await api.post(`/cotizaciones/${id}/responder`, { estado, comentario });
  return data;
};

// VENTAS/ADMIN → renegociar cotización rechazada
export const renegociarCotizacion = async (id, payload) => {
  const { data } = await api.post(`/cotizaciones/${id}/renegociar`, payload);
  return data;
};

// Log de cambios de estado
export const getCotizacionLog = async (id) => {
  const { data } = await api.get(`/cotizaciones/${id}/log`);
  return data;
};
