import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { HandCoins, RefreshCw } from "lucide-react";
import { getAlertasCobro } from "../api/cuentas";
import { monto } from "../utils/formato";
import s from "./SolicitudesMargenPanel.module.scss";

const montos = (obj) => Object.entries(obj || {}).map(([m, v]) => monto(v, m)).join(" · ");
const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const dias = (n) => `${n} día${n !== 1 ? "s" : ""}`;

// Panel del Dashboard (Admin y Contable): cobros vencidos y los que vencen en
// los próximos 7 días, los más atrasados primero.
export default function AlertasCobro({ rol }) {
  const navigate = useNavigate();
  const [a, setA] = useState(null);

  const cargar = () => getAlertasCobro().then(setA).catch(() => setA(null));
  useEffect(() => { cargar(); }, []);

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <div className={s.panelTitle}>
          <HandCoins size={18} style={{ color: "var(--color-accent)" }} />
          <h3>Cobros urgentes</h3>
          {a?.vencidos.cantidad > 0 && <span className={s.badgeCount}>{a.vencidos.cantidad}</span>}
        </div>
        <button className={s.btnRefresh} onClick={cargar}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {!a || a.urgentes.length === 0 ? (
        <p className={s.empty}>No hay cobros vencidos ni por vencer esta semana.</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", padding: "0.75rem 1.25rem 0", fontSize: "var(--text-sm)" }}>
            {a.vencidos.cantidad > 0 && (
              <span style={{ color: "var(--color-danger)", fontWeight: 600 }}>Vencido: {montos(a.vencidos.montos)}</span>
            )}
            {a.porVencer.cantidad > 0 && (
              <span style={{ color: "var(--color-warning)", fontWeight: 600 }}>Vence en 7 días: {montos(a.porVencer.montos)}</span>
            )}
          </div>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th className={s.th}>Comprobante</th>
                  <th className={s.th}>Cliente</th>
                  <th className={s.th} style={{ textAlign: "right" }}>Saldo</th>
                  <th className={s.th}>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {a.urgentes.map((d) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid var(--badge-gray-bg)" }}>
                    <td className={s.tdNombre} style={{ whiteSpace: "nowrap" }}><span className={s.tdNombreMain}>{d.numero}</span></td>
                    <td className={s.tdNombre}>{d.clienteNombre}</td>
                    <td className={s.tdNombre} style={{ textAlign: "right", whiteSpace: "nowrap" }}>{monto(d.saldo, d.moneda)}</td>
                    <td className={s.tdFecha} style={{ color: d.diasVencido > 0 ? "var(--color-danger)" : undefined }}>
                      {d.diasVencido > 0 ? `${dias(d.diasVencido)} de atraso` : `vence ${fechaCorta(d.vencimiento)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--color-border)", textAlign: "right" }}>
        <button type="button" className={s.btnRefresh} style={{ marginLeft: "auto", color: "var(--color-accent)", fontWeight: 600 }}
          onClick={() => navigate(`/erp/${rol}/cuentas-por-cobrar`)}>
          Ver cuentas por cobrar →
        </button>
      </div>
    </div>
  );
}
