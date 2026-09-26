// Secciones de la hoja "Presupuesto y control de costos — BTL & Producción",
// en el orden en que aparecen. El código es el que guarda el backend.
export const CATEGORIAS_PRESUPUESTO = [
  { codigo: "MANO_DE_OBRA", titulo: "Mano de obra" },
  { codigo: "MATERIALES", titulo: "Materiales e insumos" },
  { codigo: "PRODUCCION_GRAFICA", titulo: "Producción gráfica" },
  { codigo: "LOGISTICA", titulo: "Logística y transporte" },
  { codigo: "EQUIPOS", titulo: "Equipos y tecnología" },
  { codigo: "ADMINISTRATIVOS", titulo: "Gastos administrativos" },
];

export const UNIDADES_PRESUPUESTO = ["día", "hrs", "m²", "unid.", "viaje", "glob."];

// Precio sugerido = costo / (1 − margen). El resto sale de comparar contra
// el precio negociado, igual que en el Excel original.
export function calcularRentabilidad(costoDirecto, margenPct, precioNegociado) {
  const margen = Number(margenPct) / 100;
  const precioSugerido = margen < 1 ? costoDirecto / (1 - margen) : 0;
  const negociado = precioNegociado === "" || precioNegociado === null || precioNegociado === undefined ? null : Number(precioNegociado);
  const utilidad2 = negociado !== null ? negociado - costoDirecto : null;
  return {
    precioSugerido,
    utilidad1: precioSugerido - costoDirecto,
    negociado,
    utilidad2,
    margenReal: negociado ? utilidad2 / negociado : null,
    markup: negociado !== null && costoDirecto > 0 ? utilidad2 / costoDirecto : null,
  };
}
