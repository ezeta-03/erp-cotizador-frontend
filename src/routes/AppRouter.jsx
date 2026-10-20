import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import ERPHome from "../pages/ERPHome";
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
import useModulosHabilitados from "../hooks/useModulosHabilitados";

// Contable no tiene panel de Inicio: entra directo a su primer módulo
// habilitado (en el orden del menú), o a Contraseña si no le queda ninguno.
const ORDEN_CONTABLE = ["dashboard", "clientes", "facturar", "almacen", "proyectos", "outdoor", "btl"];
function InicioContable() {
  const { cargando, habilitados } = useModulosHabilitados();
  if (cargando) return null;
  const primero = ORDEN_CONTABLE.find((m) => !habilitados || habilitados.has(m)) ?? "perfil";
  return <Navigate to={`/erp/contable/${primero}`} replace />;
}

// Pantallas internas: una sola lista para Admin, Ventas y Contable.
// "roles" limita la pantalla a ciertos roles; sin "roles" la ven los tres.
// Ventas y Contable además quedan sujetos a los módulos que el Admin habilita.
const PANTALLAS = [
  { path: "dashboard",            element: <Dashboard /> },
  { path: "historial",            element: <CotizacionesHistorial /> },
  { path: "clientes",             element: <Clientes /> },
  { path: "usuarios",             element: <Usuarios />, roles: ["ADMIN"] },
  { path: "facturar",             element: <CotizacionesVentas />, roles: ["ADMIN", "CONTABLE"] },
  { path: "almacen",              element: <Almacen /> },
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

const ROLES_INTERNOS = [
  { rol: "ADMIN",    inicio: <ERPHome /> },
  { rol: "VENTAS",   inicio: <ERPHome /> },
  { rol: "CONTABLE", inicio: <InicioContable /> },
];

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
      {ROLES_INTERNOS.flatMap(({ rol, inicio }) => {
        const base = `/erp/${rol.toLowerCase()}`;
        return [
          <Route
            key={`${rol}-inicio`}
            path={base}
            element={<ProtectedRoute roles={[rol]}>{inicio}</ProtectedRoute>}
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
