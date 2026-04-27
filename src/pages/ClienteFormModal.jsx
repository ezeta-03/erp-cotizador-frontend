import { useEffect } from "react";
import styles from "../styles/formModal.module.scss";

export default function ClienteFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{editId ? "Editar Cliente" : "Nuevo Cliente"}</h2>
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nombre comercial</label>
              <input
                className={styles.input}
                placeholder="Empresa S.A."
                value={form.nombreComercial}
                onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>RUC / Documento</label>
              <input
                className={styles.input}
                placeholder="20XXXXXXXXX"
                value={form.documento}
                onChange={(e) => setForm({ ...form, documento: e.target.value })}
                required
              />
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nombre de contacto</label>
              <input
                className={styles.input}
                placeholder="Juan Pérez"
                value={form.nombreContacto}
                onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })}
                required
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Teléfono</label>
              <input
                className={styles.input}
                placeholder="+51 999 000 000"
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Correo electrónico</label>
            <input
              className={styles.input}
              type="email"
              placeholder="contacto@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Dirección</label>
            <input
              className={styles.input}
              placeholder="Av. Lima 123, Lima"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>
              {editId ? "Actualizar" : "Crear Cliente"}
            </button>
            <button type="button" className={styles.btnSecondary} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
