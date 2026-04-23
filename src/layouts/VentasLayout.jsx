import BaseLayout from "./BaseLayout";
import { BarChart3, UserCircle, Package, FileText } from "lucide-react";

export default function VentasLayout() {
  const menu = [
    { path: "/cotizador/ventas", label: "Dashboard", icon: BarChart3 },
    { path: "/cotizador/ventas/clientes", label: "Clientes", icon: UserCircle },
    { path: "/cotizador/ventas/productos", label: "Productos", icon: Package },
    { path: "/cotizador/ventas/historial", label: "Cotizaciones", icon: FileText },
  ];

  return <BaseLayout menu={menu} />;
}
