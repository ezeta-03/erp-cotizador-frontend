import api from "./axios";
import { descargarBlob } from "./comprobantes";

// Libro Mayor. ADMIN / CONTABLE.

// { desde, hasta, cuentas: [{ clave, nombre, grupo, naturaleza, moneda, saldoAnterior, debe, haber, saldoFinal,
//   movimientos: [{ fecha, documento, concepto, tercero, debe, haber, saldo }] }], totales, resultadoPeriodo }
export const getLibroMayor = async ({ desde, hasta }) => {
  const { data } = await api.get("/libro-mayor", { params: { desde, hasta } });
  return data;
};

// formato: "xlsx" | "pdf"
export const descargarLibroMayor = async ({ desde, hasta }, formato) => {
  const { data } = await api.get("/libro-mayor", { params: { desde, hasta, formato }, responseType: "blob", timeout: 120000 });
  descargarBlob(data, `libro-mayor-${desde}-al-${hasta}.${formato}`);
};
