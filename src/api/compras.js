import api from "./axios";
import { descargarBlob } from "./comprobantes";

// Compras: proveedores propuestos por ítem y órdenes de compra.
// Crear y recibir: ADMIN / VENTAS / CONTABLE. Aprobar o rechazar: ADMIN / CONTABLE (no quien la creó).

// { proveedores, proyectos, items: [{ ..., proveedores: [{ proveedorId, precio, moneda, fechaPrecio, origen, proveedor }] }],
//   monedas, estados, proveedoresPropuestos, igv }
export const getOpcionesCompras = async () => {
  const { data } = await api.get("/compras/opciones");
  return data;
};

// { stockBajo: [item + sugerido + ordenesEnCurso], solicitudes: [solicitud + faltante + ordenesEnCurso] }
export const getSugerenciasCompra = async () => {
  const { data } = await api.get("/compras/sugerencias");
  return data;
};

export const getProveedoresItem = async (itemId) => {
  const { data } = await api.get(`/compras/items/${itemId}/proveedores`);
  return data;
};

// proveedores: [{ proveedorId, precio, moneda }] (hasta 3; reemplaza la lista)
export const guardarProveedoresItem = async (itemId, proveedores) => {
  const { data } = await api.put(`/compras/items/${itemId}/proveedores`, { proveedores });
  return data;
};

// { ordenes, porEstado: { PENDIENTE: n, ... } }
export const getOrdenesCompra = async (params = {}) => {
  const { data } = await api.get("/compras/ordenes", { params });
  return data;
};

export const getOrdenCompra = async (id) => {
  const { data } = await api.get(`/compras/ordenes/${id}`);
  return data;
};

// Crea (sin id) o actualiza; enviar: true la manda a validación de Finanzas.
export const guardarOrdenCompra = async (id, orden) => {
  const { data } = id ? await api.put(`/compras/ordenes/${id}`, orden) : await api.post("/compras/ordenes", orden);
  return data;
};

// accion: "enviar" | "aprobar" | "rechazar" | "anular" | "recibir"
export const accionOrdenCompra = async (id, accion, body = {}) => {
  const { data } = await api.post(`/compras/ordenes/${id}/${accion}`, body);
  return data;
};

export const descargarOrdenCompraPdf = async (oc) => {
  const { data } = await api.get(`/compras/ordenes/${oc.id}/pdf`, { responseType: "blob", timeout: 90000 });
  descargarBlob(data, `${oc.numero}.pdf`);
};
