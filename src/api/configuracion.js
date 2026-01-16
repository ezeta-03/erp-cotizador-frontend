import api from "./axios";

export const getConfiguracion = async () => {
  try {
    const { data } = await api.get("/configuracion");
    return data;
  } catch (error) {
    console.error("❌ Error obteniendo configuración:", error);
    throw error;
  }
};
