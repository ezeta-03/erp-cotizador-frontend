import { useState } from "react";
import api from "../api/axios";
import useAuth from "../auth/useAuth";
import styles from "./login.module.scss";
import logo from "/favicon.png";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/auth/login", { email, password });
      login(res.data.token);
    } catch (err) {
      alert(err.response?.data?.message || "Error al iniciar sesión");
    }
  };

  return (
    <>
      <div className={styles.loginPage}>
        <div className={styles.loginContainer}>
          <div className={styles.loginCard}>
            <div className={styles.loginHeader}>
              <div className={styles.loginIcon}>
                {/* <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg> */}
                <img src={logo} alt="" />
              </div>
              <h1 className={styles.loginTitle}>Sistema de Cotización</h1>
              <p className={styles.loginSubtitle}>
                Ingresa tus credenciales para continuar
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <h2>Login</h2>
              <input
                placeholder="Email"
                onChange={(e) => setEmail(e.target.value)}
              />
              <input
                placeholder="Password"
                type="password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button className="btn-primary">Ingresar</button>
            </form>
          </div>
        </div>{" "}
      </div>
    </>
  );
}
