import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import styles from "./ui.module.scss";

// Panel lateral de detalle. Reemplaza modales de consulta: la lista sigue visible detrás.
export default function Drawer({ open, onClose, eyebrow, title, footer, wide = false, children }) {
  const ref = useRef(null);
  // onClose suele ser una función nueva en cada render: se guarda en una ref
  // para que el efecto solo corra al abrir/cerrar. Si dependiera de onClose,
  // cada tecla volvería a enfocar el panel y el campo perdería el foco.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; });

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    ref.current?.focus();
    const onKey = (e) => { if (e.key === "Escape") onCloseRef.current?.(); };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return createPortal(
    <>
      <div className={styles.overlay} onClick={onClose} />
      <aside
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        className={`${styles.drawer} ${wide ? styles.wide : ""}`}
      >
        <header className={styles.drawerHead}>
          <div>
            {eyebrow && <div className={styles.drawerEyebrow}>{eyebrow}</div>}
            <h2 className={styles.drawerTitle}>{title}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className={styles.drawerBody}>{children}</div>
        {footer && <footer className={styles.drawerFoot}>{footer}</footer>}
      </aside>
    </>,
    document.body
  );
}
