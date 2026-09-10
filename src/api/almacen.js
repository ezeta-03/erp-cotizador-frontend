import api from "./axios";

export const getItemsAlmacen = async (params) => {
  const { data } = await api.get("/almacen/items", { params });
  return data;
};

export const crearItemAlmacen = async (payload) => {
  const { data } = await api.post("/almacen/items", payload);
  return data;
};

export const actualizarItemAlmacen = async (id, payload) => {
  const { data } = await api.put(`/almacen/items/${id}`, payload);
  return data;
};

export const eliminarItemAlmacen = async (id) => {
  const { data } = await api.delete(`/almacen/items/${id}`);
  return data;
};

export const getStock = async (params) => {
  const { data } = await api.get("/almacen/stock", { params });
  return data;
};

export const getMovimientos = async (params) => {
  const { data } = await api.get("/almacen/movimientos", { params });
  return data;
};

export const getKardex = async (productoId) => {
  const { data } = await api.get(`/almacen/${productoId}/kardex`);
  return data;
};

export const registrarEntrada = async (payload) => {
  const { data } = await api.post("/almacen/entradas", payload);
  return data;
};

export const registrarSalida = async (payload) => {
  const { data } = await api.post("/almacen/salidas", payload);
  return data;
};

export const getOrdenes = async (params) => {
  const { data } = await api.get("/almacen/ordenes", { params });
  return data;
};

export const crearOrdenAlmacen = async (payload) => {
  const { data } = await api.post("/almacen/ordenes", payload);
  return data;
};

export const getSolicitudes = async (params) => {
  const { data } = await api.get("/almacen/solicitudes", { params });
  return data;
};

export const aprobarSolicitud = async (id) => {
  const { data } = await api.post(`/almacen/solicitudes/${id}/aprobar`);
  return data;
};

export const rechazarSolicitud = async (id, motivo) => {
  const { data } = await api.post(`/almacen/solicitudes/${id}/rechazar`, { motivo });
  return data;
};

// PDF: descarga directa vía fetch (no axios) porque la respuesta es binaria,
// mismo patrón que api/pdf.js para las cotizaciones.
export const descargarOrdenPdf = async (ordenId, token) => {
  const pdfUrl = `${import.meta.env.VITE_API_URL}/almacen/ordenes/${ordenId}/pdf?token=${token}`;

  const response = await fetch(pdfUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const pdfBlob = await response.blob();
  if (pdfBlob.size === 0) throw new Error("PDF vacío recibido del servidor");

  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ORDEN-ALM-${ordenId}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
