import api from "./axios";

export const getReservas    = (anio)     => api.get("/reservas", { params: { anio } }).then(r => r.data);
export const createReserva  = (data)     => api.post("/reservas", data).then(r => r.data);
export const updateReserva  = (id, data) => api.put(`/reservas/${id}`, data).then(r => r.data);
export const deleteReserva  = (id)       => api.delete(`/reservas/${id}`).then(r => r.data);
