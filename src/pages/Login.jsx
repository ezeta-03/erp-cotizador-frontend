import { useState } from "react";
import api from "../api/axios";
import useAuth from "../auth/useAuth";
import styles from "./Login.module.scss";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token, res.data.user);
    } catch (err) {
      alert(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        {/* Panel izquierdo oscuro con video */}
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
              Módulo de<br />
              Cotización
            </div>
          </div>
        </div>

        {/* Panel derecho claro */}
        <div className={styles.rightPanel}>
          <div className={styles.formWrapper}>
            <div className={styles.formIcon}>
              <img src="/square.jpeg" alt="Logo" />
            </div>
            <h1 className={styles.formTitle}>Bienvenido</h1>
            <p className={styles.formSubtitle}>Ingresa tus credenciales para continuar</p>

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <div className={styles.formField}>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="zaazmago@zaazmago.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.formField}>
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.btnPrimary}>
                Iniciar Sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
