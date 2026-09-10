import { useEffect, useState, useCallback } from "react";
import { X, Briefcase, ClipboardList, Boxes } from "lucide-react";
import useAuth from "../auth/useAuth";
import { getProyectos, getProyecto, actualizarProyecto, getProyectosExternos } from "../api/proyectos";
import { getUsuarios } from "../api/usuarios";
import styles from "./proyectos.module.scss";

const ESTADO_LABEL = {
  PLANIFICACION: "Planificación",
  EN_CURSO: "En curso",
  PAUSADO: "Pausado",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};
const ESTADO_BADGE = {
  PLANIFICACION: styles.badgePlanificacion,
  EN_CURSO: styles.badgeEnCurso,
  PAUSADO: styles.badgePausado,
  COMPLETADO: styles.badgeCompletado,
  CANCELADO: styles.badgeCancelado,
};
// seguimiento-actividades guarda el estado como el texto en español tal cual
// (no un código), así que el badge de esa pestaña se busca por texto.
const ESTADO_BADGE_POR_TEXTO = {
  "Planificación": styles.badgePlanificacion,
  "En Curso": styles.badgeEnCurso,
  "Pausado": styles.badgePausado,
  "Completado": styles.badgeCompletado,
  "Cancelado": styles.badgeCancelado,
};

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

/* ── Modal de detalle: responsables, comparación proyectado/asignado, y qué salió del Almacén ── */
function ProyectoDetalleModal({ proyectoId, isAdmin, usuarios, onClose, onActualizado }) {
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    getProyecto(proyectoId)
      .then((data) => {
        if (!activo) return;
        setProyecto(data);
        setForm({
          estado: data.estado,
          gerenteResponsableId: data.gerenteResponsableId ?? "",
          jefeResponsableId: data.jefeResponsableId ?? "",
        });
      })
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [proyectoId]);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const actualizado = await actualizarProyecto(proyectoId, {
        estado: form.estado,
        gerenteResponsableId: form.gerenteResponsableId || null,
        jefeResponsableId: form.jefeResponsableId || null,
      });
      setProyecto((p) => ({ ...p, ...actualizado }));
      onActualizado?.();
    } finally {
      setGuardando(false);
    }
  };

  const staff = usuarios.filter((u) => u.role !== "CLIENTE");

  return (
    <div className={styles.wizardOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.wizardCard} style={{ maxWidth: 680 }}>
        <div className={styles.wizardHeader}>
          <div>
            <h3>{proyecto?.nombre || "Cargando…"}</h3>
            {proyecto && (
              <p className={styles.wizardSubtitle}>
                {ESTADO_LABEL[proyecto.estado]} · Cliente: {proyecto.cliente?.nombreComercial}
              </p>
            )}
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.detalleBody}>
          {cargando || !proyecto ? (
            <p className={styles.empty}>Cargando proyecto…</p>
          ) : (
            <>
              <div className={styles.resumenGrid}>
                <div className={styles.resumenItem}>
                  <span>Proyectado</span>
                  <span>{fmtMoney(proyecto.presupuestoEstimado)}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span>Asignado (Almacén)</span>
                  <span className={proyecto.asignado > proyecto.presupuestoEstimado ? styles.montoAlerta : styles.montoOk}>
                    {fmtMoney(proyecto.asignado)}
                  </span>
                </div>
                <div className={styles.resumenItem}>
                  <span>Diferencia</span>
                  <span>{fmtMoney(proyecto.presupuestoEstimado - proyecto.asignado)}</span>
                </div>
                <div className={styles.resumenItem}>
                  <span>Vigencia</span>
                  <span style={{ fontSize: "0.85rem" }}>{fmtFecha(proyecto.fechaInicio)} → {fmtFecha(proyecto.fechaFin)}</span>
                </div>
              </div>

              {isAdmin ? (
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Estado</label>
                    <select value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}>
                      {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div className={styles.formField}>
                    <label>Gerente responsable</label>
                    <select value={form.gerenteResponsableId} onChange={(e) => setForm((f) => ({ ...f, gerenteResponsableId: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {staff.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                  <div className={styles.formField}>
                    <label>Jefe responsable</label>
                    <select value={form.jefeResponsableId} onChange={(e) => setForm((f) => ({ ...f, jefeResponsableId: e.target.value }))}>
                      <option value="">Sin asignar</option>
                      {staff.map((u) => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Gerente responsable</label>
                    <p>{proyecto.gerenteResponsable?.nombre || "Sin asignar"}</p>
                  </div>
                  <div className={styles.formField}>
                    <label>Jefe responsable</label>
                    <p>{proyecto.jefeResponsable?.nombre || "Sin asignar"}</p>
                  </div>
                </div>
              )}

              <div>
                <p className={styles.seccionTitulo}>Productos de Almacén asignados a este proyecto</p>
                {proyecto.movimientos?.length ? (
                  <table className={styles.miniTable}>
                    <thead>
                      <tr><th>Ítem</th><th>Cantidad</th><th>Monto</th><th>Fecha</th></tr>
                    </thead>
                    <tbody>
                      {proyecto.movimientos.map((m) => (
                        <tr key={m.id}>
                          <td><span className={styles.itemCode}>{m.item?.codigo}</span>{m.item?.nombre}</td>
                          <td>{m.cantidad} {m.item?.unidad}</td>
                          <td>{fmtMoney(m.precioTotal)}</td>
                          <td>{fmtFecha(m.fecha)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className={styles.empty}>Todavía no se le ha asignado nada desde el Almacén.</p>
                )}
              </div>
            </>
          )}
        </div>

        {isAdmin && proyecto && (
          <div className={styles.wizardActions}>
            <button className={styles.btnOutline} onClick={onClose}>Cerrar</button>
            <button className={styles.btnPrimary} onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pestaña: proyectos del ERP (nacidos de una cotización, o con stub) ──── */
function TablaProyectosErp({ proyectos, loading, onAbrir }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Cotización</th>
            <th>Cliente</th>
            <th>Estado</th>
            <th>Jefe responsable</th>
            <th>Proyectado</th>
            <th>Asignado</th>
            <th>Fechas</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={7} className={styles.empty}>Cargando…</td></tr>
          ) : proyectos.length === 0 ? (
            <tr><td colSpan={7} className={styles.empty}>Todavía no hay proyectos — se crean solos al aprobar una cotización.</td></tr>
          ) : (
            proyectos.map((p) => (
              <tr key={p.id} className={styles.rowClickable} onClick={() => onAbrir(p.id)}>
                <td>{p.cotizacion?.numero || <span className={styles.sinAsignar}>Seguimiento de Actividades</span>}</td>
                <td>{p.cliente?.nombreComercial || "—"}</td>
                <td><span className={`${styles.badgeEstado} ${ESTADO_BADGE[p.estado]}`}>{ESTADO_LABEL[p.estado]}</span></td>
                <td>{p.jefeResponsable?.nombre || <span className={styles.sinAsignar}>Sin asignar</span>}</td>
                <td>{fmtMoney(p.presupuestoEstimado)}</td>
                <td className={p.asignado > p.presupuestoEstimado ? styles.montoAlerta : undefined}>{fmtMoney(p.asignado)}</td>
                <td>{fmtFecha(p.fechaInicio)} → {fmtFecha(p.fechaFin)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Pestaña: proyectos que viven en seguimiento-actividades (solo lectura) ── */
function TablaProyectosExternos({ proyectos, loading, onAbrir }) {
  return (
    <div className={styles.tableContainer}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Proyecto</th>
            <th>Estado</th>
            <th>Jefe responsable</th>
            <th>Proyectado</th>
            <th>Ejecutado</th>
            <th>En Almacén</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={6} className={styles.empty}>Cargando…</td></tr>
          ) : proyectos.length === 0 ? (
            <tr><td colSpan={6} className={styles.empty}>No se encontraron proyectos en seguimiento-actividades.</td></tr>
          ) : (
            proyectos.map((p) => (
              <tr
                key={p.id}
                className={p.proyectoInternoId ? styles.rowClickable : undefined}
                onClick={() => p.proyectoInternoId && onAbrir(p.proyectoInternoId)}
              >
                <td>{p.nombre}</td>
                <td>{p.estado ? <span className={`${styles.badgeEstado} ${ESTADO_BADGE_POR_TEXTO[p.estado] || styles.badgeGrisExterno}`}>{p.estado}</span> : "—"}</td>
                <td>{p.jefeResponsable || <span className={styles.sinAsignar}>Sin asignar</span>}</td>
                <td>{fmtMoney(p.presupuestoEstimado)}</td>
                <td>{fmtMoney(p.presupuestoEjecutado)}</td>
                <td>
                  {p.proyectoInternoId
                    ? <span className={styles.badgeEnAlmacen}>{fmtMoney(p.asignado)} asignado</span>
                    : <span className={styles.sinAsignar}>Sin movimientos todavía</span>}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Proyectos() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [tab, setTab] = useState("erp");
  const [proyectos, setProyectos] = useState([]);
  const [externos, setExternos] = useState([]);
  const [loadingErp, setLoadingErp] = useState(true);
  const [loadingExternos, setLoadingExternos] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [detalleId, setDetalleId] = useState(null);

  const cargarErp = useCallback(async () => {
    setLoadingErp(true);
    try {
      const data = await getProyectos();
      setProyectos(Array.isArray(data) ? data : []);
    } finally {
      setLoadingErp(false);
    }
  }, []);

  const cargarExternos = useCallback(async () => {
    setLoadingExternos(true);
    try {
      const data = await getProyectosExternos();
      setExternos(Array.isArray(data) ? data : []);
    } catch {
      setExternos([]);
    } finally {
      setLoadingExternos(false);
    }
  }, []);

  useEffect(() => { cargarErp(); }, [cargarErp]);

  // La pestaña de seguimiento-actividades se carga recién al abrirla la
  // primera vez, para no pagar el viaje a Firestore si nadie la mira.
  useEffect(() => {
    if (tab === "externos" && externos.length === 0 && !loadingExternos) cargarExternos();
  }, [tab, externos.length, loadingExternos, cargarExternos]);

  useEffect(() => {
    if (!isAdmin) return;
    getUsuarios().then(setUsuarios).catch(() => {});
  }, [isAdmin]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}><Briefcase size={26} style={{ verticalAlign: "-4px", marginRight: 8 }} />Proyectos</h1>
          <p className={styles.subtitle}>Cotizaciones aprobadas, sus responsables, y lo que Almacén ya les asignó.</p>
        </div>
      </div>

      <div className={styles.tabs}>
        <button className={`${styles.tab} ${tab === "erp" ? styles.tabActive : ""}`} onClick={() => setTab("erp")}>
          <ClipboardList size={15} /> Proyectos del ERP
        </button>
        <button className={`${styles.tab} ${tab === "externos" ? styles.tabActive : ""}`} onClick={() => setTab("externos")}>
          <Boxes size={15} /> Seguimiento de Actividades
        </button>
      </div>

      {tab === "erp" ? (
        <TablaProyectosErp proyectos={proyectos} loading={loadingErp} onAbrir={setDetalleId} />
      ) : (
        <TablaProyectosExternos proyectos={externos} loading={loadingExternos} onAbrir={setDetalleId} />
      )}

      {detalleId && (
        <ProyectoDetalleModal
          proyectoId={detalleId}
          isAdmin={isAdmin}
          usuarios={usuarios}
          onClose={() => setDetalleId(null)}
          onActualizado={() => { cargarErp(); cargarExternos(); }}
        />
      )}
    </div>
  );
}
