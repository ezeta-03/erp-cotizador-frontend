import api from "./axios";

// Facturación electrónica (SUNAT vía PSE). ADMIN / CONTABLE.
// La emisión espera la respuesta de SUNAT: se da más margen que el timeout general.
const EMISION = { timeout: 90000 };

export const getComprobantes = async (params = {}) => {
  const { data } = await api.get("/comprobantes", { params });
  return data;
};

// tipo: "FACTURA" | "BOLETA"
export const emitirDesdeCotizacion = async (cotizacionId, tipo) => {
  const { data } = await api.post("/comprobantes/desde-cotizacion", { cotizacionId, tipo }, EMISION);
  return data;
};

// motivoCodigo (catálogo 09): "01" anulación, "02" error en RUC, "06" devolución total
// tipoNota: "NOTA_CREDITO" | "NOTA_DEBITO". Motivos totales (NC 01/02/06) no
// llevan ítems: copian los del comprobante; los demás llevan los ítems de la nota.
export const emitirNota = async (id, tipoNota, { motivoCodigo, motivoDescripcion, items }) => {
  const ruta = tipoNota === "NOTA_CREDITO" ? "nota-credito" : "nota-debito";
  const { data } = await api.post(`/comprobantes/${id}/${ruta}`, { motivoCodigo, motivoDescripcion, items }, EMISION);
  return data;
};

// Detalle con ítems (para prellenar notas)
export const getComprobante = async (id) => {
  const { data } = await api.get(`/comprobantes/${id}`);
  return data;
};

export const reenviarComprobante = async (id) => {
  const { data } = await api.post(`/comprobantes/${id}/reenviar`, {}, EMISION);
  return data;
};

// archivo: "xml" (XML firmado) | "cdr" (constancia de SUNAT) | "pdf" (representación impresa)
export const descargarArchivoComprobante = async (comprobante, archivo) => {
  const { data } = await api.get(`/comprobantes/${comprobante.id}/${archivo}`, {
    responseType: "blob",
    ...(archivo === "pdf" && { timeout: 90000 }),
  });
  const url = URL.createObjectURL(data);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${archivo === "cdr" ? "R-" : ""}${comprobante.numero}.${archivo === "pdf" ? "pdf" : "xml"}`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

// Factura/boleta con ítems libres:
// { tipo, cliente: { numDoc, nombre, direccion }, items: [{ cantidad, unidad, descripcion, valorUnitario }],
//   formaPago: "CONTADO" | "CREDITO", cuotas?: [{ monto, fechaVencimiento }], observacion? }
export const emitirComprobanteManual = async (payload) => {
  const { data } = await api.post("/comprobantes", payload, EMISION);
  return data;
};

// RUC (11 dígitos) o DNI (8) → { tipoDoc, numDoc, nombre, direccion, advertencia } (vía Migo)
export const consultarDocumento = async (documento) => {
  const { data } = await api.get(`/comprobantes/consulta/${documento}`);
  return data;
};

// Validez del comprobante en SUNAT (consulta integrada vía Migo)
export const verificarComprobanteSunat = async (id) => {
  const { data } = await api.post(`/comprobantes/${id}/verificar`, {});
  return data;
};

// Catálogos del formulario: { detraccion: { montoMinimo, codigoPorDefecto, codigos }, unidades, motivosNotaCredito }
export const getOpcionesComprobante = async () => {
  const { data } = await api.get("/comprobantes/opciones");
  return data;
};

// Cotización → { cotizacion, tipoSugerido, puedeFactura, cliente, items } para prellenar el formulario
export const getBorradorCotizacion = async (cotizacionId) => {
  const { data } = await api.get(`/comprobantes/cotizacion/${cotizacionId}/borrador`);
  return data;
};

// Cobros: { comprobante, cobro: { estado, netoCliente, cobrado, saldo, saldoDetraccion, ... }, pagos }
export const getPagosComprobante = async (id) => {
  const { data } = await api.get(`/comprobantes/${id}/pagos`);
  return data;
};

// pago: { tipo: "COBRO"|"DETRACCION", fecha, monto, medio, numeroOperacion?, nota? }
export const registrarPagoComprobante = async (id, pago) => {
  const { data } = await api.post(`/comprobantes/${id}/pagos`, pago);
  return data;
};

export const eliminarPagoComprobante = async (id, pagoId) => {
  const { data } = await api.delete(`/comprobantes/${id}/pagos/${pagoId}`);
  return data;
};

// Envía PDF, XML y CDR al cliente. para: correos separados por coma; vacío = el del cliente.
export const enviarComprobantePorCorreo = async (id, para) => {
  const { data } = await api.post(`/comprobantes/${id}/enviar-correo`, { para }, { timeout: 90000 });
  return data;
};

// Tipo de cambio venta SUNAT del día: { fecha, venta }
export const getTipoCambio = async () => {
  const { data } = await api.get("/comprobantes/tipo-cambio");
  return data;
};
