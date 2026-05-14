import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { LogOut, ChevronLeft, Moon, Sun } from "lucide-react";
import useAuth from "../auth/useAuth";
import useDarkMode from "../hooks/useDarkMode";
import styles from "./ERPLayout.module.scss";

const SECTION_LABELS = {
  dashboard:    "Dashboard",
  historial:    "Cotizador",
  cotizaciones: "Nueva Cotización",
  clientes:     "Clientes",
  usuarios:     "Usuarios",
  productos:    "Productos",
  facturar:     "Facturar",
  perfil:       "Cambiar Contraseña",
  actividad:    "Actividad",
  cotizador:    "Cotizador",
  mia:          "Mis Cotizaciones",
  paneles:      "Paneles",
  proveedores:  "Proveedores",
};

export default function ERPLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, toggleDark] = useDarkMode();
  const role = user?.role?.toLowerCase() ?? "";

  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[segments.length - 1];
  const isOutdoor = segments.includes("outdoor");
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const sectionLabel = SECTION_LABELS[segment] ?? segment;

  const homeLink    = (role === "admin" || role === "ventas") ? `/erp/${role}` : null;
  const outdoorLink = isOutdoor ? `/erp/${role}/outdoor` : null;

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
          <button className={styles.btnTheme} onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
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
        {outdoorLink && (
          <>
            <button className={styles.btnBack} onClick={() => navigate(outdoorLink)}>
              Outdoor
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
