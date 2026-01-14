import React from "react";
import styles from "./usuarioFormModal.module.scss";

export default function UsuarioFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  return (
    <div className={styles.modalOverlay}>
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
            <button type="button" className={styles.btnSecondary} onClick={onCancel}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
