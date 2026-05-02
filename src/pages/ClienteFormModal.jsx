import { useEffect } from "react";
import { X } from "lucide-react";
import styles from "../styles/formModal.module.scss";

export default function ClienteFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancel]);

  return (
    <div className={styles.formOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.formModalHeader}>
          <h3>{editId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form onSubmit={onSubmit} className={styles.formModalBody}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Nombre comercial</label>
              <input
                placeholder="Empresa S.A."
                value={form.nombreComercial}
                onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
                required
              />
            </div>
            <div className={styles.formField}>
              <label>RUC / Documento</label>
              <input
                placeholder="20XXXXXXXXX"
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label>Nombre de contacto</label>
              <input
                placeholder="Juan Pérez"
                value={form.nombreContacto}
                onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })}
                required
              />
            </div>
            <div className={styles.formField}>
              <label>Teléfono</label>
              <input
                placeholder="+51 999 000 000"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="contacto@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className={styles.formField}>
            <label>Dirección</label>
            <input
              placeholder="Av. Lima 123, Lima"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>
              {editId ? "Actualizar" : "Crear Cliente"}
            </button>
            <button type="button" className={styles.btnGhost} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
