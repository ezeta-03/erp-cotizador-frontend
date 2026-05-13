import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import ERPHome from "../pages/ERPHome";
import OutdoorHome from "../pages/OutdoorHome";
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
import AdminLayout from "../layouts/AdminLayout";
import VentasLayout from "../layouts/VentasLayout";
import ClienteLayout from "../layouts/ClienteLayout";
import ContableLayout from "../layouts/ContableLayout";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Raíz → login ERP */}
      <Route path="/" element={<Navigate to="/erp" replace />} />

      {/* ================= PÚBLICAS ================= */}
      <Route path="/erp" element={<Login />} />
      <Route path="/activar" element={<ActivarCuenta />} />
      <Route path="/login" element={<Navigate to="/erp" replace />} />
      <Route path="/cotizador" element={<Navigate to="/erp" replace />} />

      {/* ================= ADMIN - Home ================= */}
      <Route
        path="/erp/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <ERPHome />
          </ProtectedRoute>
        }
      />

      {/* ADMIN - Outdoor (standalone, sin sidebar) */}
      <Route
        path="/erp/admin/outdoor"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <OutdoorHome />
          </ProtectedRoute>
        }
      />

      {/* ADMIN - Secciones con sidebar (pathless layout route) */}
      <Route
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/erp/admin/dashboard" element={<Dashboard />} />
        <Route path="/erp/admin/clientes" element={<Clientes />} />
        <Route path="/erp/admin/usuarios" element={<Usuarios />} />
        <Route path="/erp/admin/productos" element={<Productos />} />
        <Route path="/erp/admin/cotizaciones" element={<Cotizaciones />} />
        <Route path="/erp/admin/historial" element={<CotizacionesHistorial />} />
        <Route path="/erp/admin/facturar" element={<CotizacionesVentas />} />
        <Route path="/erp/admin/actividad" element={<ActividadClientes />} />
        <Route path="/erp/admin/perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= VENTAS - Home ================= */}
      <Route
        path="/erp/ventas"
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <ERPHome />
          </ProtectedRoute>
        }
      />

      {/* VENTAS - Outdoor (standalone) */}
      <Route
        path="/erp/ventas/outdoor"
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <OutdoorHome />
          </ProtectedRoute>
        }
      />

      {/* VENTAS - Secciones con sidebar */}
      <Route
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <VentasLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/erp/ventas/dashboard" element={<Dashboard />} />
        <Route path="/erp/ventas/clientes" element={<Clientes />} />
        <Route path="/erp/ventas/productos" element={<Productos />} />
        <Route path="/erp/ventas/cotizaciones" element={<Cotizaciones />} />
        <Route path="/erp/ventas/historial" element={<CotizacionesHistorial />} />
        <Route path="/erp/ventas/facturar" element={<CotizacionesVentas />} />
        <Route path="/erp/ventas/actividad" element={<ActividadClientes />} />
        <Route path="/erp/ventas/perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= CLIENTE ================= */}
      <Route
        path="/erp/cliente"
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <Navigate to="/erp/cliente/cotizador" replace />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <ClienteLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/erp/cliente/cotizador" element={<MiCotizacion />} />
        <Route path="/erp/cliente/cotizador/mia" element={<MiCotizacion />} />
        <Route path="/erp/cliente/perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= CONTABLE ================= */}
      <Route
        path="/erp/contable"
        element={
          <ProtectedRoute roles={["CONTABLE"]}>
            <Navigate to="/erp/contable/facturar" replace />
          </ProtectedRoute>
        }
      />
      <Route
        element={
          <ProtectedRoute roles={["CONTABLE"]}>
            <ContableLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/erp/contable/dashboard" element={<Dashboard />} />
        <Route path="/erp/contable/facturar" element={<CotizacionesVentas />} />
        <Route path="/erp/contable/perfil" element={<CambiarContrasena />} />
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
