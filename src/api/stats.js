// src/api/stats.js
import api from "./axios";

export const getEstadisticasCotizaciones = async () => {
  const { data } = await api.get("/stats/cotizaciones/estados");
  return data;
};

export const getCotizacionesPorDia = async () => {
  const { data } = await api.get("/stats/cotizaciones/por-dia");
  return data;
};

export const getMetaMensual = async (vendedorId = null) => {
  const params = vendedorId ? { vendedorId } : {};
  const { data } = await api.get("/stats/meta", { params });
  return data;
};

export const getProgresoMeta = async (vendedorId = null) => {
  const params = vendedorId ? { vendedorId } : {};
  const { data } = await api.get("/stats/progreso", { params });
  return data;
};

export const setMetaMensual = async (vendedorId, monto) => {
  const { data } = await api.post("/stats/meta", { vendedorId, monto });
  return data;
};

export const getProgresoTodosVendedores = async () => {
  const { data } = await api.get("/stats/progreso/todos");
  return data;
};
