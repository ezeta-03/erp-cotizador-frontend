import { useId } from "react";
import styles from "./ui.module.scss";

// Campo con etiqueta, ayuda y error. as: "input" | "select" | "textarea"
export default function Field({
  label, hint, error, required, as = "input", id, className = "", children, ...rest
}) {
  const Tag = as;
  const autoId = useId();
  const fieldId = id ?? autoId;
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;
  return (
    <div className={`${styles.field} ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden="true">*</span>}
        </label>
      )}
      <Tag
        id={fieldId}
        className={`${styles.input} ${error ? styles.invalid : ""}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...rest}
      >
        {children}
      </Tag>
      {error
        ? <span id={`${fieldId}-error`} className={styles.error}>{error}</span>
        : hint && <span id={`${fieldId}-hint`} className={styles.hint}>{hint}</span>}
    </div>
  );
}
