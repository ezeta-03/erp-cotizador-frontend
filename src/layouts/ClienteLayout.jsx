import BaseLayout from "./BaseLayout";
import { FileText } from "lucide-react";

export default function ClienteLayout() {
  const menu = [
    { path: "/cotizador/cliente/mia", label: "Cotizaciones", icon: FileText },
  ];

  return <BaseLayout menu={menu} />;
}
