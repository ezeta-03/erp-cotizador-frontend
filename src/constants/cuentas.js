// Cuentas por cobrar y por pagar.

// Tramos de antigüedad (mismas claves que el backend) con su color.
export const TRAMOS = [
  ["porVencer", "Por vencer", "var(--color-success)"],
  ["d1_30", "1–30 días", "var(--color-warning)"],
  ["d31_60", "31–60 días", "var(--badge-orange-text)"],
  ["d61_90", "61–90 días", "var(--color-danger)"],
  ["d90mas", "Más de 90", "var(--badge-red-text)"],
];

export const TIPO_DOC_LABEL = {
  FACTURA: "Factura", RECIBO_HONORARIOS: "Recibo por honorarios", BOLETA: "Boleta", NOTA_DEBITO: "Nota de débito",
  NOTA_VENTA: "Nota de venta", OTRO: "Otro",
};
// Documentos que exigen proveedor con RUC (igual que el backend).
export const REQUIEREN_RUC = ["FACTURA", "RECIBO_HONORARIOS", "NOTA_DEBITO"];

export const GRUPO_GASTO_LABEL = { COSTO_VENTA: "Costo de venta", GASTO_OPERATIVO: "Gasto operativo" };

// Estado de almacén de una compra a proveedor de producto: [etiqueta, tono del Badge].
export const ESTADO_ALMACEN = {
  INGRESO_PENDIENTE: ["Ingreso pendiente", "orange"],
  SALIDA_PENDIENTE: ["Salida pendiente", "yellow"],
  INGRESADO: ["En almacén", "blue"],
  DESPACHADO: ["Despachado", "green"],
};

// "Servicios básicos › Luz" o "Impresión".
export const nombreCategoria = (cat) => (!cat ? "Sin categoría" : cat.padre ? `${cat.padre.nombre} › ${cat.nombre}` : cat.nombre);
