import api from "./axios";

export const getResumenDashboard = () => api.get("/dashboard/resumen").then(r => r.data);
