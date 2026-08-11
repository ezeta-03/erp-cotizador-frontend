import api from "./axios";

export const getPaneles         = ()           => api.get("/paneles").then(r => r.data);
export const createPanel        = (data)       => api.post("/paneles", data).then(r => r.data);
export const updatePanel        = (id, data)   => api.put(`/paneles/${id}`, data).then(r => r.data);
export const cambiarEstadoPanel = (id, estado) => api.patch(`/paneles/${id}/estado`, { estado }).then(r => r.data);
export const deletePanel        = (id)         => api.delete(`/paneles/${id}`).then(r => r.data);
export const importarPaneles    = (filas)      => api.post("/paneles/importar", filas).then(r => r.data);
export const getPanelesEliminados = ()         => api.get("/paneles/eliminados").then(r => r.data);
export const restaurarPanel     = (id)         => api.patch(`/paneles/${id}/restaurar`).then(r => r.data);
