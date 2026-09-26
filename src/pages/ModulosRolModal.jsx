import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getModulosRol, guardarModulosRol } from "../api/modulosRol";
import { MODULO_LABEL, ROL_CONFIGURABLE_LABEL } from "../constants/modulos";
import { refrescarModulos } from "../hooks/useModulosHabilitados";
import styles from "./modulosRolModal.module.scss";

const NOTA_ROL = {
  VENTAS: "Ve y opera los módulos habilitados.",
  CONTABLE: "Almacén y Proyectos son de solo consulta: no registra salidas ni edita presupuestos.",
};

/* ── Módulos por rol: qué ve Ventas y qué ve Finanzas (Contable) en su menú ── */
export default function ModulosRolModal({ onClose }) {
  const [disponibles, setDisponibles] = useState(null);
  const [seleccion, setSeleccion] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    getModulosRol()
      .then((data) => {
        if (!activo) return;
        setDisponibles(data.disponibles);
        setSeleccion(Object.fromEntries(Object.entries(data.habilitados).map(([rol, ms]) => [rol, new Set(ms)])));
      })
      .catch(() => activo && setError("No se pudieron cargar los módulos."));
    return () => { activo = false; };
  }, []);

  const toggle = (rol, modulo) => {
    setSeleccion((s) => {
      const next = new Set(s[rol]);
      next.has(modulo) ? next.delete(modulo) : next.add(modulo);
      return { ...s, [rol]: next };
    });
  };

  const handleGuardar = async () => {
    setError("");
    const vacio = Object.keys(disponibles).find((rol) => seleccion[rol].size === 0);
    if (vacio) {
      setError(`${ROL_CONFIGURABLE_LABEL[vacio]} necesita al menos un módulo habilitado.`);
      return;
    }
    setGuardando(true);
    try {
      let data;
      for (const rol of Object.keys(disponibles)) {
        data = await guardarModulosRol(rol, [...seleccion[rol]]);
      }
      refrescarModulos(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar los módulos");
      setGuardando(false);
    }
  };

  return (
    <div className={styles.wizardOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.wizardCard} style={{ maxWidth: 640 }}>
        <div className={styles.wizardHeader}>
          <div>
            <h3>Módulos por rol</h3>
            <p className={styles.wizardSubtitle}>
              Elige qué módulos aparecen en el menú de cada rol. Se aplica a todos los usuarios de ese rol.
            </p>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.error}>{error}</p>}
          {!disponibles ? (
            !error && <p className={styles.cargando}>Cargando…</p>
          ) : (
            <div className={styles.roles}>
              {Object.entries(disponibles).map(([rol, modulos]) => (
                <section key={rol} className={styles.rol}>
                  <h4>{ROL_CONFIGURABLE_LABEL[rol] ?? rol}</h4>
                  <p className={styles.nota}>{NOTA_ROL[rol]}</p>
                  <ul>
                    {modulos.map((m) => {
                      const on = seleccion[rol]?.has(m);
                      return (
                        <li key={m}>
                          <span>{MODULO_LABEL[m] ?? m}</span>
                          <label className={`${styles.toggle} ${on ? styles.toggleOn : ""}`}>
                            <input type="checkbox" checked={!!on} onChange={() => toggle(rol, m)} />
                            <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className={styles.wizardActions}>
          <button className={styles.btnOutline} onClick={onClose}>Cancelar</button>
          <button className={styles.btnPrimary} onClick={handleGuardar} disabled={!disponibles || guardando}>
            {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
