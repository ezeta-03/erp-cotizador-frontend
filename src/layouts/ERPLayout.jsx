import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft } from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./ERPLayout.module.scss";

const SECTION_LABELS = {
  dashboard:   "Dashboard",
  historial:   "Cotizador",
  cotizaciones: "Nueva Cotización",
  clientes:    "Clientes",
  usuarios:    "Usuarios",
  productos:   "Productos",
  facturar:    "Facturar",
  perfil:      "Cambiar Contraseña",
  actividad:   "Actividad",
  cotizador:   "Cotizador",
  mia:         "Mis Cotizaciones",
};

export default function ERPLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = user?.role?.toLowerCase() ?? "";

  const segment = pathname.split("/").filter(Boolean).pop();
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const sectionLabel = SECTION_LABELS[segment] ?? segment;

  // Solo ADMIN y VENTAS tienen un home multi-módulo
  const homeLink = (role === "admin" || role === "ventas") ? `/erp/${role}` : null;

  return (
    <div className={styles.page}>
      {/* Header idéntico al ERPHome */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.logo} />
          <span className={styles.erpLabel}>ERP</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
          <div className={styles.userAvatar} aria-hidden="true">{initials}</div>
          <button className={styles.btnLogout} onClick={logout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        {homeLink && (
          <>
            <button className={styles.btnBack} onClick={() => navigate(homeLink)}>
              <ChevronLeft size={16} />
              Inicio ERP
            </button>
            <span className={styles.breadcrumbSep}>/</span>
          </>
        )}
        <span className={styles.breadcrumbCurrent}>{sectionLabel}</span>
      </div>

      {/* Contenido de la sección */}
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
