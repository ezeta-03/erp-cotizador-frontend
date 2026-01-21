import { NavLink, Outlet } from "react-router-dom";
import { useState } from "react";
import useAuth from "../auth/useAuth";
import { Menu, X, LogOut, User, Mail, Briefcase } from "lucide-react";
import "./BaseLayout.scss";
import "../styles/_buttons.scss";

export default function BaseLayout({ menu }) {
  const { logout, user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

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
      {isMenuOpen && (
        <div className="menu-overlay" onClick={closeMenu}></div>
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${isMenuOpen ? "open" : ""}`}>
        <div className="sidebar-content">
          {/* Logo o título */}
          <div className="sidebar-header">
            <h2 className="sidebar-title">ERP Cotizador</h2>
          </div>

          {/* Navegación */}
          <nav className="nav">
            {menu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={closeMenu}
                className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Información del usuario */}
          <div className="user-info">
            <div className="user-avatar">
              <User size={24} />
            </div>
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

            {/* Botón cerrar sesión */}
            <button className="btn-logout" onClick={logout}>
              <LogOut size={18} />
              <span>Cerrar sesión</span>
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