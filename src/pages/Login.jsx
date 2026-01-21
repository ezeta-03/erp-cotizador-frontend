import { useState } from "react";
import api from "../api/axios";
import useAuth from "../auth/useAuth";
import styles from "./Login.module.scss";
import logo from "/favicon.png";

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
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.loginIcon}>
              <img src={logo} alt="Logo" />
            </div>
            <h1 className={styles.loginTitle}>ERP | Modulo de Cotización</h1>
            <p className={styles.loginSubtitle}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <input
              className={styles.formInput}
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className={styles.formInput}
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button type="submit" className={styles.btnPrimary}>
              Ingresar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
