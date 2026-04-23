import api from "./axios";

export const getProductos = async () => {
  const { data } = await api.get("/productos");
  return data;
};

export const createProducto = async (data) => {
  const { data: res } = await api.post("/productos", data);
  return res;
};

export const updateProducto = async (id, data) => {
  const { data: res } = await api.put(`/productos/${id}`, data);
  return res;
};

export const deleteProducto = async (id) => {
  const { data } = await api.delete(`/productos/${id}`);
  return data;
};

export const importarProductosCSV = async (archivo) => {
  const formData = new FormData();
  formData.append("archivo", archivo);
  const { data } = await api.post("/productos/importar-csv", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const eliminarTodosProductos = async () => {
  const { data } = await api.delete("/productos/todos");
  return data;
};
