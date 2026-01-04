import { useState, useEffect } from "react";
import api from "../api/axios";
import { useSearchParams, useNavigate } from "react-router-dom";
import styles from "./login.module.scss";
import logo from "/favicon.png";

export default function ActivarCuenta() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirm) {
      return alert("Las contraseñas no coinciden");
    }

    setLoading(true);
    try {
      await api.post("/auth/activar", { token, password });
      alert("Cuenta activada correctamente");
      navigate("/login");
    } catch (err) {
      alert(err.response?.data?.message || "Error activando cuenta");
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <p>Token inválido</p>;

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginContainer}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.loginIcon}>
              <img src={logo} alt="" />
            </div>
            <h1 className={styles.loginTitle}>Activar cuenta</h1>
            <p className={styles.loginSubtitle}>
              Crea tu contraseña para ingresar
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Nueva contraseña"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirmar contraseña"
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <button disabled={loading}>
              {loading ? "Activando..." : "Activar cuenta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
