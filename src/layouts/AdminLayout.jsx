import BaseLayout from "./BaseLayout";
import { BarChart3, Users, UserCircle, Package, FileText, DollarSign, KeyRound } from "lucide-react";

export default function AdminLayout() {
  const menu = [
    { path: "/erp/admin/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/admin/usuarios", label: "Usuarios", icon: Users },
    { path: "/erp/admin/clientes", label: "Clientes", icon: UserCircle },
    { path: "/erp/admin/productos", label: "Productos", icon: Package },
    { path: "/erp/admin/cotizaciones", label: "Cotizador", icon: FileText },
    { path: "/erp/admin/facturar", label: "Facturar", icon: DollarSign },
    { path: "/erp/admin/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} homeLink="/erp/admin" />;
}
