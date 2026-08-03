import api from "./axios";

export const getEventosProduccion = () => api.get("/eventos-produccion").then(r => r.data);
export const crearEventoProduccion = (data) => api.post("/eventos-produccion", data).then(r => r.data);
export const eliminarEventoProduccion = (id) => api.delete(`/eventos-produccion/${id}`).then(r => r.data);
