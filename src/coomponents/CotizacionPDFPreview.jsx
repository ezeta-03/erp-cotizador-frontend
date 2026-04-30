import styles from "./CotizacionPDFPreview.module.scss";

const S = (v) => `S/ ${(v || 0).toFixed(2)}`;

export default function CotizacionPDFPreview({
  numero, fecha, estado, cliente, conIgv,
  items = [], valorVenta, igvMonto, total,
}) {
  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandName}>ZAAZMAGO</span>
          <span className={styles.brandTagline}>PUBLICIDAD &amp; DISEÑO</span>
        </div>
        <div className={styles.docInfo}>
          <span className={styles.docNumero}>Cotización {numero || "NUEVA"}</span>
          <span className={styles.docFecha}>{fecha}</span>
          {estado && <span className={styles.docEstado}>{estado}</span>}
        </div>
      </div>

      <div className={styles.separator} />

      {/* ── Cliente ── */}
      <div className={styles.clienteSection}>
        <span className={styles.paraLabel}>PARA</span>
        <span className={styles.clienteNombre}>{cliente?.nombreComercial || "—"}</span>
        {cliente?.nombreContacto && (
          <span className={styles.clienteSub}>{cliente.nombreContacto}</span>
        )}
        {cliente?.email && (
          <span className={styles.clienteSub}>{cliente.email}</span>
        )}
      </div>

      {/* ── IGV notice ── */}
      <div className={`${styles.igvNotice} ${conIgv ? styles.igvNoticeOn : styles.igvNoticeOff}`}>
        {conIgv ? "Precios con IGV incluido (18%)" : "Precios sin IGV (valor de venta)"}
      </div>

      {/* ── Items table ── */}
      <table className={styles.itemsTable}>
        <thead>
          <tr>
            <th className={styles.colNum}>#</th>
            <th>Descripción</th>
            <th className={styles.colCant}>Cant.</th>
            <th className={styles.colPrecio}>Precio unit.</th>
            <th className={styles.colSubtotal}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const unidad = item.unidad || "";
            let medidaStr = null;
            if (item.medidaAncho && item.medidaAlto) {
              const a = parseFloat(item.medidaAncho);
              const b = parseFloat(item.medidaAlto);
              medidaStr = `${a} x ${b}${unidad ? ` ${unidad}` : ""} por pieza`;
            } else if (item.medida && parseFloat(item.medida) !== 1) {
              medidaStr = `${parseFloat(item.medida)}${unidad ? ` ${unidad}` : ""} por pieza`;
            }
            return (
              <tr key={i}>
                <td className={styles.colNum}>{i + 1}</td>
                <td>
                  <div className={styles.descNombre}>{item.nombre}</div>
                  {item.descripcion && (
                    <div className={styles.descGlosa}>{item.descripcion}</div>
                  )}
                  {medidaStr && (
                    <div className={styles.descMedida}>{medidaStr}</div>
                  )}
                </td>
                <td className={styles.colCant}>{item.cantidad}</td>
                <td className={styles.colPrecio}>{S(item.precio)}</td>
                <td className={`${styles.colSubtotal} ${styles.bold}`}>{S(item.subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Totals ── */}
      <div className={styles.totals}>
        {conIgv && (
          <>
            <div className={styles.totalRow}>
              <span>Valor de venta</span>
              <span>{S(valorVenta)}</span>
            </div>
            <div className={`${styles.totalRow} ${styles.totalRowIgv}`}>
              <span>IGV (18%)</span>
              <span>+ {S(igvMonto)}</span>
            </div>
            <div className={styles.totalDivider} />
          </>
        )}
        <div className={`${styles.totalRow} ${styles.totalRowFinal}`}>
          <span className={styles.totalLabel}>
            Total
            <span className={`${styles.igvBadge} ${conIgv ? styles.igvBadgeOn : styles.igvBadgeOff}`}>
              {conIgv ? "Con IGV" : "Sin IGV"}
            </span>
          </span>
          <span>{S(total)}</span>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className={styles.footer}>
        <span>Cotización válida por 15 días hábiles desde la fecha de emisión.</span>
        <span className={styles.footerBrand}>ZAAZMAGO</span>
      </div>
    </div>
  );
}
