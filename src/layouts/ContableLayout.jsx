import BaseLayout from "./BaseLayout";
import { BarChart3, DollarSign, KeyRound } from "lucide-react";

export default function ContableLayout() {
  const menu = [
    { path: "/cotizador/contable", label: "Dashboard", icon: BarChart3 },
    { path: "/cotizador/contable/cotizaciones-ventas", label: "Facturar", icon: DollarSign },
    { path: "/cotizador/contable/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
