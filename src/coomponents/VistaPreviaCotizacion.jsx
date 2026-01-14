import React from "react";
import styles from "./Modal.module.scss";

export default function VistaPreviaCotizacion({ cotizacion, onConfirm, onCancel }) {
  if (!cotizacion) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <img src="/favicon.png" alt="Logo" />
          </div>
          <div className={styles.company}>
            <strong>ZAAZMAGO</strong><br/>
            ventas@zaazmago.com<br/>
            +51 999 999 999
          </div>
        </div>

        <h1>Cotización {cotizacion.numero}</h1>

        <div className={styles.info}>
          <p><strong>Cliente:</strong> {cotizacion.cliente?.nombreComercial}</p>
          <p><strong>Fecha:</strong> {new Date(cotizacion.createdAt).toLocaleDateString()}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cant.</th>
              <th>Precio Unit.</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {cotizacion.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.producto.material}</td>
                <td>{item.cantidad}</td>
                <td>{item.precio.toFixed(2)}</td>
                <td>{item.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className={styles.totalBox}>
          TOTAL: S/ {cotizacion.total.toFixed(2)}
        </div>

        <div className={styles.conditions}>
          <p><strong>Estado:</strong> {cotizacion.estado}</p>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnPrimary} onClick={onConfirm}>
            ✅ Confirmar y generar PDF
          </button>
          <button className={styles.btnSecondary} onClick={onCancel}>
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
