import BaseLayout from "./BaseLayout";
import { BarChart3, DollarSign, KeyRound } from "lucide-react";

export default function ContableLayout() {
  const menu = [
    { path: "/erp/contable/cotizador", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/contable/cotizador/cotizaciones-ventas", label: "Facturar", icon: DollarSign },
    { path: "/erp/contable/cotizador/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
