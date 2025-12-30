import { Routes, Route, Navigate } from "react-router-dom";
import useAuth from "../auth/useAuth";

import Login from "../pages/Login";
import Dashboard from  "../pages/Dashboard";
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
      {/* ADMIN */}
      <Route
        element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
      </Route>

      {/* VENTAS */}
      <Route
        element={
          <ProtectedRoute roles={["VENTAS"]}>
            <VentasLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/productos" element={<Productos />} />
        <Route path="/cotizaciones" element={<Cotizaciones />} />
      </Route>

      {/* CLIENTE */}
      <Route
        element={
          <ProtectedRoute roles={["CLIENTE"]}>
            <ClienteLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/mi-cotizacion" element={<MiCotizacion />} />
      </Route>
    </Routes>
  );
}
