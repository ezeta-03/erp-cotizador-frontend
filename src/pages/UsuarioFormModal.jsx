import { useEffect } from "react";
import styles from "../styles/formModal.module.scss";

export default function UsuarioFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancel]);

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{editId ? "Editar Usuario" : "Invitar Usuario"}</h2>
          {!editId && <p>Se enviará un correo de activación para que el usuario cree su contraseña.</p>}
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nombre completo</label>
            <input
              className={styles.input}
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Correo electrónico</label>
            <input
              className={styles.input}
              type="email"
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Rol</label>
            <select
              className={styles.select}
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="ADMIN">Administrador</option>
              <option value="VENTAS">Ventas</option>
              <option value="CONTABLE">Contabilidad</option>
            </select>
          </div>

          {editId && (
            <div className={styles.fieldGroup}>
              <label className={styles.label}>Nueva contraseña</label>
              <input
                className={styles.input}
                type="password"
                placeholder="Dejar vacío para no cambiar"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>
              {editId ? "Actualizar" : "Enviar invitación"}
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
