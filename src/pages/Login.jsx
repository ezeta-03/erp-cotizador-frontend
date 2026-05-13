import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
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
  const [showPassword, setShowPassword] = useState(false);
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
          <div className={styles.loaderModulo}>Zaazmago ERP</div>
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

        {/* Panel izquierdo — video background (solo desktop) */}
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
            <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.leftLogo} />
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div className={styles.rightPanel}>

          {/* Logo visible solo en mobile, encima del card */}
          <div className={styles.mobileLogoArea}>
            <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.mobileLogo} />
          </div>

          <div className={styles.formWrapper}>
            <div className={styles.formIcon}>
              <img src="/square.jpeg" alt="Logo" />
            </div>
            <h1 className={styles.formTitle}>Iniciar sesión</h1>
            <p className={styles.formSubtitle}>Ingresa tus credenciales para continuar</p>

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <div className={styles.formField}>
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder="correo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formField}>
                <label>Contraseña</label>
                <div className={styles.inputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className={styles.eyeBtn}
                    onClick={() => setShowPassword(p => !p)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className={styles.btnPrimary}>
                Ingresar
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
