import BaseLayout from "./BaseLayout";
import { FileText, KeyRound } from "lucide-react";

export default function ClienteLayout() {
  const menu = [
    { path: "/cotizador/cliente/mia", label: "Cotizaciones", icon: FileText },
    { path: "/cotizador/cliente/perfil", label: "Cambiar contraseña", icon: KeyRound },
  ];

  return <BaseLayout menu={menu} />;
}
