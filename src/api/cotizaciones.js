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
