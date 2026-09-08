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
