import BaseLayout from "./BaseLayout";
import { BarChart3, DollarSign, KeyRound } from "lucide-react";

export default function ContableLayout() {
  const menu = [
    { path: "/erp/contable/dashboard", label: "Dashboard", icon: BarChart3 },
    { path: "/erp/contable/facturar", label: "Facturar", icon: DollarSign },
    { path: "/erp/contable/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
