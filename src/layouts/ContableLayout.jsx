import BaseLayout from "./BaseLayout";

export default function ContableLayout() {
  const menu = [
    { path: "/contable/cotizaciones-ventas", label: "Facturar" },
  ];

  return <BaseLayout menu={menu} />;
}
