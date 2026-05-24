import { useState } from "react";
import { X } from "lucide-react";
import { updateCuota } from "../api/proveedores";
import styles from "./FichaProveedorModal.module.scss";

const fmtDate = (d) => {
  const [y, m, day] = String(d).slice(0, 10).split("-");
  return new Date(+y, +m - 1, +day).toLocaleDateString("es-PE", {
    day: "2-digit", month: "short", year: "numeric",
  });
};

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const esVigente = (fin) => new Date(fin) >= new Date();

const REL_CLASS = { ALTO: "fichaRelAlto", MEDIO: "fichaRelMedio", BAJO: "fichaRelBajo" };

export default function FichaProveedorModal({ proveedor, isAdmin, onClose, onCuotaUpdated }) {
  const [cuotas, setCuotas] = useState(proveedor.cuotas ?? []);
  const [saving, setSaving] = useState({});

  const [edits, setEdits] = useState(() =>
    Object.fromEntries(
      (proveedor.cuotas ?? []).map((c) => [
        c.id,
        { estado: c.estado, detalle: c.detalle ?? "", fecha: c.fecha },
      ])
    )
  );

  const setEdit = (cuotaId, field, val) =>
    setEdits((eds) => ({ ...eds, [cuotaId]: { ...eds[cuotaId], [field]: val } }));

  const saveCuota = async (cuota, patch) => {
    setSaving((s) => ({ ...s, [cuota.id]: true }));
    try {
      const updated = await updateCuota(proveedor.id, cuota.id, patch);
      const merged = { ...cuota, ...updated };
      setCuotas((prev) => prev.map((c) => (c.id === cuota.id ? merged : c)));
      onCuotaUpdated?.(merged);
    } catch { /* silencioso */ }
    setSaving((s) => ({ ...s, [cuota.id]: false }));
  };

  const vigente = esVigente(proveedor.fin);
  const totalMonto   = cuotas.reduce((s, c) => s + c.monto, 0);
  const totalIgv     = cuotas.reduce((s, c) => s + c.igv, 0);
  const totalGeneral = totalMonto + totalIgv;

  const tieneCuenta = !!proveedor.numeroCuenta;
  const tieneNombre = !!proveedor.nombreCuenta;

  /* colspan para la fila TOTAL: # + Monto + IGV + Fecha + Estado + [cuenta] + [nombre] + Detalle */
  const colsAntes = 6 + (tieneCuenta ? 1 : 0) + (tieneNombre ? 1 : 0);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.fichaModal}>

        {/* Barra de título */}
        <div className={styles.fichaTitle}>
          <div>
            <span className={styles.fichaTitleText}>FICHA DE PROVEEDOR</span>
            <span className={styles.fichaTitleSub}>{proveedor.codigo} — {proveedor.nombre}</span>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={16} /></button>
        </div>

        {/* Info del proveedor */}
        <div className={styles.fichaInfo}>
          {/* Columna izquierda */}
          <div className={styles.fichaInfoLeft}>
            <div className={styles.fichaInfoHeader}>
              {proveedor.ciudad && <span className={styles.fichaCity}>{proveedor.ciudad}</span>}
              <span className={styles.fichaYear}>
                {new Date(proveedor.inicio).getFullYear()} – {new Date(proveedor.fin).getFullYear()}
              </span>
            </div>

            <div className={styles.fichaGrid}>
              <span>Ubicación</span>
              <span>{proveedor.ubicacion}</span>

              <span>Tipo de contrato</span>
              <span>{proveedor.tipoContrato}</span>

              {proveedor.elementos && (
                <>
                  <span>Elementos</span>
                  <span>{proveedor.elementos}</span>
                </>
              )}

              <span>Inicio</span>
              <span>{fmtDate(proveedor.inicio)}</span>

              <span>Fin</span>
              <span>{fmtDate(proveedor.fin)}</span>

              <span>Costo mensual</span>
              <span>{fmtMoney(proveedor.costoMensual)}</span>

              {proveedor.costoLuzMes > 0 && (
                <>
                  <span>Costo luz / mes</span>
                  <span>{fmtMoney(proveedor.costoLuzMes)}</span>
                </>
              )}
            </div>
          </div>

          {/* Columna derecha */}
          <div className={styles.fichaInfoRight}>
            <div className={styles.fichaInfoItem}>
              <span className={styles.fichaInfoLabel}>Situación del contrato</span>
              <span className={`${styles.fichaBadge} ${vigente ? styles.fichaBadgeVigente : styles.fichaBadgeVencido}`}>
                {vigente ? "VIGENTE" : "VENCIDO"}
              </span>
            </div>

            <div className={styles.fichaInfoItem}>
              <span className={styles.fichaInfoLabel}>Relevancia comercial</span>
              <span className={`${styles.fichaBadge} ${styles[REL_CLASS[proveedor.relevanciaComercial]]}`}>
                {proveedor.relevanciaComercial}
              </span>
            </div>

            {proveedor.razonSocial && (
              <div className={styles.fichaInfoItem}>
                <span className={styles.fichaInfoLabel}>Razón social</span>
                <span className={styles.fichaInfoVal}>{proveedor.razonSocial}</span>
              </div>
            )}

            {proveedor.numeroCuenta && (
              <div className={styles.fichaInfoItem}>
                <span className={styles.fichaInfoLabel}>N° de cuenta</span>
                <span className={styles.fichaInfoVal}>{proveedor.numeroCuenta}</span>
              </div>
            )}

            {proveedor.nombreCuenta && (
              <div className={styles.fichaInfoItem}>
                <span className={styles.fichaInfoLabel}>A nombre de</span>
                <span className={styles.fichaInfoVal}>{proveedor.nombreCuenta}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabla de cuotas */}
        <div className={styles.cuotasSection}>
          <div className={styles.cuotasTableWrap}>
            <table className={styles.cuotasTable}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Monto</th>
                  <th>IGV</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  {tieneCuenta && <th>N° Cuenta</th>}
                  {tieneNombre && <th>A nombre de</th>}
                  <th>Detalle</th>
                  <th>Total</th>
                </tr>
              </thead>

              <tbody>
                {cuotas.map((c) => {
                  const edit   = edits[c.id] ?? {};
                  const estado = edit.estado ?? c.estado;

                  return (
                    <tr key={c.id} className={`${estado === "CANCELADO" ? styles.rowCancelado : ""} ${saving[c.id] ? styles.rowSaving : ""}`}>
                      <td className={styles.tdNum}>{c.numero}</td>
                      <td className={styles.tdMoney}>{fmtMoney(c.monto)}</td>
                      <td className={styles.tdMoney}>{fmtMoney(c.igv)}</td>

                      {/* Fecha editable */}
                      <td>
                        {isAdmin ? (
                          <input
                            className={styles.inputInline}
                            value={edit.fecha ?? c.fecha}
                            onChange={(e) => setEdit(c.id, "fecha", e.target.value)}
                            onBlur={() => saveCuota(c, edits[c.id])}
                          />
                        ) : (
                          <span>{c.fecha}</span>
                        )}
                      </td>

                      {/* Estado editable */}
                      <td>
                        {isAdmin ? (
                          <select
                            className={`${styles.selectEstado} ${estado === "CANCELADO" ? styles.selectCancelado : styles.selectPendiente}`}
                            value={estado}
                            onChange={(e) => {
                              const val = e.target.value;
                              setEdit(c.id, "estado", val);
                              saveCuota(c, { ...edits[c.id], estado: val });
                            }}
                          >
                            <option value="PENDIENTE">Pendiente</option>
                            <option value="CANCELADO">Cancelado</option>
                          </select>
                        ) : (
                          <span className={`${styles.estadoBadge} ${estado === "CANCELADO" ? styles.estadoCancelado : styles.estadoPendiente}`}>
                            {estado}
                          </span>
                        )}
                      </td>

                      {tieneCuenta && <td className={styles.tdAcct}>{proveedor.numeroCuenta}</td>}
                      {tieneNombre && <td className={styles.tdAcct}>{proveedor.nombreCuenta}</td>}

                      {/* Detalle editable */}
                      <td>
                        {isAdmin ? (
                          <input
                            className={styles.inputInline}
                            value={edit.detalle ?? ""}
                            placeholder="Notas…"
                            onChange={(e) => setEdit(c.id, "detalle", e.target.value)}
                            onBlur={() => saveCuota(c, edits[c.id])}
                          />
                        ) : (
                          <span>{c.detalle || "—"}</span>
                        )}
                      </td>

                      <td className={styles.tdTotal}>{fmtMoney(c.monto + c.igv)}</td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className={styles.tfootRow}>
                  <td className={styles.tdTotalLabel}>TOTAL</td>
                  <td className={styles.tdTotalMoney}>{fmtMoney(totalMonto)}</td>
                  <td className={styles.tdTotalMoney}>{fmtMoney(totalIgv)}</td>
                  <td colSpan={colsAntes - 3}></td>
                  <td className={styles.tdTotalFinal}>{fmtMoney(totalGeneral)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
