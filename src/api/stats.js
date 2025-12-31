// src/api/stats.js
import axios from "./axios";

export const getEstadisticasCotizaciones = () => axios.get("/stats/cotizaciones/estados");

export const getCotizacionesPorDia = () => axios.get("/stats/cotizaciones/por-dia");

export const getMetaMensual = (vendedorId = null) => {
  const params = vendedorId ? { vendedorId } : {};
  return axios.get("/stats/meta", { params });
};

export const getProgresoMeta = (vendedorId = null) => {
  const params = vendedorId ? { vendedorId } : {};
  return axios.get("/stats/progreso", { params });
};

export const setMetaMensual = (vendedorId, monto) =>
  axios.post("/stats/meta", { vendedorId, monto });

export const getProgresoTodosVendedores = () => axios.get("/stats/progreso/todos");