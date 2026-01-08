import { useEffect, useState } from "react";
import styles from "../styles/configuracionForm.module.scss";

export default function ConfiguracionForm({ onRecalcular }) {
  const [config, setConfig] = useState({
    costo_indirecto: 0.1,
    porcentaje_administrativo: 0.17,
    rentabilidad: 0.3,
  });

  useEffect(() => {
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => setConfig(data));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let numeric = parseFloat(value);

    if (isNaN(numeric)) return;

    if (name === "rentabilidad" && numeric < 0.3) {
      numeric = 0.3;
    }

    setConfig({ ...config, [name]: numeric });
  };

  const handleSave = async () => {
    const res = await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    const updated = await res.json();
    setConfig(updated);
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
              type="tel"
              step="0.01"
              name="costo_indirecto"
              value={config.costo_indirecto}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label>Porcentaje administrativo (%)</label>
            <input
              type="tel"
              step="0.01"
              name="porcentaje_administrativo"
              value={config.porcentaje_administrativo}
              onChange={handleChange}
            />
          </div>

          <div className={styles.field}>
            <label>Rentabilidad (%)</label>
            <input
              type="tel"
              name="rentabilidad"
              step="0.03"
              value={config.rentabilidad}
              readOnly
              // className={styles.readOnly}
              onChange={handleChange}

            />
          </div>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={handleSave}>
            Guardar configuración
          </button>
          <button type="button" onClick={handleRecalcular}>
            Recalcular precios
          </button>
        </div>
      </form>
    </div>
  );
}
