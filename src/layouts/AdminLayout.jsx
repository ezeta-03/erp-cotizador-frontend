import BaseLayout from "./BaseLayout";

export default function AdminLayout() {
  const menu = [
    { path: "/admin", label: "Dashboard" },
    { path: "/admin/usuarios", label: "Usuarios" }, // 👈 nuevo
    { path: "/admin/clientes", label: "Clientes" },
    { path: "/admin/productos", label: "Productos" },
    { path: "/admin/cotizaciones", label: "Cotizador" },
    { path: "/admin/historial", label: "Historial" },
  ];

  return <BaseLayout menu={menu} />;
}
