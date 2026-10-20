import styles from "./ui.module.scss";

// columns: [{ key, label, align?: "right", render?: (row) => node }]
export default function Table({ columns, rows, rowKey = "id", dense = false, empty = "Sin registros", onRowClick }) {
  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.table} ${dense ? styles.dense : ""}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={c.align === "right" ? { textAlign: "right" } : undefined}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className={styles.empty}>{empty}</td></tr>
          ) : rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: "pointer" } : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={c.align === "right" ? styles.num : undefined}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
