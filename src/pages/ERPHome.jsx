import { useNavigate } from "react-router-dom";
import {
  BarChart3, FileText, UserCircle, Users, Package,
  DollarSign, MapPin, Megaphone, KeyRound, LogOut,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./ERPHome.module.scss";

const MODULES_ADMIN = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "KPIs, metas y actividad del equipo",
    icon: BarChart3,
    color: "#f97316",
    available: true,
  },
  {
    id: "historial",
    label: "Cotizador",
    description: "Crea y gestiona cotizaciones",
    icon: FileText,
    color: "#f97316",
    available: true,
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Directorio y actividad de clientes",
    icon: UserCircle,
    color: "#3b82f6",
    available: true,
  },
  {
    id: "usuarios",
    label: "Usuarios",
    description: "Gestión de accesos y roles",
    icon: Users,
    color: "#6366f1",
    available: true,
  },
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo de productos y precios",
    icon: Package,
    color: "#10b981",
    available: true,
  },
  {
    id: "facturar",
    label: "Facturar",
    description: "Aprobación y facturación de cotizaciones",
    icon: DollarSign,
    color: "#10b981",
    available: true,
  },
  {
    id: "outdoor",
    label: "Outdoor",
    description: "Paneles, mupis, proveedores y rentabilidad",
    icon: MapPin,
    color: "#10b981",
    available: true,
  },
  {
    id: "btl",
    label: "BTL",
    description: "Campañas Below The Line",
    icon: Megaphone,
    color: "#8b5cf6",
    available: false,
  },
  {
    id: "perfil",
    label: "Cambiar Contraseña",
    description: "Configuración de seguridad de tu cuenta",
    icon: KeyRound,
    color: "#6b7280",
    available: true,
  },
];

const MODULES_VENTAS = [
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Tus KPIs y actividad de ventas",
    icon: BarChart3,
    color: "#f97316",
    available: true,
  },
  {
    id: "historial",
    label: "Cotizador",
    description: "Crea y gestiona cotizaciones",
    icon: FileText,
    color: "#f97316",
    available: true,
  },
  {
    id: "clientes",
    label: "Clientes",
    description: "Directorio y actividad de clientes",
    icon: UserCircle,
    color: "#3b82f6",
    available: true,
  },
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo de productos y precios",
    icon: Package,
    color: "#10b981",
    available: true,
  },
  {
    id: "facturar",
    label: "Facturar",
    description: "Historial y seguimiento de facturación",
    icon: DollarSign,
    color: "#10b981",
    available: true,
  },
  {
    id: "outdoor",
    label: "Outdoor",
    description: "Paneles, mupis, proveedores y rentabilidad",
    icon: MapPin,
    color: "#10b981",
    available: true,
  },
  {
    id: "btl",
    label: "BTL",
    description: "Campañas Below The Line",
    icon: Megaphone,
    color: "#8b5cf6",
    available: false,
  },
  {
    id: "perfil",
    label: "Cambiar Contraseña",
    description: "Configuración de seguridad de tu cuenta",
    icon: KeyRound,
    color: "#6b7280",
    available: true,
  },
];

const MODULES_BY_ROLE = {
  admin: MODULES_ADMIN,
  ventas: MODULES_VENTAS,
};

export default function ERPHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() ?? "";
  const modules = MODULES_BY_ROLE[role] ?? [];
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  const handleModule = (mod) => {
    if (!mod.available) return;
    navigate(`/erp/${role}/${mod.id}`);
  };

  return (
    <div className={styles.page}>
      {/* Header */}
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

      {/* Hero */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Bienvenido, {user?.nombre?.split(" ")[0]}
        </h1>
        <p className={styles.heroSub}>Selecciona una sección para comenzar</p>
      </section>

      {/* Módulos */}
      <section className={styles.grid}>
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <button
              key={mod.id}
              className={`${styles.card} ${!mod.available ? styles.cardDisabled : ""}`}
              onClick={() => handleModule(mod)}
              disabled={!mod.available}
            >
              {!mod.available && (
                <span className={styles.soon}>Próximamente</span>
              )}
              <div
                className={styles.cardIcon}
                style={{ background: mod.available ? `${mod.color}18` : "#f1f5f9" }}
              >
                <Icon size={32} color={mod.available ? mod.color : "#94a3b8"} />
              </div>
              <h2 className={styles.cardTitle}>{mod.label}</h2>
              <p className={styles.cardDesc}>{mod.description}</p>
              {mod.available && (
                <span className={styles.cardEnter}>Ingresar →</span>
              )}
            </button>
          );
        })}
      </section>
    </div>
  );
}
