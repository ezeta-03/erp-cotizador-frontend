import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import ERPHome from "../pages/ERPHome";
import OutdoorHome from "../pages/OutdoorHome";
import ERPLayout from "../layouts/ERPLayout";
import Dashboard from "../pages/Dashboard";
import Clientes from "../pages/Clientes";
import ActivarCuenta from "../pages/ActivarCuenta";
import Usuarios from "../pages/Usuarios";
import Productos from "../pages/Productos";
import Cotizaciones from "../pages/Cotizaciones";
import CotizacionesHistorial from "../pages/CotizacionesHistorial";
import MiCotizacion from "../pages/MiCotizacion";
import CambiarContrasena from "../pages/CambiarContrasena";
import CotizacionesVentas from "../coomponents/CotizacionesVentas";
import ActividadClientes from "../coomponents/ActividadClientes";
import ProtectedRoute from "./ProtectedRoute";

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

      {/* ================= ADMIN ================= */}
      <Route
        path="/erp/admin"
        element={<ProtectedRoute roles={["ADMIN"]}><ERPHome /></ProtectedRoute>}
      />
      <Route
        path="/erp/admin/outdoor"
        element={<ProtectedRoute roles={["ADMIN"]}><OutdoorHome /></ProtectedRoute>}
      />
      <Route element={<ProtectedRoute roles={["ADMIN"]}><ERPLayout /></ProtectedRoute>}>
        <Route path="/erp/admin/dashboard"    element={<Dashboard />} />
        <Route path="/erp/admin/historial"    element={<CotizacionesHistorial />} />
        <Route path="/erp/admin/cotizaciones" element={<Cotizaciones />} />
        <Route path="/erp/admin/clientes"     element={<Clientes />} />
        <Route path="/erp/admin/usuarios"     element={<Usuarios />} />
        <Route path="/erp/admin/productos"    element={<Productos />} />
        <Route path="/erp/admin/facturar"     element={<CotizacionesVentas />} />
        <Route path="/erp/admin/actividad"    element={<ActividadClientes />} />
        <Route path="/erp/admin/perfil"       element={<CambiarContrasena />} />
      </Route>

      {/* ================= VENTAS ================= */}
      <Route
        path="/erp/ventas"
        element={<ProtectedRoute roles={["VENTAS"]}><ERPHome /></ProtectedRoute>}
      />
      <Route
        path="/erp/ventas/outdoor"
        element={<ProtectedRoute roles={["VENTAS"]}><OutdoorHome /></ProtectedRoute>}
      />
      <Route element={<ProtectedRoute roles={["VENTAS"]}><ERPLayout /></ProtectedRoute>}>
        <Route path="/erp/ventas/dashboard"    element={<Dashboard />} />
        <Route path="/erp/ventas/historial"    element={<CotizacionesHistorial />} />
        <Route path="/erp/ventas/cotizaciones" element={<Cotizaciones />} />
        <Route path="/erp/ventas/clientes"     element={<Clientes />} />
        <Route path="/erp/ventas/productos"    element={<Productos />} />
        <Route path="/erp/ventas/facturar"     element={<CotizacionesVentas />} />
        <Route path="/erp/ventas/actividad"    element={<ActividadClientes />} />
        <Route path="/erp/ventas/perfil"       element={<CambiarContrasena />} />
      </Route>

      {/* ================= CLIENTE ================= */}
      <Route
        path="/erp/cliente"
        element={<ProtectedRoute roles={["CLIENTE"]}><Navigate to="/erp/cliente/mia" replace /></ProtectedRoute>}
      />
      <Route element={<ProtectedRoute roles={["CLIENTE"]}><ERPLayout /></ProtectedRoute>}>
        <Route path="/erp/cliente/mia"    element={<MiCotizacion />} />
        <Route path="/erp/cliente/perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= CONTABLE ================= */}
      <Route
        path="/erp/contable"
        element={<ProtectedRoute roles={["CONTABLE"]}><Navigate to="/erp/contable/facturar" replace /></ProtectedRoute>}
      />
      <Route element={<ProtectedRoute roles={["CONTABLE"]}><ERPLayout /></ProtectedRoute>}>
        <Route path="/erp/contable/dashboard" element={<Dashboard />} />
        <Route path="/erp/contable/facturar"  element={<CotizacionesVentas />} />
        <Route path="/erp/contable/perfil"    element={<CambiarContrasena />} />
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
