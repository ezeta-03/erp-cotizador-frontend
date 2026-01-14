import React from "react";
import styles from "./clienteFormModal.module.scss";

export default function ClienteFormModal({ form, setForm, editId, onSubmit, onCancel }) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <h2>{editId ? "Editar Cliente" : "Crear Cliente"}</h2>
        <form onSubmit={onSubmit} className={styles.form}>
          <input placeholder="Nombre Comercial" value={form.nombreComercial} onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })} required />
          <input placeholder="Nombre de Contacto" value={form.nombreContacto} onChange={(e) => setForm({ ...form, nombreContacto: e.target.value })} required />
          <input placeholder="Documento" value={form.documento} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
          <input placeholder="Teléfono" value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          <input placeholder="Correo" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Dirección" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />

          <div className={styles.actions}>
            <button type="submit" className={styles.btnPrimary}>{editId ? "Actualizar" : "Crear"}</button>
            <button type="button" className={styles.btnSecondary} onClick={onCancel}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
