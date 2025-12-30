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

  return (
    <Routes>
      {/* LOGIN */}
      <Route path="/login" element={<Login />} />

      {/* REDIRECCIÓN INICIAL SEGÚN ROL */}
      <Route
        path="/"
        element={
          user ? (
            user.role === "ADMIN" ? (
              <Navigate to="/admin" />
            ) : user.role === "VENTAS" ? (
              <Navigate to="/ventas" />
            ) : (
              <Navigate to="/cliente" />
            )
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* ADMIN */}
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

      {/* VENTAS */}
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

      {/* CLIENTE */}
      <Route
        path="/cliente"
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <ClienteLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MiCotizacion />} />
      </Route>

      {/* FALLBACK */}
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
