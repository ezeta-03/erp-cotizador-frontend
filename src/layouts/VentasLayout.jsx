import BaseLayout from "./BaseLayout";

export default function VentasLayout() {
  const menu = [
    { path: "/ventas", label: "Dashboard" },
    { path: "/ventas/clientes", label: "Clientes" },
    { path: "/ventas/productos", label: "Productos" },
    { path: "/ventas/cotizaciones", label: "Cotizar" },
    { path: "/ventas/historial", label: "Mis Cotizaciones" },
  ];

  return <BaseLayout menu={menu} />;
}
