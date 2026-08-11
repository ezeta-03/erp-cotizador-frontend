import { useEffect, useState, useCallback } from "react";
import { X } from "lucide-react";
import { getPanelesEliminados, restaurarPanel } from "../api/paneles";

// El código de un panel sigue siendo único aunque esté eliminado (soft-delete),
// por eso hace falta poder verlo y restaurarlo en vez de reutilizar el código a ciegas.
export default function PapeleraPanelesModal({ esMupi, styles, onClose, onRestaurado }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurando, setRestaurando] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPanelesEliminados();
      setItems(data.filter((p) => (esMupi ? p.tipo === "MUPI" : p.tipo !== "MUPI")));
    } finally {
      setLoading(false);
    }
  }, [esMupi]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleRestaurar = async (panel) => {
    setRestaurando(panel.id);
    try {
      await restaurarPanel(panel.id);
      await cargar();
      onRestaurado?.();
    } finally {
      setRestaurando(null);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{esMupi ? "Mupis eliminados" : "Paneles eliminados"}</h2>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles.formBody}>
          {loading ? (
            <p className={styles.empty}>Cargando…</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>No hay {esMupi ? "mupis" : "paneles"} eliminados.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {items.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "0.75rem 1rem", background: "var(--color-surface2)", borderRadius: "10px",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{p.codigo}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text3)" }}>{p.nombre || "Sin nombre"}</div>
                  </div>
                  <button className={styles.btnPrimary} disabled={restaurando === p.id} onClick={() => handleRestaurar(p)}>
                    {restaurando === p.id ? "Restaurando…" : "Restaurar"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
