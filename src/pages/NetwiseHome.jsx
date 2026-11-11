import { useNavigate } from "react-router-dom";
import { Sparkles, FileText, Globe } from "lucide-react";
import useAuth from "../auth/useAuth";
import styles from "./BTLHome.module.scss";

const SECCIONES = [
  {
    id: "servicios",
    label: "Servicios",
    description: "Catálogo de servicios y precios de la agencia",
    icon: Sparkles,
    color: "var(--color-success)",
  },
  {
    id: "cotizador",
    label: "Cotizador",
    description: "Genera cotizaciones con la marca Netwise",
    icon: FileText,
    color: "var(--color-accent)",
  },
];

export default function NetwiseHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role?.toLowerCase() ?? "";

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.moduleTag}>
          <Globe size={16} />
          Módulo Netwise
        </div>
        <h1 className={styles.heroTitle}>Netwise</h1>
        <p className={styles.heroSub}>Selecciona una sección para continuar</p>
      </section>

      <section className={styles.grid}>
        {SECCIONES.map((sec) => {
          const Icon = sec.icon;
          return (
            <button key={sec.id} className={styles.card} onClick={() => navigate(`/erp/${role}/netwise/${sec.id}`)}>
              <div className={styles.cardIcon} style={{ background: `color-mix(in srgb, ${sec.color} 10%, transparent)` }}>
                <Icon size={32} color={sec.color} />
              </div>
              <h2 className={styles.cardTitle}>{sec.label}</h2>
              <p className={styles.cardDesc}>{sec.description}</p>
              <span className={styles.cardEnter}>Ingresar →</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
