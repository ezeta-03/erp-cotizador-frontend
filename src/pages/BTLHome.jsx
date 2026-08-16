import { useNavigate } from "react-router-dom";
import { Package, FileText, Megaphone } from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./BTLHome.module.scss";

const SECCIONES = [
  {
    id: "productos",
    label: "Productos",
    description: "Catálogo de productos y precios para campañas BTL",
    icon: Package,
    color: "#10b981",
    available: true,
  },
  {
    id: "cotizador",
    label: "Cotizador",
    description: "Genera cotizaciones para campañas BTL",
    icon: FileText,
    color: "#ff6600",
    available: true,
  },
];

export default function BTLHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() ?? "";

  const handleSeccion = (sec) => {
    if (!sec.available) return;
    if (sec.id === "productos") {
      navigate(`/erp/${role}/btl/productos`);
    } else {
      navigate(`/erp/${role}/btl/${sec.id}`);
    }
  };

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.moduleTag}>
          <Megaphone size={16} />
          Módulo BTL
        </div>
        <h1 className={styles.heroTitle}>BTL</h1>
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
