import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Landmark, RefreshCw } from "lucide-react";
import { getAlertasCobro, getAlertasPago } from "../api/cuentas";
import { soles } from "../utils/formato";
import s from "./SolicitudesMargenPanel.module.scss";

const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—");
const plazo = (d) =>
  d.dias < 0 ? `vencida hace ${-d.dias} día${d.dias !== -1 ? "s" : ""}`
  : d.dias === 0 ? "vence hoy"
  : `vence ${fechaCorta(d.plazo)} (${d.dias} día${d.dias !== 1 ? "s" : ""})`;

// Panel del Dashboard (Admin y Contable): detracciones vencidas o que vencen en
// 7 días — las que los clientes deben depositarnos y las que debemos depositar
// a proveedores. Plazo SUNAT: 5.º día hábil del mes siguiente a la emisión.
export default function AlertasDetraccion({ rol }) {
  const navigate = useNavigate();
  const [datos, setDatos] = useState(null);

  const cargar = () =>
    Promise.all([getAlertasCobro(), getAlertasPago()])
      .then(([cobro, pago]) => setDatos({
        clientes: cobro.detracciones || [],
        proveedores: pago.detracciones || [],
      }))
      .catch(() => setDatos(null));
  useEffect(() => { cargar(); }, []);

  const vencidas = datos ? [...datos.clientes, ...datos.proveedores].filter((d) => d.dias < 0).length : 0;
  const vacio = !datos || datos.clientes.length + datos.proveedores.length === 0;

  const tabla = (titulo, filas, ruta, etiqueta) => filas.length > 0 && (
    <>
      <p style={{ margin: "0.75rem 1.25rem 0", fontSize: "var(--text-xs)", fontWeight: 600, color: "var(--color-text3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {titulo}
      </p>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th className={s.th}>Documento</th>
              <th className={s.th}>{etiqueta}</th>
              <th className={s.th} style={{ textAlign: "right" }}>Detracción</th>
              <th className={s.th}>Plazo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((d) => (
              <tr key={d.id} style={{ borderBottom: "1px solid var(--badge-gray-bg)", cursor: "pointer" }} onClick={() => navigate(ruta)}>
                <td className={s.tdNombre} style={{ whiteSpace: "nowrap" }}><span className={s.tdNombreMain}>{d.numero}</span></td>
                <td className={s.tdNombre}>{d.nombre}</td>
                <td className={s.tdNombre} style={{ textAlign: "right", whiteSpace: "nowrap" }}>{soles(d.saldo)}</td>
                <td className={s.tdFecha} style={{ color: d.dias < 0 ? "var(--color-danger)" : d.dias <= 2 ? "var(--color-warning)" : undefined }}>
                  {plazo(d)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className={s.panel}>
      <div className={s.panelHeader}>
        <div className={s.panelTitle}>
          <Landmark size={18} style={{ color: "var(--color-accent)" }} />
          <h3>Detracciones</h3>
          {vencidas > 0 && <span className={s.badgeCount}>{vencidas}</span>}
        </div>
        <button className={s.btnRefresh} onClick={cargar}><RefreshCw size={14} /> Actualizar</button>
      </div>

      {vacio ? (
        <p className={s.empty}>No hay detracciones vencidas ni por vencer esta semana.</p>
      ) : (
        <>
          {tabla("Por recibir de clientes", datos.clientes, `/erp/${rol}/cuentas-por-cobrar`, "Cliente")}
          {tabla("Por depositar a proveedores", datos.proveedores, `/erp/${rol}/cuentas-por-pagar`, "Proveedor")}
        </>
      )}
      <p style={{ margin: 0, padding: "0.6rem 1.25rem", borderTop: "1px solid var(--color-border)", fontSize: "var(--text-xs)", color: "var(--color-text3)" }}>
        Plazo: 5.º día hábil del mes siguiente a la emisión (no descuenta feriados).
      </p>
    </div>
  );
}
