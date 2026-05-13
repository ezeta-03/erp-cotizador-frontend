import BaseLayout from "./BaseLayout";
import { BarChart3, UserCircle, Package, FileText, DollarSign, KeyRound } from "lucide-react";

export default function VentasLayout() {
  const menu = [
    { path: "/erp/ventas/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/ventas/clientes", label: "Clientes", icon: UserCircle },
    { path: "/erp/ventas/productos", label: "Productos", icon: Package },
    { path: "/erp/ventas/cotizaciones", label: "Cotizador", icon: FileText },
    { path: "/erp/ventas/facturar", label: "Facturar", icon: DollarSign },
    { path: "/erp/ventas/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} homeLink="/erp/ventas" />;
}
