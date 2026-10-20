import { Loader2 } from "lucide-react";
import styles from "./ui.module.scss";

// variant: primary | secondary | ghost | danger — size: sm | md | lg
export default function Button({
  variant = "primary", size = "md", icon: Icon, loading = false,
  className = "", children, disabled, type = "button", ...rest
}) {
  const cls = [styles.btn, styles[variant], styles[size], className].filter(Boolean).join(" ");
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <button type={type} className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={iconSize} className={styles.spin} /> : Icon && <Icon size={iconSize} />}
      {children}
    </button>
  );
}
