import BaseLayout from "./BaseLayout";
import { FileText, KeyRound } from "lucide-react";

export default function ClienteLayout() {
  const menu = [
    { path: "/erp/cliente/cotizador/mia", label: "Cotizaciones", icon: FileText },
    { path: "/erp/cliente/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
