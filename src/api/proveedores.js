import api from "./axios";

export const getProveedores      = ()                       => api.get("/proveedores").then(r => r.data);
export const createProveedor     = (data)                   => api.post("/proveedores", data).then(r => r.data);
export const updateProveedor     = (id, data)               => api.put(`/proveedores/${id}`, data).then(r => r.data);
export const updateCuota         = (id, cuotaId, data)      => api.patch(`/proveedores/${id}/cuotas/${cuotaId}`, data).then(r => r.data);
export const deleteProveedor     = (id)                     => api.delete(`/proveedores/${id}`).then(r => r.data);
export const getResumenPagos     = (anio)                   => api.get("/proveedores/resumen-pagos", { params: { anio } }).then(r => r.data);
export const getAlertasPagos     = ()                       => api.get("/proveedores/alertas").then(r => r.data);
