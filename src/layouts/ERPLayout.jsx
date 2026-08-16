import { useState } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import {
  LogOut, ChevronLeft, ChevronDown, Moon, Sun, Menu, X,
  BarChart3, UserCircle, Users, DollarSign, MapPin, Megaphone, KeyRound,
  Layers, Monitor, Truck, CalendarDays, TrendingUp, FileText, Package,
} from "lucide-react";
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
  mupis:        "Mupis",
  proveedores:  "Proveedores",
  ocupacion:    "Ocupación",
  rentabilidad: "Rentabilidad",
};

const OUTDOOR_CHILDREN = [
  { label: "Paneles",      seg: "paneles",      icon: Layers },
  { label: "Mupis",        seg: "mupis",        icon: Monitor },
  { label: "Proveedores",  seg: "proveedores",  icon: Truck },
  { label: "Ocupación",    seg: "ocupacion",    icon: CalendarDays },
  { label: "Rentabilidad", seg: "rentabilidad", icon: TrendingUp },
  { label: "Cotizador",    seg: "cotizador",    icon: FileText },
];

const BTL_CHILDREN = [
  { label: "Cotizador", seg: "cotizador", icon: FileText },
  { label: "Productos", seg: "productos", icon: Package },
];

const item  = (label, seg, icon) => ({ label, seg, icon });
const group = (label, icon, base, children) => ({ label, icon, base, children });

function buildMenu(role) {
  if (role === "admin") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Clientes", "clientes", UserCircle),
      item("Usuarios", "usuarios", Users),
      item("Facturar", "facturar", DollarSign),
      group("Outdoor", MapPin, "outdoor", OUTDOOR_CHILDREN),
      group("BTL", Megaphone, "btl", BTL_CHILDREN),
      item("Contraseña", "perfil", KeyRound),
    ];
  }
  if (role === "ventas") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Clientes", "clientes", UserCircle),
      item("Facturar", "facturar", DollarSign),
      group("Outdoor", MapPin, "outdoor", OUTDOOR_CHILDREN),
      group("BTL", Megaphone, "btl", BTL_CHILDREN),
      item("Contraseña", "perfil", KeyRound),
    ];
  }
  if (role === "contable") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Facturar", "facturar", DollarSign),
      item("Contraseña", "perfil", KeyRound),
    ];
  }
  if (role === "cliente") {
    return [
      item("Mi cotización", "mia", FileText),
      item("Contraseña", "perfil", KeyRound),
    ];
  }
  return [];
}

export default function ERPLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [dark, toggleDark] = useDarkMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role?.toLowerCase() ?? "";

  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[segments.length - 1];
  const isOutdoor = segments.includes("outdoor");
  const isBtl = segments.includes("btl");
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const sectionLabel = SECTION_LABELS[segment] ?? segment;

  const homeLink    = (role === "admin" || role === "ventas") ? `/erp/${role}` : null;
  const outdoorLink = isOutdoor ? `/erp/${role}/outdoor` : null;
  const btlLink     = isBtl ? `/erp/${role}/btl` : null;

  const menu = buildMenu(role);
  const [expanded, setExpanded] = useState(() => {
    const init = new Set();
    menu.forEach((m) => { if (m.children && segments.includes(m.base)) init.add(m.label); });
    return init;
  });
  const toggleGroup = (label) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(label) ? next.delete(label) : next.add(label);
    return next;
  });
  const closeMobileMenu = () => setMenuOpen(false);

  return (
    <div className={styles.page}>
      {/* Header idéntico al ERPHome */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.hamburger} onClick={() => setMenuOpen((o) => !o)} aria-label="Abrir menú">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
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

      <div className={styles.shell}>
        {menuOpen && <div className={styles.overlay} onClick={closeMobileMenu} />}

        {/* Sidebar de navegación */}
        <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
          <nav className={styles.nav}>
            {menu.map((m) => {
              const Icon = m.icon;

              if (m.children) {
                const base = `/erp/${role}/${m.base}`;
                const isActiveGroup = segments.includes(m.base);
                const isOpen = expanded.has(m.label) || isActiveGroup;
                return (
                  <div key={m.label} className={styles.navGroup}>
                    <div className={`${styles.navItem} ${isActiveGroup ? styles.navItemActive : ""}`}>
                      <NavLink to={base} onClick={closeMobileMenu} className={styles.navLinkPart}>
                        <Icon size={18} className={styles.navIcon} />
                        <span className={styles.navText}>{m.label}</span>
                      </NavLink>
                      <button
                        className={styles.navChevronBtn}
                        onClick={() => toggleGroup(m.label)}
                        aria-label={isOpen ? `Contraer ${m.label}` : `Expandir ${m.label}`}
                      >
                        <ChevronDown size={14} className={isOpen ? styles.navChevronOpen : ""} />
                      </button>
                    </div>
                    {isOpen && (
                      <div className={styles.navChildren}>
                        {m.children.map((c) => (
                          <NavLink
                            key={c.seg}
                            to={`${base}/${c.seg}`}
                            onClick={closeMobileMenu}
                            className={({ isActive }) => `${styles.navChild} ${isActive ? styles.navChildActive : ""}`}
                          >
                            {c.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={m.seg}
                  to={`/erp/${role}/${m.seg}`}
                  onClick={closeMobileMenu}
                  className={({ isActive }) => `${styles.navItem} ${styles.navItemFlat} ${isActive ? styles.navItemActive : ""}`}
                >
                  <Icon size={18} className={styles.navIcon} />
                  <span className={styles.navText}>{m.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </aside>

        <div className={styles.contentCol}>
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
            {btlLink && (
              <>
                <button className={styles.btnBack} onClick={() => navigate(btlLink)}>
                  BTL
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
      </div>
    </div>
  );
}
