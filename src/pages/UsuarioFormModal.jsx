import React, { useEffect } from "react";
import styles from "./usuarioFormModal.module.scss";

export default function UsuarioFormModal({
  form,
  setForm,
  editId,
  onSubmit,
  onCancel,
}) {
  const handleOverlayClick = (e) => {
    if (e.target.classList.contains(styles.modalOverlay)) {
      onCancel();
    }
  };
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);
  return (
    <div
      className={`${styles.modalOverlay} ${styles.open}`}
      onClick={handleOverlayClick}
    >
      {" "}
      <div className={styles.modal}>
        <h2>{editId ? "Editar Usuario" : "Crear Usuario"}</h2>
        <form onSubmit={onSubmit} className={styles.form}>
          <input
            placeholder="Nombre completo"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
            required
          />
          <input
            placeholder="Correo electrónico"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          {!editId && (
            <input
              placeholder="Contraseña temporal"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          )}
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option value="ADMIN">Administrador</option>
            <option value="VENTAS">Ventas</option>
          </select>

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>
              {editId ? "Actualizar" : "Crear"}
            </button>
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onCancel}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
