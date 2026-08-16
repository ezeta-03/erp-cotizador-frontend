import {
  BarChart3, UserCircle, Users, DollarSign, MapPin, Megaphone, KeyRound,
  Layers, Monitor, Truck, CalendarDays, TrendingUp, FileText, Package,
} from "lucide-react";

// Registro único de todo lo que se puede pinear al Inicio: módulos y
// submódulos puntuales. "path" es relativo a /erp/{role}/. "adminOnly"
// oculta el bloque para roles que no lo tienen en su menú.
export const WIDGET_REGISTRY = {
  outdoor:                { label: "Outdoor",           icon: MapPin,       path: "outdoor" },
  "outdoor.paneles":       { label: "Paneles",           icon: Layers,       path: "outdoor/paneles" },
  "outdoor.mupis":         { label: "Mupis",             icon: Monitor,      path: "outdoor/mupis" },
  "outdoor.proveedores":   { label: "Proveedores",       icon: Truck,        path: "outdoor/proveedores" },
  "outdoor.ocupacion":     { label: "Ocupación",         icon: CalendarDays, path: "outdoor/ocupacion" },
  "outdoor.rentabilidad":  { label: "Rentabilidad",      icon: TrendingUp,   path: "outdoor/rentabilidad" },
  "outdoor.cotizador":     { label: "Cotizador Outdoor", icon: FileText,     path: "outdoor/cotizador" },
  facturar:                { label: "Facturar",          icon: DollarSign,   path: "facturar" },
  clientes:                { label: "Clientes",          icon: UserCircle,   path: "clientes" },
  usuarios:                { label: "Usuarios",          icon: Users,        path: "usuarios", adminOnly: true },
  btl:                     { label: "BTL",               icon: Megaphone,    path: "btl" },
  "btl.cotizador":         { label: "Cotizador BTL",      icon: FileText,     path: "btl/cotizador" },
  "btl.productos":         { label: "Productos BTL",      icon: Package,      path: "btl/productos" },
  dashboard:               { label: "Dashboard",         icon: BarChart3,    path: "dashboard" },
  perfil:                  { label: "Contraseña",        icon: KeyRound,     path: "perfil" },
};

export const kindsForRole = (role) =>
  Object.keys(WIDGET_REGISTRY).filter((k) => role === "admin" || !WIDGET_REGISTRY[k].adminOnly);
