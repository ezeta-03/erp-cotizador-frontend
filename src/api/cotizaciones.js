import api from "./axios";

// ADMIN / VENTAS
export const crearCotizacion = (data) =>
  api.post("/cotizaciones", data).then(res => res.data);

export const getCotizaciones = () =>
  api.get("/cotizaciones").then(res => res.data);

// CLIENTE → última cotización
export const getMiUltimaCotizacion = () =>
  api.get("/cotizaciones/mia").then(res => res.data);
