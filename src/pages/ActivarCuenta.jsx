import { useState } from "react";
import api from "../api/axios";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function ActivarCuenta() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    await api.post("/auth/activar", { token, password });
    alert("Cuenta activada correctamente");
    navigate("/login");
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Crear contraseña</h2>
      <input
        type="password"
        placeholder="Nueva contraseña"
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button>Activar cuenta</button>
    </form>
  );
}
