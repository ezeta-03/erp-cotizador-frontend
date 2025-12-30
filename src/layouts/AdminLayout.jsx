import BaseLayout from "./BaseLayout";

export default function AdminLayout() {
  const menu = [
    { path: "/usuarios", label: "Usuarios" }, // 👈 nuevo
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/clientes", label: "Clientes" },
    { path: "/admin/productos", label: "Productos" },
    { path: "/admin/cotizaciones", label: "Cotizaciones" },
  ];

  return <BaseLayout menu={menu} />;
}
