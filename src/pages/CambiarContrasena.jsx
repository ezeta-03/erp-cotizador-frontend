import { useState } from "react";
import { KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";
import { cambiarPassword } from "../api/auth";
import styles from "./CambiarContrasena.module.scss";

export default function CambiarContrasena() {
  const [form, setForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const [mostrar, setMostrar] = useState({ actual: false, nueva: false, confirmar: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState(false);

  const toggle = (campo) => setMostrar((p) => ({ ...p, [campo]: !p[campo] }));

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
    setExito(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.nueva.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (form.nueva !== form.confirmar) {
      setError("La nueva contraseña y la confirmación no coinciden.");
      return;
    }
    setLoading(true);
    try {
      await cambiarPassword(form.actual, form.nueva);
      setExito(true);
      setForm({ actual: "", nueva: "", confirmar: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.pageTitle}>Cambiar contraseña</h1>
        <p className={styles.pageSubtitle}>Actualiza tu contraseña de acceso al sistema</p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardIcon}>
          <KeyRound size={28} color="#6b7280" />
        </div>

        {exito && (
          <div className={styles.successBanner}>
            <CheckCircle size={18} />
            Contraseña actualizada correctamente.
          </div>
        )}

        {error && <div className={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          {[
            { name: "actual",    label: "Contraseña actual" },
            { name: "nueva",     label: "Nueva contraseña" },
            { name: "confirmar", label: "Confirmar nueva contraseña" },
          ].map(({ name, label }) => (
            <div className={styles.fieldGroup} key={name}>
              <label className={styles.label}>{label}</label>
              <div className={styles.inputWrap}>
                <input
                  className={styles.input}
                  type={mostrar[name] ? "text" : "password"}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  minLength={name === "actual" ? 1 : 6}
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  onClick={() => toggle(name)}
                  tabIndex={-1}
                >
                  {mostrar[name] ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          ))}

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </form>
      </div>
    </div>
  );
}
