import BaseLayout from "./BaseLayout";
import { BarChart3, Users, UserCircle, Package, FileText, DollarSign, KeyRound } from "lucide-react";

export default function AdminLayout() {
  const menu = [
    { path: "/cotizador/admin", label: "Dashboard", icon: BarChart3 },
    { path: "/cotizador/admin/usuarios", label: "Usuarios", icon: Users },
    { path: "/cotizador/admin/clientes", label: "Clientes", icon: UserCircle },
    { path: "/cotizador/admin/productos", label: "Productos", icon: Package },
    { path: "/cotizador/admin/historial", label: "Cotizaciones", icon: FileText },
    { path: "/cotizador/admin/cotizaciones-ventas", label: "Facturar", icon: DollarSign },
    { path: "/cotizador/admin/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
