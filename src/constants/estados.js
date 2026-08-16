export const ESTADOS_PANEL = ["LIBRE", "LIBRE_EXTERNO", "OCUPADO", "OCUPADO_EXTERNO", "REEMPLAZO"];

// Estados válidos según si el panel es nuestro (Propio) o lo gestionamos por cuenta
// de un tercero (Externo): en Externo no aplica Cliente ni Precio, solo fechas y estado.
export const ESTADOS_PROPIO = ["LIBRE", "OCUPADO", "REEMPLAZO"];
export const ESTADOS_EXTERNO = ["LIBRE_EXTERNO", "OCUPADO_EXTERNO"];
export const esEstadoExterno = (estado) => ESTADOS_EXTERNO.includes(estado);

export const ESTADO_META = {
  LIBRE:           { label: "Libre",           color: "#10b981", cls: "badgeLibre"       },
  LIBRE_EXTERNO:   { label: "Libre externo",   color: "#ff6600", cls: "badgeLibreExt"    },
  OCUPADO:         { label: "Ocupado",         color: "#ef4444", cls: "badgeOcupado"     },
  OCUPADO_EXTERNO: { label: "Ocupado externo", color: "#c2410c", cls: "badgeOcupadoExt"  },
  REEMPLAZO:       { label: "Reemplazo",       color: "#3b82f6", cls: "badgeReemplazo"   },
};
