import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Clientes from "../pages/Clientes";
import ActivarCuenta from "../pages/ActivarCuenta";
import Usuarios from "../pages/Usuarios";
import Productos from "../pages/Productos";
import Cotizaciones from "../pages/Cotizaciones";
import CotizacionesHistorial from "../pages/CotizacionesHistorial";
import MiCotizacion from "../pages/MiCotizacion";
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
      {/* Redirige raíz al módulo cotizador */}
      <Route path="/" element={<Navigate to="/cotizador" replace />} />

      {/* ================= PÚBLICAS ================= */}
      <Route path="/cotizador" element={<Login moduleName="Módulo de\nCotización" />} />
      <Route path="/activar" element={<ActivarCuenta />} />
      <Route path="/login" element={<Navigate to="/cotizador" replace />} />

      {/* ================= ADMIN ================= */}
      <Route
        path="/cotizador/admin"
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
      </Route>

      {/* ================= VENTAS ================= */}
      <Route
        path="/cotizador/ventas"
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
      </Route>

      {/* ================= CLIENTE ================= */}
      <Route
        path="/cotizador/cliente"
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <ClienteLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MiCotizacion />} />
        <Route path="mia" element={<MiCotizacion />} />
      </Route>

      {/* ================= CONTABLE ================= */}
      <Route
        path="/cotizador/contable"
        element={
          <ProtectedRoute roles={["CONTABLE"]}>
            <ContableLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="cotizaciones-ventas" element={<CotizacionesVentas />} />
      </Route>

      {/* fallback */}
      <Route
        path="*"
        element={
          user
            ? <Navigate to={`/cotizador/${user.role.toLowerCase()}`} />
            : <Navigate to="/cotizador" />
        }
      />
    </Routes>
  );
}
