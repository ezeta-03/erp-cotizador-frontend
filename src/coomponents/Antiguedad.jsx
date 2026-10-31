import { monto } from "../utils/formato";
import { TRAMOS } from "../constants/cuentas";
import styles from "../pages/cuentas.module.scss";

// Barra y leyenda de antigüedad de saldos, una por moneda.
// totales: { PEN: { saldo, tramos }, USD: { ... } }
export default function Antiguedad({ titulo, totales }) {
  const monedas = Object.entries(totales || {});
  if (monedas.length === 0) return null;
  return (
    <div className={styles.antiguedad}>
      <p className={styles.antiguedadTitulo}>{titulo}</p>
      {monedas.map(([moneda, t]) => (
        <div key={moneda} style={{ marginBottom: monedas.length > 1 ? "0.75rem" : 0 }}>
          {monedas.length > 1 && <p className={styles.sub} style={{ margin: "0 0 0.35rem" }}>{moneda === "USD" ? "Dólares" : "Soles"}</p>}
          <div className={styles.barra} role="img" aria-label={`Antigüedad en ${moneda}`}>
            {TRAMOS.map(([k, , color]) => t.tramos[k] > 0 && (
              <div key={k} style={{ width: `${(t.tramos[k] / t.saldo) * 100}%`, background: color }} title={monto(t.tramos[k], moneda)} />
            ))}
          </div>
          <div className={styles.leyenda}>
            {TRAMOS.map(([k, label, color]) => (
              <div key={k}>
                <span className={styles.punto} style={{ background: color }} />{label}
                <strong>{monto(t.tramos[k], moneda)}</strong>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
