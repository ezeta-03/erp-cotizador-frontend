import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import OutdoorHome from "../pages/OutdoorHome";
import BTLHome from "../pages/BTLHome";
import ERPLayout from "../layouts/ERPLayout";
import Dashboard from "../pages/Dashboard";
import Clientes from "../pages/Clientes";
import ActivarCuenta from "../pages/ActivarCuenta";
import Usuarios from "../pages/Usuarios";
import Productos from "../pages/Productos";
import CotizacionesHistorial from "../pages/CotizacionesHistorial";
import MiCotizacion from "../pages/MiCotizacion";
import CambiarContrasena from "../pages/CambiarContrasena";
import CotizacionesVentas from "../coomponents/CotizacionesVentas";
import ProtectedRoute from "./ProtectedRoute";
import Paneles from "../pages/Paneles";
import Mupis from "../pages/Mupis";
import Proveedores from "../pages/Proveedores";
import Ocupacion from "../pages/Ocupacion";
import Rentabilidad from "../pages/Rentabilidad";
import Almacen from "../pages/Almacen";
import Proyectos from "../pages/Proyectos";
import CuentasPorCobrar from "../pages/CuentasPorCobrar";
import CuentasPorPagar from "../pages/CuentasPorPagar";
import FinanzasHome from "../pages/FinanzasHome";
import CajaBancos from "../pages/CajaBancos";
import LibroMayor from "../pages/LibroMayor";
import FlujoEfectivo from "../pages/FlujoEfectivo";
import Compras from "../pages/Compras";
import useModulosHabilitados from "../hooks/useModulosHabilitados";

// No hay pantalla de Inicio: al entrar se va directo al primer módulo
// habilitado del rol (en el orden del menú; normalmente el Dashboard), o a
// Contraseña si no le queda ninguno. Admin siempre tiene todos.
const ORDEN_MODULOS = ["dashboard", "clientes", "facturar", "cuentas-por-cobrar", "cuentas-por-pagar", "caja-bancos", "libro-mayor", "flujo-efectivo", "almacen", "compras", "proyectos", "outdoor", "btl"];
function Inicio({ rol }) {
  const { cargando, habilitados } = useModulosHabilitados();
  if (cargando) return null;
  const primero = rol === "ADMIN" ? "dashboard" : ORDEN_MODULOS.find((m) => !habilitados || habilitados.has(m)) ?? "perfil";
  return <Navigate to={`/erp/${rol.toLowerCase()}/${primero}`} replace />;
}

// Pantallas internas: una sola lista para Admin, Ventas y Contable.
// "roles" limita la pantalla a ciertos roles; sin "roles" la ven los tres.
// Ventas y Contable además quedan sujetos a los módulos que el Admin habilita.
const PANTALLAS = [
  { path: "dashboard",            element: <Dashboard /> },
  { path: "historial",            element: <CotizacionesHistorial /> },
  { path: "clientes",             element: <Clientes /> },
  { path: "usuarios",             element: <Usuarios />, roles: ["ADMIN"] },
  { path: "finanzas",             element: <FinanzasHome />, roles: ["ADMIN", "CONTABLE"] },
  { path: "facturar",             element: <CotizacionesVentas />, roles: ["ADMIN", "CONTABLE"] },
  { path: "cuentas-por-cobrar",   element: <CuentasPorCobrar />, roles: ["ADMIN", "CONTABLE"] },
  { path: "cuentas-por-pagar",    element: <CuentasPorPagar />, roles: ["ADMIN", "CONTABLE"] },
  { path: "caja-bancos",          element: <CajaBancos />, roles: ["ADMIN", "CONTABLE"] },
  { path: "libro-mayor",          element: <LibroMayor />, roles: ["ADMIN", "CONTABLE"] },
  { path: "flujo-efectivo",       element: <FlujoEfectivo />, roles: ["ADMIN", "CONTABLE"] },
  { path: "almacen",              element: <Almacen /> },
  { path: "compras",              element: <Compras />, roles: ["ADMIN", "VENTAS", "CONTABLE"] },
  { path: "proyectos",            element: <Proyectos /> },
  { path: "outdoor",              element: <OutdoorHome /> },
  { path: "outdoor/paneles",      element: <Paneles /> },
  { path: "outdoor/mupis",        element: <Mupis /> },
  { path: "outdoor/proveedores",  element: <Proveedores /> },
  { path: "outdoor/ocupacion",    element: <Ocupacion /> },
  { path: "outdoor/rentabilidad", element: <Rentabilidad /> },
  { path: "outdoor/cotizador",    element: <CotizacionesHistorial modulo="outdoor" /> },
  { path: "btl",                  element: <BTLHome /> },
  { path: "btl/cotizador",        element: <CotizacionesHistorial modulo="btl" /> },
  { path: "btl/productos",        element: <Productos /> },
  { path: "perfil",               element: <CambiarContrasena /> },
];

const ROLES_INTERNOS = ["ADMIN", "VENTAS", "CONTABLE"];

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Raíz → login */}
      <Route path="/" element={<Navigate to="/erp" replace />} />

      {/* ================= PÚBLICAS ================= */}
      <Route path="/erp" element={<Login />} />
      <Route path="/activar" element={<ActivarCuenta />} />
      <Route path="/login" element={<Navigate to="/erp" replace />} />
      <Route path="/cotizador" element={<Navigate to="/erp" replace />} />

      {/* ============ ADMIN / VENTAS / CONTABLE ============ */}
      {ROLES_INTERNOS.flatMap((rol) => {
        const base = `/erp/${rol.toLowerCase()}`;
        return [
          <Route
            key={`${rol}-inicio`}
            path={base}
            element={<ProtectedRoute roles={[rol]}><Inicio rol={rol} /></ProtectedRoute>}
          />,
          <Route key={`${rol}-layout`} element={<ProtectedRoute roles={[rol]}><ERPLayout /></ProtectedRoute>}>
            {PANTALLAS.filter((p) => !p.roles || p.roles.includes(rol)).map((p) => (
              <Route key={p.path} path={`${base}/${p.path}`} element={p.element} />
            ))}
          </Route>,
        ];
      })}

      {/* ================= CLIENTE ================= */}
      <Route
        path="/erp/cliente"
        element={<ProtectedRoute roles={["CLIENTE"]}><Navigate to="/erp/cliente/mia" replace /></ProtectedRoute>}
      />
      <Route element={<ProtectedRoute roles={["CLIENTE"]}><ERPLayout /></ProtectedRoute>}>
        <Route path="/erp/cliente/mia"    element={<MiCotizacion />} />
        <Route path="/erp/cliente/perfil" element={<CambiarContrasena />} />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={
          user
            ? <Navigate to={`/erp/${user.role.toLowerCase()}`} replace />
            : <Navigate to="/erp" replace />
        }
      />
    </Routes>
  );
}
