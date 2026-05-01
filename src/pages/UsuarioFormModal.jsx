import { useEffect } from "react";
import styles from "../styles/formModal.module.scss";

export default function UsuarioFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onCancel(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCancel]);

  return (
    <div className={styles.formOverlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formModalHeader}>
          <h3>{editId ? "Editar Usuario" : "Invitar Usuario"}</h3>
        </div>

        <form onSubmit={onSubmit} className={styles.formModalBody}>
          <div className={styles.formField}>
            <label>Nombre completo</label>
            <input
              placeholder="Ej. Juan Pérez"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div className={styles.formField}>
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="usuario@empresa.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className={styles.formField}>
            <label>Rol</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="ADMIN">Administrador</option>
              <option value="VENTAS">Ventas</option>
              <option value="CONTABLE">Contabilidad</option>
            </select>
          </div>

          {editId && (
            <div className={styles.formField}>
              <label>Nueva contraseña</label>
              <input
                type="password"
                placeholder="Dejar vacío para no cambiar"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}

          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>
              {editId ? "Actualizar" : "Enviar invitación"}
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
