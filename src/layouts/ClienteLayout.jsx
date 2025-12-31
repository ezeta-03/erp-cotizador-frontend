import BaseLayout from "./BaseLayout";

export default function ClienteLayout() {
  const menu = [{ path: "/cliente/mia", label: "Mi Cotización" }];

  return <BaseLayout menu={menu} />;
}
