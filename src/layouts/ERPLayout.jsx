import { useState } from "react";
import { Outlet, Navigate, useNavigate, useLocation, NavLink } from "react-router-dom";
import {
  LogOut, ChevronDown, Menu, X, Mail, Briefcase, Landmark,
  BarChart3, UserCircle, Users, MapPin, Megaphone, KeyRound,
  Layers, Monitor, Truck, CalendarDays, TrendingUp, FileText, Package, Boxes,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import { moduloDeSegmento } from "../constants/modulos";
import useModulosHabilitados from "../hooks/useModulosHabilitados";
import styles from "./ERPLayout.module.scss";

const SECTION_LABELS = {
  outdoor:      "Outdoor",
  btl:          "BTL",
  dashboard:    "Dashboard",
  historial:    "Cotizador",
  clientes:     "Clientes",
  usuarios:     "Usuarios",
  productos:    "Productos",
  facturar:     "Facturación",
  finanzas:     "Finanzas",
  "cuentas-por-cobrar": "Cuentas por cobrar",
  "cuentas-por-pagar":  "Cuentas por pagar",
  "caja-bancos":        "Caja y Bancos",
  almacen:      "Almacén",
  proyectos:    "Proyectos",
  perfil:       "Cambiar Contraseña",
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

// Finanzas tiene portada (/erp/{rol}/finanzas) como Outdoor y BTL, pero sus
// hijos conservan su URL (/erp/{rol}/facturar, …) y su propio módulo por rol.
const FINANZAS_CHILDREN = [
  { label: "Facturación",        seg: "facturar" },
  { label: "Cuentas por cobrar", seg: "cuentas-por-cobrar" },
  { label: "Cuentas por pagar",  seg: "cuentas-por-pagar" },
  { label: "Caja y Bancos",      seg: "caja-bancos" },
];

const item  = (label, seg, icon) => ({ label, seg, icon });
const group = (label, icon, base, children) => ({ label, icon, base, children });
const carpeta = (label, icon, base, children) => ({ label, icon, base, children, plano: true });

function buildMenu(role) {
  if (role === "admin") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Clientes", "clientes", UserCircle),
      item("Usuarios", "usuarios", Users),
      carpeta("Finanzas", Landmark, "finanzas", FINANZAS_CHILDREN),
      item("Almacén", "almacen", Boxes),
      item("Proyectos", "proyectos", Briefcase),
      group("Outdoor", MapPin, "outdoor", OUTDOOR_CHILDREN),
      group("BTL", Megaphone, "btl", BTL_CHILDREN),
      item("Contraseña", "perfil", KeyRound),
    ];
  }
  // Ventas y Contable comparten menú, salvo Finanzas (solo Contable: vender y
  // facturar quedan separados). El Admin decide qué módulos ve cada rol
  // (Usuarios → Módulos por rol).
  if (role === "ventas" || role === "contable") {
    return [
      item("Dashboard", "dashboard", BarChart3),
      item("Clientes", "clientes", UserCircle),
      ...(role === "contable" ? [carpeta("Finanzas", Landmark, "finanzas", FINANZAS_CHILDREN)] : []),
      item("Almacén", "almacen", Boxes),
      item("Proyectos", "proyectos", Briefcase),
      group("Outdoor", MapPin, "outdoor", OUTDOOR_CHILDREN),
      group("BTL", Megaphone, "btl", BTL_CHILDREN),
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
  const [menuOpen, setMenuOpen] = useState(false);
  const role = user?.role?.toLowerCase() ?? "";

  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[segments.length - 1];
  const isOutdoor = segments.includes("outdoor");
  const isBtl = segments.includes("btl");
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const sectionLabel = SECTION_LABELS[segment] ?? segment;

  const outdoorLink = (isOutdoor && segment !== "outdoor") ? `/erp/${role}/outdoor` : null;
  const btlLink     = (isBtl && segment !== "btl") ? `/erp/${role}/btl` : null;

  // Ventas y Contable ven solo los módulos que el Admin dejó habilitados
  // para su rol (Usuarios → Módulos por rol). Contraseña siempre queda.
  const { habilitados } = useModulosHabilitados();
  const permitido = (mod) => !habilitados || habilitados.has(mod);
  const menu = buildMenu(role)
    .map((m) => (m.plano ? { ...m, children: m.children.filter((c) => permitido(c.seg)) } : m))
    .filter((m) => m.seg === "perfil" || (m.plano ? m.children.length > 0 : permitido(m.seg ?? m.base)));
  // Grupo activo: el de la URL (Outdoor/BTL por su base; Finanzas también por sus hijos).
  const grupoActivo = (m) => segments.includes(m.base) || (m.plano && m.children.some((c) => c.seg === segment));
  const finanzasLink = FINANZAS_CHILDREN.some((c) => c.seg === segment) ? `/erp/${role}/finanzas` : null;
  // Si entra por URL a un módulo apagado, se lo manda al primero habilitado.
  const moduloActual = moduloDeSegmento(segments[2]);
  const bloqueado = habilitados && moduloActual && !habilitados.has(moduloActual);
  const destinoPermitido = `/erp/${role}/${menu[0]?.seg ?? menu[0]?.base ?? "perfil"}`;
  const [expanded, setExpanded] = useState(() => {
    const init = new Set();
    menu.forEach((m) => { if (m.children && grupoActivo(m)) init.add(m.label); });
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
      {/* Header */}
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
                const isActiveGroup = grupoActivo(m);
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
                          <div key={c.seg} className={`${styles.navChildRow} ${segment === c.seg ? styles.navChildActive : ""}`}>
                            <NavLink
                              to={m.plano ? `/erp/${role}/${c.seg}` : `${base}/${c.seg}`}
                              onClick={closeMobileMenu}
                              className={styles.navChild}
                            >
                              {c.label}
                            </NavLink>
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
            {finanzasLink && (
              <>
                <button className={styles.btnBack} onClick={() => navigate(finanzasLink)}>
                  Finanzas
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
            {bloqueado ? <Navigate to={destinoPermitido} replace /> : <Outlet />}
          </main>
        </div>
      </div>
    </div>
  );
}
