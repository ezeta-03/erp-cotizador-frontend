import { ESTADO_META } from "../../constants/estados";
import styles from "./ui.module.scss";

// tone: green | red | yellow | blue | orange | purple | gray
export default function Badge({ tone = "gray", dot = false, children, className = "" }) {
  return (
    <span className={`${styles.badge} ${styles[tone] ?? styles.gray} ${className}`}>
      {dot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}

// Estados de panel/mupi (LIBRE, OCUPADO…) con los colores del sistema.
const TONO_ESTADO = {
  LIBRE: "green", LIBRE_EXTERNO: "orange", OCUPADO: "red", OCUPADO_EXTERNO: "orange", REEMPLAZO: "blue",
};

export function EstadoBadge({ estado }) {
  return (
    <Badge tone={TONO_ESTADO[estado] ?? "gray"} dot>
      {ESTADO_META[estado]?.label ?? estado}
    </Badge>
  );
}
