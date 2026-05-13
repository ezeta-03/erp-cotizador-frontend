import BaseLayout from "./BaseLayout";
import { BarChart3, Users, UserCircle, Package, FileText, DollarSign, KeyRound } from "lucide-react";

export default function AdminLayout() {
  const menu = [
    { path: "/erp/admin/cotizador", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/admin/cotizador/usuarios", label: "Usuarios", icon: Users },
    { path: "/erp/admin/cotizador/clientes", label: "Clientes", icon: UserCircle },
    { path: "/erp/admin/cotizador/productos", label: "Productos", icon: Package },
    { path: "/erp/admin/cotizador/historial", label: "Cotizaciones", icon: FileText },
    { path: "/erp/admin/cotizador/cotizaciones-ventas", label: "Facturar", icon: DollarSign },
    { path: "/erp/admin/cotizador/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} homeLink="/erp/admin" />;
}
