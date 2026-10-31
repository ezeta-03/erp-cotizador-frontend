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
  FACTURA: "Factura", RECIBO_HONORARIOS: "Recibo por honorarios", BOLETA: "Boleta", NOTA_DEBITO: "Nota de débito", OTRO: "Otro",
};

export const CATEGORIA_LABEL = { COMPRA: "Compra", SERVICIO: "Servicio", GASTO_PROYECTO: "Gasto de proyecto", OTRO: "Otro" };
