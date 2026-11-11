// Estados de una orden de compra y de su pago (vía Cuentas por pagar): [etiqueta, tono del Badge].
export const ESTADO_OC = {
  BORRADOR: ["Borrador", "gray"],
  PENDIENTE: ["Por validar", "yellow"],
  APROBADA: ["Aprobada", "blue"],
  RECHAZADA: ["Rechazada", "red"],
  RECIBIDA_PARCIAL: ["Recibida en parte", "purple"],
  RECIBIDA: ["Recibida", "green"],
  ANULADA: ["Anulada", "gray"],
};
export const ESTADO_PAGO_OC = {
  SIN_FACTURA: ["Sin factura", "gray"],
  PENDIENTE: ["Por pagar", "yellow"],
  PARCIAL: ["Pago parcial", "orange"],
  PAGADA: ["Pagada", "green"],
};
// Regla de Compras: proponer 3 proveedores por ítem.
export const PROVEEDORES_PROPUESTOS = 3;
