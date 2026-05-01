import api from "./axios";

export const cambiarPassword = (actual, nueva) =>
  api.post("/auth/cambiar-password", { actual, nueva }).then((r) => r.data);
