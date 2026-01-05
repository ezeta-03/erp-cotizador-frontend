import { useEffect, useState } from "react";

export default function ConfiguracionForm({ onRecalcular }) {
  const [config, setConfig] = useState({
    costo_indirecto: 0.10,
    porcentaje_administrativo: 0.17,
    rentabilidad: 0.20,
  });

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setConfig(data));
  }, []);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: parseFloat(e.target.value) });
  };

  const handleSave = async () => {
    const res = await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const updated = await res.json();
    setConfig(updated); // refresca el estado con lo que guardó el backend
    alert("Configuración actualizada");
  };

  const handleRecalcular = async () => {
    await fetch("/api/configuracion/recalcular", { method: "POST" });
    alert("Productos recalculados con nueva configuración");
    if (onRecalcular) onRecalcular(); // refresca la tabla de productos
  };

  return (
    <div>
      <h3>Configuración de porcentajes</h3>
      <form>
        <label>
          Costos indirectos (%):
          <input
            type="number"
            step="0.01"
            name="costo_indirecto"
            value={config.costo_indirecto}
            onChange={handleChange}
          />
        </label>
        <br />
        <label>
          Porcentaje administrativo (%):
          <input
            type="number"
            step="0.01"
            name="porcentaje_administrativo"
            value={config.porcentaje_administrativo}
            onChange={handleChange}
          />
        </label>
        <br />
        <label>
          Rentabilidad (%):
          <input
            type="number"
            step="0.01"
            name="rentabilidad"
            value={config.rentabilidad}
            onChange={handleChange}
          />
        </label>
        <br />
        <button type="button" onClick={handleSave}>
          Guardar configuración
        </button>
        <button type="button" onClick={handleRecalcular}>
          Recalcular precios
        </button>
      </form>
    </div>
  );
}
