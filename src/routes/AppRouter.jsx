import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Clientes from "../pages/Clientes";
import Productos from "../pages/Productos";
import Cotizaciones from "../pages/Cotizaciones";
import MiCotizacion from "../pages/MiCotizacion";

import AdminLayout from "../layouts/AdminLayout";
import VentasLayout from "../layouts/VentasLayout";
import ClienteLayout from "../layouts/ClienteLayout";
import ProtectedRoute from "./ProtectedRoute";

export default function AppRouter() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
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

      {/* fallback */}
      <Route path="*" element={<Navigate to={`/${user.role.toLowerCase()}`} />} />
    </Routes>
  );
}
