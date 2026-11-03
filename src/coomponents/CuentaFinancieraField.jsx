import { useEffect, useRef, useState } from "react";
import { Field } from "../components/ui";
import { getCuentasFinancieras } from "../api/cajaBancos";
import { monto } from "../utils/formato";
import { TIPO_CUENTA_LABEL } from "../constants/cajaBancos";

// Cuenta preferida para un movimiento: la de detracciones para detracciones,
// la caja para efectivo, la billetera para Yape/Plin, la del banco que leyó el
// OCR y, a igualdad, la de la misma moneda.
function sugerir(cuentas, { tipoPago, medio, banco, monedaPago }) {
  const puntaje = (c) => {
    let p = c.moneda === monedaPago ? 1 : 0;
    if (tipoPago === "DETRACCION") p += c.tipo === "DETRACCIONES" ? 10 : -10;
    else if (c.tipo === "DETRACCIONES") p -= 10;
    if (medio === "EFECTIVO" && c.tipo === "CAJA") p += 5;
    if (medio === "YAPE_PLIN" && c.tipo === "BILLETERA") p += 5;
    if (banco && `${c.banco || ""} ${c.nombre}`.toLowerCase().includes(banco.toLowerCase())) p += 4;
    return p;
  };
  return [...cuentas].sort((a, b) => puntaje(b) - puntaje(a))[0] || null;
}

// Cuenta (Caja y Bancos) de un cobro o pago, con el tipo de cambio cuando la
// moneda del pago no es la de la cuenta. Elige sola una sugerencia mientras el
// usuario no cambie la cuenta a mano.
// monedaPago: moneda del monto (la detracción es en soles); montoPago: para mostrar
// cuánto entra/sale de la cuenta.
export default function CuentaFinancieraField({
  value, onChange, tipoCambio, onTipoCambio, monedaPago, montoPago, tipoPago, medio, banco, label = "Cuenta",
}) {
  const [cuentas, setCuentas] = useState(null);
  const manual = useRef(false);

  useEffect(() => {
    getCuentasFinancieras().then((d) => setCuentas(d.cuentas.filter((c) => c.activo))).catch(() => setCuentas([]));
  }, []);

  useEffect(() => {
    if (!cuentas?.length || (manual.current && value)) return;
    const s = sugerir(cuentas, { tipoPago, medio, banco, monedaPago });
    if (s && String(s.id) !== String(value)) onChange(String(s.id));
  }, [cuentas, tipoPago, medio, banco, monedaPago]); // eslint-disable-line react-hooks/exhaustive-deps

  if (cuentas && cuentas.length === 0) {
    return <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--color-warning)" }}>No hay cuentas activas: créalas en Finanzas → Caja y Bancos.</p>;
  }
  const cuenta = cuentas?.find((c) => String(c.id) === String(value));
  const convertir = cuenta && cuenta.moneda !== monedaPago;
  const tc = Number(tipoCambio) || 0;
  const enCuenta = convertir && tc > 0 && Number(montoPago) > 0
    ? (cuenta.moneda === "PEN" ? Number(montoPago) * tc : Number(montoPago) / tc)
    : null;

  return (
    <>
      <Field as="select" label={label} value={value ?? ""} required disabled={!cuentas}
        onChange={(e) => { manual.current = true; onChange(e.target.value); }}>
        <option value="">{cuentas ? "Elige la cuenta" : "Cargando cuentas…"}</option>
        {(cuentas || []).map((c) => (
          <option key={c.id} value={c.id}>{c.nombre} · {c.moneda === "USD" ? "US$" : "S/"} · {TIPO_CUENTA_LABEL[c.tipo]}</option>
        ))}
      </Field>
      {convertir && (
        <Field label={`Tipo de cambio (${monedaPago} → ${cuenta.moneda})`} type="number" step="any" min="0" value={tipoCambio ?? ""}
          hint={enCuenta ? `Entra/sale de la cuenta: ${monto(Math.round(enCuenta * 100) / 100, cuenta.moneda)}` : "Vacío = venta SUNAT de la fecha"}
          onChange={(e) => onTipoCambio(e.target.value)} />
      )}
    </>
  );
}
