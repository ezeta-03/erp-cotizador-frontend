import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation, NavLink } from "react-router-dom";
import {
  LogOut, ChevronLeft, ChevronDown, Moon, Sun, Menu, X, Mail, Briefcase, Pin, PinOff,
  BarChart3, UserCircle, Users, DollarSign, MapPin, Megaphone, KeyRound,
  Layers, Monitor, Truck, CalendarDays, TrendingUp, FileText, Package, Boxes,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import useDarkMode from "../hooks/useDarkMode";
import { getPanelWidgets, savePanelWidgets } from "../api/panelWidgets";
import { nextFreeSlot } from "../constants/widgets";
import styles from "./ERPLayout.module.scss";

const SECTION_LABELS = {
  outdoor:      "Outdoor",
  btl:          "BTL",
  dashboard:    "Dashboard",
  historial:    "Cotizador",
  cotizaciones: "Nueva Cotización",
  clientes:     "Clientes",
  usuarios:     "Usuarios",
  productos:    "Productos",
  facturar:     "Facturar",
  almacen:      "Almacén",
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

const ROLE_LABELS = {
  ADMIN: "Administrador",
  VENTAS: "Ventas",
  CLIENTE: "Cliente",
  CONTABLE: "Contabilidad",
};

const item  = (label, seg, icon) => ({ label, seg, icon });
const group = (label, icon, base, children) => ({ label, icon, base, children });

function buildMenu(role) {
  if (role === "admin") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Clientes", "clientes", UserCircle),
      item("Usuarios", "usuarios", Users),
      item("Facturar", "facturar", DollarSign),
      item("Almacén", "almacen", Boxes),
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
      item("Almacén", "almacen", Boxes),
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
  const outdoorLink = (isOutdoor && segment !== "outdoor") ? `/erp/${role}/outdoor` : null;
  const btlLink     = (isBtl && segment !== "btl") ? `/erp/${role}/btl` : null;

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

  // Pin al Inicio: solo admin/ventas tienen un panel de bienvenida donde pinear.
  const canPin = role === "admin" || role === "ventas";
  const [pinnedWidgets, setPinnedWidgets] = useState([]);
  const pinnedKinds = new Set(pinnedWidgets.map((w) => w.kind));

  useEffect(() => {
    if (!canPin) return;
    let vivo = true;
    getPanelWidgets().then((ws) => vivo && setPinnedWidgets(ws)).catch(() => {});
    return () => { vivo = false; };
  }, [canPin]);

  const togglePin = (kind, e) => {
    e.preventDefault();
    e.stopPropagation();
    const next = pinnedKinds.has(kind)
      ? pinnedWidgets.filter((w) => w.kind !== kind)
      : [...pinnedWidgets, { kind, ...nextFreeSlot(pinnedWidgets), w: 1, h: 1 }];
    setPinnedWidgets(next);
    savePanelWidgets(next).catch(() => setPinnedWidgets(pinnedWidgets));
  };

  const PinBtn = ({ kind }) => {
    if (!canPin) return null;
    const pinned = pinnedKinds.has(kind);
    return (
      <button
        className={`${styles.pinBtn} ${pinned ? styles.pinBtnActive : ""}`}
        onClick={(e) => togglePin(kind, e)}
        aria-label={pinned ? `Quitar ${kind} del Inicio` : `Pinear ${kind} al Inicio`}
        title={pinned ? "Quitar del Inicio" : "Pinear al Inicio"}
      >
        {pinned ? <Pin size={13} /> : <PinOff size={13} />}
      </button>
    );
  };

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
          <div className={styles.sidebarHeader}>
            <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.sidebarLogo} />
          </div>

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
                      <PinBtn kind={m.base} />
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
                          <div key={c.seg} className={`${styles.navChildRow} ${segment === c.seg ? styles.navChildActive : ""}`}>
                            <NavLink
                              to={`${base}/${c.seg}`}
                              onClick={closeMobileMenu}
                              className={styles.navChild}
                            >
                              {c.label}
                            </NavLink>
                            <PinBtn kind={`${m.base}.${c.seg}`} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={m.seg} className={`${styles.navItem} ${segment === m.seg ? styles.navItemActive : ""}`}>
                  <NavLink
                    to={`/erp/${role}/${m.seg}`}
                    onClick={closeMobileMenu}
                    className={styles.navLinkPart}
                  >
                    <Icon size={18} className={styles.navIcon} />
                    <span className={styles.navText}>{m.label}</span>
                  </NavLink>
                  <PinBtn kind={m.seg} />
                </div>
              );
            })}
          </nav>

          <div className={styles.sidebarUser}>
            <div className={styles.sidebarAvatar} aria-hidden="true">{initials}</div>
            <div className={styles.sidebarUserInfo}>
              <p className={styles.sidebarUserName}>{user?.nombre}</p>
              <div className={styles.sidebarUserMeta}>
                <Mail size={12} />
                <span>{user?.email}</span>
              </div>
              <div className={styles.sidebarUserMeta}>
                <Briefcase size={12} />
                <span>{ROLE_LABELS[user?.role] ?? user?.role}</span>
              </div>
            </div>
          </div>
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
