import api from "./axios";

export const getProductos = async () => {
  const res = await api.get("/productos");
  return res.data;
};

export const createProducto = async (data) => {
  const res = await api.post("/productos", data);
  return res.data;
};

export const updateProducto = async (id, data) => {
  const res = await api.put(`/productos/${id}`, data);
  return res.data;
};

export const deleteProducto = async (id) => {
  const res = await api.delete(`/productos/${id}`);
  return res.data;
};
