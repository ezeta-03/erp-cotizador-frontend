import api from "./axios";

// Caja y Bancos. ADMIN / CONTABLE.

// { cuentas: [{ id, nombre, tipo, banco, numero, cci, moneda, saldoInicial, fechaSaldoInicial, activo,
//   ingresos, egresos, saldo, movimientos }], totales: { PEN, USD }, tipos, monedas }
export const getCuentasFinancieras = async () => {
  const { data } = await api.get("/caja-bancos");
  return data;
};

export const guardarCuentaFinanciera = async (id, cuenta) => {
  const { data } = id ? await api.put(`/caja-bancos/${id}`, cuenta) : await api.post("/caja-bancos", cuenta);
  return data;
};

// { cuenta, saldoAnterior, saldoFinal, movimientos: [{ origen, fecha, concepto, tercero, ingreso, egreso, saldo, ... }] }
export const getMovimientosCuenta = async (id, { desde, hasta } = {}) => {
  const { data } = await api.get(`/caja-bancos/${id}/movimientos`, { params: { desde: desde || undefined, hasta: hasta || undefined } });
  return data;
};

// Tipo de cambio venta SUNAT de hoy: { venta, compra, fecha }
export const getTipoCambioHoy = async () => {
  const { data } = await api.get("/comprobantes/tipo-cambio");
  return data;
};
