import axios from "axios";

export const getConfiguracion = async () => {
  try {
    const res = await axios.get(`${import.meta.env.VITE_API_URL}/configuracion`);
    return res.data;
  } catch (error) {
    console.error("❌ Error obteniendo configuración:", error);
    throw error;
  }
};
