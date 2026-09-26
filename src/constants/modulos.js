// Módulos que el Admin puede prender/apagar por rol (Usuarios → Módulos por
// rol). Mantener sincronizado con modulosRol.controller.js del backend, que
// es el que valida y devuelve cuáles están habilitados.
export const MODULO_LABEL = {
  dashboard: "Dashboard",
  clientes: "Clientes",
  facturar: "Facturación",
  almacen: "Almacén",
  proyectos: "Proyectos",
  outdoor: "Outdoor",
  btl: "BTL",
};

export const ROL_CONFIGURABLE_LABEL = { VENTAS: "Ventas", CONTABLE: "Finanzas (Contable)" };

// Primer segmento de la URL después de /erp/{rol}/ → módulo que la controla.
// Lo que no aparece acá (perfil, historial, cotizaciones…) no se bloquea.
export const moduloDeSegmento = (seg) => (MODULO_LABEL[seg] ? seg : null);
