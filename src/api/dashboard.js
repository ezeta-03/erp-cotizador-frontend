import api from "./axios";

export const getResumenDashboard = (kinds) =>
  api.get("/dashboard/resumen", { params: { kinds: kinds.join(",") } }).then(r => r.data);
