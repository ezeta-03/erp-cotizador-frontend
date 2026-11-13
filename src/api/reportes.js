import api from "./axios";
import { descargarBlob } from "./comprobantes";

// Reportes de Zaazmago. ADMIN / CONTABLE.
// Cada reporte: { titulo, subtitulo, columnas: [{ clave, titulo, formato, total? }], filas: [obj],
//                 totales?, grafico: { etiqueta, valor?, series?, titulo, limite? } }

export const getReporte = async (tipo, { desde, hasta }) => {
  const { data } = await api.get(`/reportes/analitica/${tipo}`, { params: { desde, hasta } });
  return data;
};

export const exportarReporte = async (tipo, { desde, hasta }) => {
  const { data } = await api.get(`/reportes/analitica/${tipo}`, {
    params: { desde, hasta, formato: "xlsx" },
    responseType: "blob",
    timeout: 120000,
  });
  descargarBlob(data, `${tipo}-${desde}-al-${hasta}.xlsx`);
};
