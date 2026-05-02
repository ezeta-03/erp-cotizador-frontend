import { useState } from "react";
import api from "../api/axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import styles from "./Login.module.scss";

export default function ActivarCuenta() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  console.log("ActivarCuenta renderizado, token:", token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      return alert("Las contraseñas no coinciden");
    }
    setLoading(true);
    try {
      await api.post("/auth/activar", { token, password });
      alert("Cuenta activada correctamente. Ahora puedes iniciar sesión.");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Error activando cuenta");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className={styles.loginPage}>
        <p style={{ color: "#fff" }}>Token inválido o enlace expirado.</p>
      </div>
    );
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        {/* Panel izquierdo */}
        <div className={styles.leftPanel}>
          <video
            className={styles.videoBg}
            src="/background.webm"
            autoPlay
            loop
            muted
            playsInline
          />
          <div className={styles.leftContent}>
            <img src="/zaazmago_holding.png" alt="Zaazmago Holding" className={styles.leftLogo} />
            <div className={styles.leftModuleName}>
              ERP<br />
              <span>Módulo de</span><br />
              <span>Cotización</span>
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div className={styles.rightPanel}>
          <div className={styles.formWrapper}>
            <div className={styles.formIcon}>
              <img src="/square.jpeg" alt="Logo" />
            </div>
            <h1 className={styles.formTitle}>Activa tu cuenta</h1>
            <p className={styles.formSubtitle}>Crea tu contraseña para empezar a usar el sistema</p>

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Nueva contraseña</label>
                <input
                  className={styles.formInput}
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Confirmar contraseña</label>
                <input
                  className={styles.formInput}
                  type="password"
                  placeholder="••••••••••••"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading ? "Activando..." : "Activar cuenta"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
