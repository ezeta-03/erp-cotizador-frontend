// Cuentas de la empresa que se imprimen en una cotización o factura para que
// el cliente pague. value: ids elegidos.
const MONEDA = { PEN: "S/", USD: "US$" };

export default function CuentasBancariasPicker({ cuentas, value = [], onChange, titulo = "Cuentas para el pago (se imprimen en el PDF)" }) {
  if (!cuentas) return null;
  const elegidas = new Set(value);
  const alternar = (id) => onChange(elegidas.has(id) ? value.filter((x) => x !== id) : [...value, id]);

  return (
    <fieldset style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.5rem 0.75rem 0.65rem", margin: 0, minWidth: 0 }}>
      <legend style={{ fontSize: "var(--text-sm)", fontWeight: 600, padding: "0 0.25rem" }}>{titulo}</legend>
      {cuentas.length === 0 ? (
        <span style={{ fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
          No hay cuentas bancarias registradas. Contabilidad las crea en Caja y Bancos.
        </span>
      ) : (
        <div style={{ display: "grid", gap: "0.3rem" }}>
          {cuentas.map((c) => (
            <label key={c.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start", fontSize: "var(--text-sm)", cursor: "pointer" }}>
              <input type="checkbox" checked={elegidas.has(c.id)} onChange={() => alternar(c.id)} style={{ marginTop: 3 }} />
              <span style={{ minWidth: 0 }}>
                {c.tipo === "DETRACCIONES" ? "Detracciones — Banco de la Nación" : c.nombre}{" "}
                <span style={{ color: "var(--color-text3)" }}>({MONEDA[c.moneda] || c.moneda})</span>
                <span style={{ display: "block", fontSize: "var(--text-xs)", color: "var(--color-text3)", overflowWrap: "anywhere" }}>
                  {[c.numero && `N.° ${c.numero}`, c.cci && `CCI ${c.cci}`].filter(Boolean).join(" · ") || "Sin número registrado"}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
