import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import useAuth from "../auth/useAuth";
import {
  Menu,
  X,
  LogOut,
  User,
  Mail,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Home,
  ShoppingCart,
  Users,
  Package,
  FileText,
  BarChart3,
  Settings, // 🔥 AGREGAR iconos para tu menú
} from "lucide-react";
import "./BaseLayout.scss";
import "../styles/_buttons.scss";

export default function BaseLayout({ menu }) {
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const getIcon = (path) => {
    const icons = {
      "/admin/dashboard": BarChart3,
      "/admin/clientes": Users,
      "/admin/productos": Package,
      "/admin/cotizaciones": FileText,
      "/admin/configuracion": Settings,
      "/ventas/dashboard": Home,
      "/ventas/clientes": Users,
      "/ventas/productos": Package,
      "/ventas/cotizaciones": FileText,
      "/cliente/cotizacion": ShoppingCart,
    };
    const Icon = icons[path] || FileText;
    return <Icon size={20} />;
  };
  // Función para obtener el label del rol en español
  const getRoleLabel = (role) => {
    const roles = {
      ADMIN: "Administrador",
      VENTAS: "Ventas",
      CLIENTE: "Cliente",
    };
    return roles[role] || role;
  };

  return (
    <div className="layout">
      {/* HAMBURGER BUTTON - Solo visible en móvil/tablet */}
      <button
        className="hamburger-btn"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* OVERLAY para cerrar menú en móvil */}
      {isMenuOpen && <div className="menu-overlay" onClick={closeMenu}></div>}

      {/* SIDEBAR */}
      <aside
        className={`sidebar ${isMenuOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}
      >
        <div className="sidebar-content">
          {/* Logo o título */}
          <div className="sidebar-header">
            <h2 className="sidebar-title">
              {isCollapsed ? "ERP" : "ERP | Cotizador"}
            </h2>
            <button
              className="collapse-btn"
              onClick={toggleCollapse}
              aria-label="Toggle sidebar"
            >
              {isCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          </div>

          {/* Navegación */}
          <nav className="nav">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={({ isActive }) =>
                  isActive ? "nav-link active" : "nav-link"
                }
                title={isCollapsed ? item.label : ""}
              >
                <span className="nav-icon">{getIcon(item.path)}</span>{" "}
                {/* 🔥 AGREGAR */}
                <span className="nav-text">{item.label}</span>{" "}
                {/* 🔥 MODIFICAR */}
              </NavLink>
            ))}
          </nav>

          {/* Información del usuario */}
          <div className="user-info">
            <div className="user-avatar">
              <User size={24} />
            </div>
            {!isCollapsed && (
              <div className="user-details">
                <p className="user-name">{user.nombre || "Usuario"}</p>
                <div className="user-meta">
                  <Mail size={14} />
                  <span className="user-email">{user.email}</span>
                </div>
                <div className="user-meta">
                  <Briefcase size={14} />
                  <span className="user-role">{getRoleLabel(user.role)}</span>
                </div>
              </div>
            )}

            {/* Botón cerrar sesión */}
            <button
              className="btn-logout"
              onClick={logout}
              title={isCollapsed ? "Cerrar sesión" : ""}
            >
              <LogOut size={18} />
              <span className="logout-text">Cerrar sesión</span>{" "}
              {/* 🔥 MODIFICAR */}
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
