// Nombre a mostrar para un item de cotización: prioriza el nombre guardado en el
// item, luego el producto asociado, y por último el panel/mupi (para items
// creados antes de que CotizacionItem tuviera su propio campo "nombre").
export const nombreItem = (item) => {
  if (item.nombre) return item.nombre;

  const p = item.producto;
  if (p?.nombre || p?.servicio || p?.material) return p.nombre || p.servicio || p.material;

  const panel = item.panel;
  if (panel) {
    const detalle = panel.nombre || panel.ubicacion || "";
    return detalle ? `${panel.codigo} — ${detalle}` : panel.codigo;
  }

  return "(sin nombre)";
};
