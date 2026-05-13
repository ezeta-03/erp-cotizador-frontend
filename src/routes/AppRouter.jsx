import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import ERPHome from "../pages/ERPHome";
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
      {/* Compatibilidad con links viejos */}
      <Route path="/cotizador" element={<Navigate to="/erp" replace />} />

      {/* ================= ADMIN ================= */}
      <Route
        path="/erp/admin"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <ERPHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/admin/cotizador"
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="productos" element={<Productos />} />
        <Route path="cotizaciones" element={<Cotizaciones />} />
        <Route path="usuarios" element={<Usuarios />} />
        <Route path="historial" element={<CotizacionesHistorial />} />
        <Route path="cotizaciones-ventas" element={<CotizacionesVentas />} />
        <Route path="actividad" element={<ActividadClientes />} />
        <Route path="perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= VENTAS ================= */}
      <Route
        path="/erp/ventas"
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <ERPHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/ventas/cotizador"
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <VentasLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="productos" element={<Productos />} />
        <Route path="cotizaciones" element={<Cotizaciones />} />
        <Route path="historial" element={<CotizacionesHistorial />} />
        <Route path="cotizaciones-ventas" element={<CotizacionesVentas />} />
        <Route path="actividad" element={<ActividadClientes />} />
        <Route path="perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= CLIENTE ================= */}
      {/* Cliente solo tiene cotizador → va directo */}
      <Route
        path="/erp/cliente"
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <Navigate to="/erp/cliente/cotizador" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/cliente/cotizador"
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <ClienteLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MiCotizacion />} />
        <Route path="mia" element={<MiCotizacion />} />
        <Route path="perfil" element={<CambiarContrasena />} />
      </Route>

      {/* ================= CONTABLE ================= */}
      <Route
        path="/erp/contable"
        element={
          <ProtectedRoute roles={["CONTABLE"]}>
            <Navigate to="/erp/contable/cotizador" replace />
          </ProtectedRoute>
        }
      />
      <Route
        path="/erp/contable/cotizador"
        element={
          <ProtectedRoute roles={["CONTABLE"]}>
            <ContableLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cotizaciones-ventas" element={<CotizacionesVentas />} />
        <Route path="perfil" element={<CambiarContrasena />} />
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
