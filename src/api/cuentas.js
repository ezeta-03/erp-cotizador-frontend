import api from "./axios";
import { conArchivo, descargarBlob } from "./comprobantes";

// Cuentas por cobrar y por pagar. ADMIN / CONTABLE.

/* ── Cuentas por cobrar ── */
// { hoy, documentos, clientes, totales: { PEN: { saldo, tramos } }, detraccionPorCobrar, alertas }
export const getCuentasPorCobrar = async () => {
  const { data } = await api.get("/cuentas-por-cobrar");
  return data;
};

// { vencidos: { cantidad, montos }, porVencer: { cantidad, montos }, urgentes: [...], detracciones: [...] }
export const getAlertasCobro = async () => {
  const { data } = await api.get("/cuentas-por-cobrar/alertas");
  return data;
};

// Todos los comprobantes con su cobro. estado: PAGADO | POR_COBRAR | VENCIDO | DETRACCION | ANULADO
export const getHistorialCobros = async (params = {}) => {
  const { data } = await api.get("/cuentas-por-cobrar/historial", { params });
  return data;
};

// { cliente, desde, hasta, monedas: [{ moneda, saldoInicial, movimientos, saldoFinal }], pendientes }
export const getEstadoCuenta = async (numDoc, { desde, hasta } = {}) => {
  const { data } = await api.get(`/cuentas-por-cobrar/estado-cuenta/${numDoc}`, { params: { desde, hasta } });
  return data;
};

export const descargarEstadoCuentaExcel = async (numDoc, { desde, hasta } = {}) => {
  const { data } = await api.get(`/cuentas-por-cobrar/estado-cuenta/${numDoc}`, {
    params: { desde, hasta, formato: "xlsx" },
    responseType: "blob",
  });
  descargarBlob(data, `estado-cuenta-${numDoc}.xlsx`);
};

// para: correos separados por coma; vacío = el del cliente. → { enviadoA, documentos }
export const enviarRecordatorioCobro = async (numDoc, para) => {
  const { data } = await api.post(`/cuentas-por-cobrar/clientes/${numDoc}/recordatorio`, { para }, { timeout: 60000 });
  return data;
};

/* ── Cuentas por pagar ── */
export const getCuentasPorPagar = async () => {
  const { data } = await api.get("/cuentas-por-pagar");
  return data;
};

// { tiposDocumento, categorias, medios, monedas, proyectos, ordenesAlmacen, movimientosAlmacen }
export const getOpcionesPorPagar = async () => {
  const { data } = await api.get("/cuentas-por-pagar/opciones");
  return data;
};

export const getProveedoresCompra = async (params = {}) => {
  const { data } = await api.get("/cuentas-por-pagar/proveedores", { params });
  return data;
};

export const guardarProveedorCompra = async (id, proveedor) => {
  const { data } = id
    ? await api.put(`/cuentas-por-pagar/proveedores/${id}`, proveedor)
    : await api.post("/cuentas-por-pagar/proveedores", proveedor);
  return data;
};

// estado: ABIERTOS | PAGADOS | ANULADOS (vacío = todos)
export const getDocumentosPorPagar = async (params = {}) => {
  const { data } = await api.get("/cuentas-por-pagar/documentos", { params });
  return data;
};

export const getDocumentoPorPagar = async (id) => {
  const { data } = await api.get(`/cuentas-por-pagar/documentos/${id}`);
  return data;
};

export const guardarDocumentoPorPagar = async (id, documento) => {
  const { data } = id
    ? await api.put(`/cuentas-por-pagar/documentos/${id}`, documento)
    : await api.post("/cuentas-por-pagar/documentos", documento);
  return data;
};

export const anularDocumentoPorPagar = async (id) => {
  const { data } = await api.post(`/cuentas-por-pagar/documentos/${id}/anular`);
  return data;
};

// pago: { tipo: "PAGO"|"DETRACCION", fecha, monto, medio, numeroOperacion?, nota? }
// archivo (opcional): imagen o PDF de la constancia.
export const registrarPagoPorPagar = async (id, pago, archivo) => {
  const { data } = await api.post(`/cuentas-por-pagar/documentos/${id}/pagos`, conArchivo(pago, archivo));
  return data;
};

export const agregarAdjuntoPago = async (id, pagoId, archivo) => {
  const { data } = await api.post(`/cuentas-por-pagar/documentos/${id}/pagos/${pagoId}/adjuntos`, conArchivo({}, archivo));
  return data;
};

export const eliminarAdjuntoPago = async (id, pagoId, adjuntoId) => {
  const { data } = await api.delete(`/cuentas-por-pagar/documentos/${id}/pagos/${pagoId}/adjuntos/${adjuntoId}`);
  return data;
};

// { url } firmada por 10 minutos
export const urlAdjuntoPago = async (id, pagoId, adjuntoId) => {
  const { data } = await api.get(`/cuentas-por-pagar/documentos/${id}/pagos/${pagoId}/adjuntos/${adjuntoId}`);
  return data;
};

// { detracciones: [{ id, numero, nombre, saldo, plazo, dias }] } — a depositar a proveedores
export const getAlertasPago = async () => {
  const { data } = await api.get("/cuentas-por-pagar/alertas");
  return data;
};

export const eliminarPagoPorPagar = async (id, pagoId) => {
  const { data } = await api.delete(`/cuentas-por-pagar/documentos/${id}/pagos/${pagoId}`);
  return data;
};

// { fecha, medio, numeroOperacion? }
export const pagarCuotaPanel = async (id, pago) => {
  const { data } = await api.post(`/cuentas-por-pagar/cuotas-paneles/${id}/pagar`, pago);
  return data;
};
