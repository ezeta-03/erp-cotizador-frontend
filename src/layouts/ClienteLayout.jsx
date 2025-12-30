import BaseLayout from "./BaseLayout";

export default function ClienteLayout() {
  const menu = [{ path: "/cliente/mi-ultima", label: "Mi Cotización" }];

  return <BaseLayout menu={menu} />;
}
