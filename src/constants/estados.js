export const ESTADOS_PANEL = ["LIBRE", "LIBRE_EXTERNO", "OCUPADO", "OCUPADO_EXTERNO", "REEMPLAZO"];

// Estados válidos según si el panel es nuestro (Propio) o lo gestionamos por cuenta
// de un tercero (Externo): en Externo no aplica Cliente ni Precio, solo fechas y estado.
export const ESTADOS_PROPIO = ["LIBRE", "OCUPADO", "REEMPLAZO"];
export const ESTADOS_EXTERNO = ["LIBRE_EXTERNO", "OCUPADO_EXTERNO"];
export const esEstadoExterno = (estado) => ESTADOS_EXTERNO.includes(estado);

export const ESTADO_META = {
  LIBRE:           { label: "Libre",           color: "var(--color-success)", cls: "badgeLibre"       },
  LIBRE_EXTERNO:   { label: "Libre externo",   color: "var(--color-accent)", cls: "badgeLibreExt"    },
  OCUPADO:         { label: "Ocupado",         color: "var(--color-danger)", cls: "badgeOcupado"     },
  OCUPADO_EXTERNO: { label: "Ocupado externo", color: "var(--badge-orange-text)", cls: "badgeOcupadoExt"  },
  REEMPLAZO:       { label: "Reemplazo",       color: "var(--color-info)", cls: "badgeReemplazo"   },
};

// Estados de cotización: nombre visible y tono de badge (components/ui/Badge).
export const ESTADO_COTIZACION_META = {
  PENDIENTE:     { label: "Pendiente",     tone: "yellow" },
  APROBADA:      { label: "Aprobada",      tone: "blue" },
  RENEGOCIACION: { label: "Renegociación", tone: "orange" },
  RECHAZADA:     { label: "Rechazada",     tone: "red" },
  FACTURADA:     { label: "Facturada",     tone: "green" },
};
