import { useNavigate } from "react-router-dom";
import { FileText, Megaphone, MapPin, LogOut } from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./ERPHome.module.scss";

const MODULES = [
  {
    id: "cotizador",
    label: "Cotizador",
    description: "Cotizaciones, clientes y productos",
    icon: FileText,
    color: "#f97316",
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
    id: "outdoor",
    label: "Outdoor",
    description: "Paneles, mupis, proveedores y rentabilidad",
    icon: MapPin,
    color: "#10b981",
    available: true,
  },
];

export default function ERPHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() ?? "";

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
        <p className={styles.heroSub}>Selecciona un módulo para comenzar</p>
      </section>

      {/* Módulos */}
      <section className={styles.grid}>
        {MODULES.map((mod) => {
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
