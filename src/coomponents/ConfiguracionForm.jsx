import { useEffect, useState } from "react";
import styles from "../styles/configuracionForm.module.scss";

export default function ConfiguracionForm({ onRecalcular }) {
  const [config, setConfig] = useState({
    costo_indirecto: "",
    porcentaje_administrativo: "",
    rentabilidad: "0.3", // lo mantenemos como string
  });

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) =>
        setConfig({
          costo_indirecto: data.costo_indirecto?.toString() || "",
          porcentaje_administrativo: data.porcentaje_administrativo?.toString() || "",
          rentabilidad: data.rentabilidad?.toString() || "0.3",
        })
      );
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig({ ...config, [name]: value });
  };

  const handleSave = async () => {
    // convertir a número antes de enviar
    const payload = {
      costo_indirecto: parseFloat(config.costo_indirecto) || 0,
      porcentaje_administrativo: parseFloat(config.porcentaje_administrativo) || 0,
      rentabilidad: Math.max(parseFloat(config.rentabilidad) || 0, 0.3),
    };

    const res = await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const updated = await res.json();
    setConfig({
      costo_indirecto: updated.costo_indirecto?.toString() || "",
      porcentaje_administrativo: updated.porcentaje_administrativo?.toString() || "",
      rentabilidad: updated.rentabilidad?.toString() || "0.3",
    });
    alert("Configuración actualizada");
  };

  const handleRecalcular = async () => {
    await fetch("/api/configuracion/recalcular", { method: "POST" });
    alert("Productos recalculados con nueva configuración");
    if (onRecalcular) onRecalcular();
  };

  return (
    <div>
      <h3>Configuración de porcentajes</h3>

      <form className={styles.form}>
        <div className={styles.inputsRow}>
          <div className={styles.field}>
            <label>Costos indirectos (%)</label>
            <input
              type="number"
              step="0.01"
              name="costo_indirecto"
              value={config.costo_indirecto}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label>Porcentaje administrativo (%)</label>
            <input
              type="number"
              step="0.01"
              name="porcentaje_administrativo"
              value={config.porcentaje_administrativo}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label>Rentabilidad (%)</label>
            <input
              type="number"
              step="0.01"
              name="rentabilidad"
              value={config.rentabilidad}
              readOnly
              className={styles.readOnly}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.btnSave} type="button" onClick={handleSave}>
            💾 Guardar configuración
          </button>
          <button
            className={styles.btnRecalculate}
            type="button"
            onClick={handleRecalcular}
          >
            💰 Recalcular precios
          </button>
        </div>
      </form>
    </div>
  );
}
