import { useNavigate } from "react-router-dom";
import { DollarSign, HandCoins, Landmark, Receipt, Wallet } from "lucide-react";
import useAuth from "../auth/useAuth";
import useModulosHabilitados from "../hooks/useModulosHabilitados";
import styles from "./BTLHome.module.scss";

// Las secciones conservan su propia URL (/erp/{rol}/facturar, …) y su
// propio permiso por rol: aquí solo se muestran las habilitadas.
const SECCIONES = [
  {
    id: "facturar",
    label: "Facturación",
    description: "Emite facturas, boletas y notas electrónicas desde cotizaciones",
    icon: DollarSign,
    color: "var(--color-accent)",
  },
  {
    id: "cuentas-por-cobrar",
    label: "Cuentas por cobrar",
    description: "Saldos de clientes, antigüedad, estados de cuenta y recordatorios",
    icon: HandCoins,
    color: "var(--color-success)",
  },
  {
    id: "cuentas-por-pagar",
    label: "Cuentas por pagar",
    description: "Facturas de proveedores, cuotas de paneles y pagos",
    icon: Receipt,
    color: "var(--color-violet)",
  },
  {
    id: "caja-bancos",
    label: "Caja y Bancos",
    description: "Saldos de tus cuentas y caja con los cobros y pagos de cada una",
    icon: Wallet,
    color: "var(--color-info)",
  },
];

export default function FinanzasHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { habilitados } = useModulosHabilitados();
  const role = user?.role?.toLowerCase() ?? "";
  const secciones = SECCIONES.filter((s) => !habilitados || habilitados.has(s.id));

  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.moduleTag}>
          <Landmark size={16} />
          Módulo Finanzas
        </div>
        <h1 className={styles.heroTitle}>Finanzas</h1>
        <p className={styles.heroSub}>Selecciona una sección para continuar</p>
      </section>

      {/* Secciones */}
      <section className={styles.grid}>
        {secciones.map((sec) => {
          const Icon = sec.icon;
          return (
            <button key={sec.id} className={styles.card} onClick={() => navigate(`/erp/${role}/${sec.id}`)}>
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
