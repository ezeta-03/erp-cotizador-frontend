import api from "./axios";

// Reportes de Zaazmago. ADMIN / CONTABLE.

// { desde, hasta, corte, meses: [{ clave, etiqueta, facturado, recaudado, porCobrar }],
//   totales: { facturado, recaudado, porCobrar, cobradoDeLoFacturado, porcentajeCobrado } }
export const getRecaudoVsCobrar = async ({ desde, hasta }) => {
  const { data } = await api.get("/reportes/recaudo", { params: { desde, hasta } });
  return data;
};
