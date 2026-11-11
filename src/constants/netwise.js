// Módulo Netwise: lo ven los usuarios con marca NETWISE y los Administradores.
export const veModuloNetwise = (user) => user?.role === "ADMIN" || user?.marca === "NETWISE";

export const UNIDADES_SERVICIO = {
  servicio: "Servicio",
  mes: "Mes",
  hora: "Hora",
  proyecto: "Proyecto",
  pieza: "Pieza",
};
