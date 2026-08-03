import api from "./axios";

export const getRentabilidadMupis = () => api.get("/rentabilidad/mupis").then(r => r.data);
export const getOportunidadPerdida = () => api.get("/rentabilidad/oportunidad-perdida").then(r => r.data);

export const getParametrosCostoMupi = (panelId) => api.get(`/parametros-costo-mupi/${panelId}`).then(r => r.data);
export const updateParametrosCostoMupi = (panelId, data) => api.put(`/parametros-costo-mupi/${panelId}`, data).then(r => r.data);

export const updatePanelPrecioMes = (panelId, precioMes) =>
  api.patch(`/paneles/${panelId}/precio-mes`, { precioMes }).then(r => r.data);

export const updateReservaPrecioMensual = (reservaId, precioMensual) =>
  api.patch(`/reservas/${reservaId}/precio-mensual`, { precioMensual }).then(r => r.data);
