import { useState, useEffect, useRef } from "react";
import api from "../api/axios";
import useAuth from "../auth/useAuth";
import styles from "./Login.module.scss";

const FRASES = [
  { desde: 0,  texto: "Verificando credenciales…" },
  { desde: 18, texto: "Iniciando módulos del sistema…" },
  { desde: 36, texto: "Cargando catálogo de productos…" },
  { desde: 54, texto: "Preparando configuración comercial…" },
  { desde: 72, texto: "Sincronizando datos de ventas…" },
  { desde: 90, texto: "¡Todo listo!" },
];

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const loginDataRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    intervalRef.current = setInterval(() => {
      setProgreso(prev => {
        if (prev >= 100) {
          clearInterval(intervalRef.current);
          setTimeout(() => {
            const { token, user } = loginDataRef.current;
            login(token, user);
          }, 350);
          return 100;
        }
        return prev + 1;
      });
    }, 28);
    return () => clearInterval(intervalRef.current);
  }, [loading, login]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      loginDataRef.current = { token: res.data.token, user: res.data.user };
      setProgreso(0);
      setLoading(true);
    } catch (err) {
      alert(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  const fraseActual =
    FRASES.slice().reverse().find(f => progreso >= f.desde)?.texto ?? FRASES[0].texto;

  if (loading) {
    return (
      <div className={styles.loaderOverlay}>
        <div className={styles.loaderContent}>
          <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.loaderLogo} />
          <div className={styles.loaderModulo}>ERP · Módulo de Cotización</div>
          <div className={styles.loaderPct}>{progreso}%</div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${progreso}%` }} />
          </div>
          <span key={fraseActual} className={styles.loaderFrase}>{fraseActual}</span>
        </div>
      </div>
    );
  }

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
