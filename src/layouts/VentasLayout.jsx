import BaseLayout from "./BaseLayout";
import { BarChart3, UserCircle, Package, FileText, KeyRound } from "lucide-react";

export default function VentasLayout() {
  const menu = [
    { path: "/erp/ventas/cotizador", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/ventas/cotizador/clientes", label: "Clientes", icon: UserCircle },
    { path: "/erp/ventas/cotizador/productos", label: "Productos", icon: Package },
    { path: "/erp/ventas/cotizador/historial", label: "Cotizaciones", icon: FileText },
    { path: "/erp/ventas/cotizador/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} homeLink="/erp/ventas" />;
}
