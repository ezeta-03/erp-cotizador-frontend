import BaseLayout from "./BaseLayout";

export default function ClienteLayout() {
  const menu = [{ path: "/mi-cotizacion", label: "Mi Cotización" }];

  return <BaseLayout menu={menu} />;
}
