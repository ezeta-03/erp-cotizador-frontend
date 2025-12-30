import api from "./axios";

export const crearCotizacion = async (data) => {
  const res = await api.post("/cotizaciones", data);
  return res.data;
};
