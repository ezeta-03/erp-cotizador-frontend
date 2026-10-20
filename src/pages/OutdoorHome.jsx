import { useNavigate } from "react-router-dom";
import { Layers, Monitor, FileText, Truck, TrendingUp, CalendarDays } from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./OutdoorHome.module.scss";

const SECCIONES = [
  {
    id: "paneles",
    label: "Paneles",
    description: "Gestión y disponibilidad de paneles publicitarios",
    icon: Layers,
    color: "var(--color-success)",
    available: true,
  },
  {
    id: "mupis",
    label: "Mupis",
    description: "Mobiliario urbano de publicidad e información",
    icon: Monitor,
    color: "var(--color-success)",
    available: true,
  },
  {
    id: "cotizador",
    label: "Cotizador",
    description: "Genera cotizaciones para campañas outdoor",
    icon: FileText,
    color: "var(--color-accent)",
    available: true,
  },
  {
    id: "proveedores",
    label: "Proveedores",
    description: "Directorio y gestión de proveedores outdoor",
    icon: Truck,
    color: "var(--color-success)",
    available: true,
  },
  {
    id: "ocupacion",
    label: "Ocupación",
    description: "Timeline de reservas, clientes y rentabilidad por panel",
    icon: CalendarDays,
    color: "var(--color-violet)",
    available: true,
  },
  {
    id: "rentabilidad",
    label: "Rentabilidad",
    description: "Análisis de márgenes y rentabilidad de campañas",
    icon: TrendingUp,
    color: "var(--color-success)",
    available: true,
  },
];

export default function OutdoorHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() ?? "";

  const handleSeccion = (sec) => {
    if (!sec.available) return;
    if (sec.id === "cotizador") {
      navigate(`/erp/${role}/outdoor/cotizador`);
    } else {
      navigate(`/erp/${role}/outdoor/${sec.id}`);
    }
  };

  return (
    <div className={styles.page}>
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
                  background: sec.available ? `color-mix(in srgb, ${sec.color} 10%, transparent)` : "var(--color-surface2)",
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
