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
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* ================= PUBLICAS ================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/activar" element={<ActivarCuenta />} />

      {/* ================= PROTEGIDAS ================= */}
      {user && (
        <>
          {/* ================= ADMIN ================= */}
          <Route
            path="/admin"
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
            <Route path="cotizaciones" element={<CotizacionesVentas />} />
            <Route path="cotizaciones-ventas" element={<CotizacionesVentas />} />
            <Route path="actividad" element={<ActividadClientes />} />


          </Route>

          {/* ================= VENTAS ================= */}
          <Route
            path="/ventas"
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
            path="/cliente"
            element={
              <ProtectedRoute roles={["CLIENTE"]}>
                <ClienteLayout />
              </ProtectedRoute>
            }
          >
            <Route path="mia" element={<MiCotizacion />} />
          </Route>

          {/* fallback logueado */}
          <Route
            path="*"
            element={<Navigate to={`/${user.role.toLowerCase()}`} />}
          />
        </>
      )}

      {/* fallback NO logueado */}
      {!user && <Route path="*" element={<Navigate to="/login" />} />}
    </Routes>
  );
}
