import { useEffect, useState } from "react";

const STYLES = {
  error:   { bg: "#fef2f2", border: "#fca5a5", color: "#991b1b" },
  success: { bg: "#f0fdf4", border: "#86efac", color: "#166534" },
  info:    { bg: "#eff6ff", border: "#93c5fd", color: "#1e40af" },
};

export function Toast({ message, type = "error", onDismiss }) {
  const [visible, setVisible] = useState(true);
  const st = STYLES[type] || STYLES.error;

  useEffect(() => {
    const t = setTimeout(() => { setVisible(false); onDismiss?.(); }, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9000,
      background: st.bg, border: `1px solid ${st.border}`, color: st.color,
      borderRadius: "8px", padding: "0.75rem 1.25rem",
      fontSize: "0.875rem", fontWeight: 500,
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      maxWidth: "360px", lineHeight: 1.4,
      animation: "slideUp 0.2s ease-out",
    }}>
      {message}
    </div>
  );
}

export function useToast() {
  const [toast, setToast] = useState(null);

  const show = (message, type = "error") => setToast({ message, type, key: Date.now() });
  const dismiss = () => setToast(null);

  const ToastNode = toast
    ? <Toast key={toast.key} message={toast.message} type={toast.type} onDismiss={dismiss} />
    : null;

  return { show, ToastNode };
}
