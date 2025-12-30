import BaseLayout from "./BaseLayout";

export default function AdminLayout() {
  const menu = [
    { path: "/", label: "Dashboard" },
    { path: "/clientes", label: "Clientes" },
    { path: "/productos", label: "Productos" },
    { path: "/cotizaciones", label: "Cotizaciones" }
  ];

  return <BaseLayout menu={menu} />;
}
