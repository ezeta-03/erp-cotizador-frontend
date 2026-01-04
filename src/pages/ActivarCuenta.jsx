import { useState, useEffect } from "react";
import api from "../api/axios";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ActivarCuenta() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 limpiar sesión previa (admin, ventas, etc)
  useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
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

  if (!token) {
    return <p>Token inválido</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear contraseña</h2>
      <input
        type="password"
        placeholder="Nueva contraseña"
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button disabled={loading}>
        {loading ? "Activando..." : "Activar cuenta"}
      </button>
    </form>
  );
}
