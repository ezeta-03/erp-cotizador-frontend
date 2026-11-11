import api from "./axios";
import { descargarBlob } from "./comprobantes";

// Estado de Flujo de Efectivo. ADMIN / CONTABLE.

// { desde, hasta, meses: [{ clave: "2026-01", etiqueta }], entradas, salidas, salidasPorLinea,
//   neto: { total, meses }, acumulado: { [mes]: monto }, retencionesExcluidas }
// Cada bloque: { filas: [{ clave, nombre, meses, total, porcentaje, detalle: [...] }], totales: { total, meses } }
export const getFlujoEfectivo = async ({ desde, hasta }) => {
  const { data } = await api.get("/flujo-efectivo", { params: { desde, hasta } });
  return data;
};

// formato: "xlsx" | "pdf"
export const descargarFlujoEfectivo = async ({ desde, hasta }, formato) => {
  const { data } = await api.get("/flujo-efectivo", { params: { desde, hasta, formato }, responseType: "blob", timeout: 120000 });
  descargarBlob(data, `flujo-de-efectivo-${desde}-al-${hasta}.${formato}`);
};
