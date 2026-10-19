import { IGV_RATE } from "../config/negocio";

// Separa un total en valor de venta e IGV. Mismo cálculo que el PDF del
// backend (templates/cotizacionPdf.template.js): el IGV es la diferencia,
// así valor de venta + IGV siempre suma exactamente el total.
export function desglosarTotal(total, conIgv) {
  const t = total || 0;
  if (!conIgv) return { valorVenta: t, igvMonto: 0 };
  const valorVenta = parseFloat((t / (1 + IGV_RATE)).toFixed(2));
  return { valorVenta, igvMonto: parseFloat((t - valorVenta).toFixed(2)) };
}
