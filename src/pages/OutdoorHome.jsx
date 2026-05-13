import { useNavigate } from "react-router-dom";
import { Layers, Monitor, FileText, Truck, TrendingUp, LogOut, ChevronLeft, Moon, Sun } from "lucide-react";
import useAuth from "../auth/useAuth";
import useDarkMode from "../hooks/useDarkMode";
import styles from "./OutdoorHome.module.scss";

const SECCIONES = [
  {
    id: "paneles",
    label: "Paneles",
    description: "Gestión y disponibilidad de paneles publicitarios",
    icon: Layers,
    color: "#10b981",
    available: false,
  },
  {
    id: "mupis",
    label: "Mupis",
    description: "Mobiliario urbano de publicidad e información",
    icon: Monitor,
    color: "#10b981",
    available: false,
  },
  {
    id: "cotizador",
    label: "Cotizador",
    description: "Genera cotizaciones para campañas outdoor",
    icon: FileText,
    color: "#f97316",
    available: true,
  },
  {
    id: "proveedores",
    label: "Proveedores",
    description: "Directorio y gestión de proveedores outdoor",
    icon: Truck,
    color: "#10b981",
    available: false,
  },
  {
    id: "rentabilidad",
    label: "Rentabilidad",
    description: "Análisis de márgenes y rentabilidad de campañas",
    icon: TrendingUp,
    color: "#10b981",
    available: false,
  },
];

export default function OutdoorHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleDark] = useDarkMode();
  const role = user?.role?.toLowerCase() ?? "";
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  const handleSeccion = (sec) => {
    if (!sec.available) return;
    if (sec.id === "cotizador") {
      navigate(`/erp/${role}/historial`);
    } else {
      navigate(`/erp/${role}/outdoor/${sec.id}`);
    }
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
        <button className={styles.btnBack} onClick={() => navigate(`/erp/${role}`)}>
          <ChevronLeft size={16} />
          Inicio ERP
        </button>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>Outdoor</span>
      </div>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.moduleTag}>
          <TrendingUp size={16} />
          Módulo Outdoor
        </div>
        <h1 className={styles.heroTitle}>Outdoor</h1>
        <p className={styles.heroSub}>Selecciona una sección para continuar</p>
      </section>

      {/* Secciones */}
      <section className={styles.grid}>
        {SECCIONES.map((sec) => {
          const Icon = sec.icon;
          return (
            <button
              key={sec.id}
              className={`${styles.card} ${!sec.available ? styles.cardDisabled : ""}`}
              onClick={() => handleSeccion(sec)}
              disabled={!sec.available}
            >
              {!sec.available && (
                <span className={styles.soon}>Próximamente</span>
              )}
              <div
                className={styles.cardIcon}
                style={{
                  background: sec.available ? `${sec.color}18` : "var(--color-surface2)",
                }}
              >
                <Icon size={32} color={sec.available ? sec.color : "var(--color-text3)"} />
              </div>
              <h2 className={styles.cardTitle}>{sec.label}</h2>
              <p className={styles.cardDesc}>{sec.description}</p>
              {sec.available && (
                <span className={styles.cardEnter}>Ingresar →</span>
              )}
            </button>
          );
        })}
      </section>
    </div>
  );
}
