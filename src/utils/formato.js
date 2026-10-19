// Formatos de moneda (soles) usados en todo el ERP. Un valor vacío se muestra como 0.
const SOLES = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" });
const SOLES_COMPACTO = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" });
const SOLES_ENTERO = new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 });

export const soles = (v) => SOLES.format(v ?? 0);
export const solesCompacto = (v) => SOLES_COMPACTO.format(v ?? 0);
export const solesEntero = (v) => SOLES_ENTERO.format(v ?? 0);
