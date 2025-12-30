import BaseLayout from "./BaseLayout";

export default function VentasLayout() {
  const menu = [
    { path: "/", label: "Dashboard" },
    { path: "/clientes", label: "Clientes" },
    { path: "/productos", label: "Productos" },
    { path: "/cotizaciones", label: "Cotizar" }
  ];

  return <BaseLayout menu={menu} />;
}
