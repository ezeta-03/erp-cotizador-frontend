import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GridLayout, { WidthProvider } from "react-grid-layout/legacy";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { LogOut, Moon, Sun, Settings2, Plus, X, Check } from "lucide-react";
import useAuth from "../auth/useAuth";
import useDarkMode from "../hooks/useDarkMode";
import { getResumenDashboard } from "../api/dashboard";
import { getPanelWidgets, savePanelWidgets } from "../api/panelWidgets";
import { WIDGET_REGISTRY, kindsForRole } from "../constants/widgets";
import styles from "./ERPHome.module.scss";

const Grid = WidthProvider(GridLayout);

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(v ?? 0);

const HOY = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

// El resumen de cada kind trae una forma distinta; se despacha por qué campos
// trae, no por el kind en sí — así varios kinds comparten la misma pinta sin
// tener que enumerarlos todos a mano.
function TileContent({ data, compact }) {
  if (!data) return null;
  if (data.ocupados !== undefined && data.total !== undefined) {
    if (compact) {
      return <p className={styles.numSm}>{data.ocupados}<span className={styles.numSmTag}> / {data.total}</span></p>;
    }
    const pct = data.total ? Math.round((data.ocupados / data.total) * 100) : 0;
    return (
      <div>
        <p className={styles.bigNum}>{data.ocupados}<span className={styles.bigNumOf}> / {data.total}</span></p>
        {data.utilidadMes !== undefined && <p className={styles.subNum}>{fmt(data.utilidadMes)} de utilidad este mes</p>}
        <div className={styles.bar}><span style={{ width: `${pct}%` }} /></div>
      </div>
    );
  }
  if (data.utilidadMes !== undefined) {
    return compact
      ? <p className={styles.numSm}>{fmt(data.utilidadMes)}</p>
      : <div><p className={styles.num}>{fmt(data.utilidadMes)}</p><p className={styles.lbl}>utilidad este mes</p></div>;
  }
  if (data.pendientes !== undefined && data.monto !== undefined) {
    return <div><p className={styles.num}>{data.pendientes}</p><p className={styles.lbl}>pendientes · {fmt(data.monto)}</p></div>;
  }
  if (data.pendientes !== undefined) {
    return <p className={styles.numSm}>{data.pendientes} <span className={styles.numSmTag}>pendientes</span></p>;
  }
  if (data.enCurso !== undefined) {
    return <p className={styles.numSm}>{data.enCurso} <span className={styles.numSmTag}>en curso</span></p>;
  }
  if (data.activos !== undefined) {
    return <p className={styles.numSm}>{data.activos} <span className={styles.numSmTag}>activos</span></p>;
  }
  if (data.activas !== undefined) {
    return (
      <div>
        <p className={styles.num}>{data.activas}</p>
        <p className={styles.lbl}>activas{data.porVencer > 0 ? ` · ${data.porVencer} por vencer` : ""}</p>
      </div>
    );
  }
  if (data.total !== undefined) {
    return <p className={styles.numSm}>{data.total} <span className={styles.numSmTag}>registrados</span></p>;
  }
  return null;
}

export default function ERPHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleDark] = useDarkMode();
  const role = user?.role?.toLowerCase() ?? "";
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  const [widgets, setWidgets] = useState(null); // null = cargando
  const [metrics, setMetrics] = useState(null); // null = cargando
  const [editing, setEditing] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let vivo = true;
    getPanelWidgets()
      .then((ws) => {
        if (!vivo) return;
        setWidgets(ws);
        return getResumenDashboard(ws.map((w) => w.kind));
      })
      .then((d) => vivo && d && setMetrics(d))
      .catch(() => vivo && setMetrics({}));
    return () => { vivo = false; };
  }, []);

  const ir = (kind) => {
    const meta = WIDGET_REGISTRY[kind];
    if (meta) navigate(`/erp/${role}/${meta.path}`);
  };

  const startEditing = () => { setSnapshot(widgets); setEditing(true); };
  const cancelEditing = () => { setWidgets(snapshot); setEditing(false); setShowPicker(false); };

  const saveEditing = async () => {
    setSaving(true);
    try {
      await savePanelWidgets(widgets);
      const d = await getResumenDashboard(widgets.map((w) => w.kind));
      setMetrics(d);
      setEditing(false);
      setShowPicker(false);
    } finally {
      setSaving(false);
    }
  };

  const removeWidget = (kind) => setWidgets((ws) => ws.filter((w) => w.kind !== kind));

  const addWidget = (kind) => {
    setWidgets((ws) => {
      const maxY = ws.reduce((m, w) => Math.max(m, w.y + w.h), 0);
      return [...ws, { kind, x: 0, y: maxY, w: 1, h: 1 }];
    });
    setShowPicker(false);
  };

  const onLayoutChange = (layout) => {
    setWidgets((ws) => ws.map((w) => {
      const l = layout.find((li) => li.i === w.kind);
      return l ? { ...w, x: l.x, y: l.y, w: l.w, h: l.h } : w;
    }));
  };

  const cargando = widgets === null;
  const pinnedKinds = new Set((widgets ?? []).map((w) => w.kind));
  const available = kindsForRole(role).filter((k) => !pinnedKinds.has(k));
  const primaryKind = widgets && widgets.length
    ? widgets.reduce((a, b) => (a.w * a.h >= b.w * b.h ? a : b)).kind
    : null;

  const rglLayout = (widgets ?? []).map((w) => ({ i: w.kind, x: w.x, y: w.y, w: w.w, h: w.h, minW: 1, minH: 1, maxW: 4 }));

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <img src="/zaazmago_holding.png" alt="Zaazmago" className={styles.logo} />
          <span className={styles.erpLabel}>ERP</span>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </div>
          <div className={styles.userAvatar} aria-hidden="true">{initials}</div>
          <button className={styles.btnTheme} onClick={toggleDark} title={dark ? "Modo claro" : "Modo oscuro"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className={styles.btnLogout} onClick={logout} title="Cerrar sesión">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Bento */}
      <section className={styles.bentoWrap}>
        <div className={styles.bentoHero}>
          <div>
            <h1 className={styles.heroTitle}>Bienvenido, {user?.nombre?.split(" ")[0]}</h1>
            <p className={styles.heroSub}>Esto es Zaazmago hoy</p>
          </div>
          <div className={styles.heroActions}>
            {editing ? (
              <>
                <button className={styles.btnGhostSmall} onClick={cancelEditing} disabled={saving}>Cancelar</button>
                <button className={styles.btnPrimarySmall} onClick={saveEditing} disabled={saving}>
                  <Check size={15} /> {saving ? "Guardando…" : "Guardar"}
                </button>
              </>
            ) : (
              !cargando && (
                <button className={styles.btnGhostSmall} onClick={startEditing}>
                  <Settings2 size={15} /> Personalizar
                </button>
              )
            )}
            <span className={styles.heroDate}>{HOY}</span>
          </div>
        </div>

        {cargando ? (
          <div className={styles.bento}>
            {[0, 1, 2].map((i) => <div key={i} className={styles.tileSkeletonBlock} />)}
          </div>
        ) : editing ? (
          <>
            <div className={styles.editHint}>Arrastra para reordenar, estira la esquina para redimensionar.</div>

            <Grid
              className={styles.editGrid}
              layout={rglLayout}
              cols={4}
              rowHeight={128}
              margin={[16, 16]}
              onLayoutChange={onLayoutChange}
              draggableCancel={`.${styles.tileRemove}`}
            >
              {widgets.map((w) => {
                const meta = WIDGET_REGISTRY[w.kind];
                if (!meta) return null;
                const Icon = meta.icon;
                return (
                  <div key={w.kind} className={styles.tile}>
                    <button className={styles.tileRemove} onClick={() => removeWidget(w.kind)} aria-label={`Quitar ${meta.label}`}>
                      <X size={13} />
                    </button>
                    <div className={styles.tileHead}>
                      <span className={styles.tileIcon} data-tono={w.kind === primaryKind ? "acento" : undefined}>
                        <Icon size={w.h >= 2 ? 18 : 16} />
                      </span>
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </Grid>

            <div className={styles.addModuleRow}>
              <button className={styles.btnAddModule} onClick={() => setShowPicker((v) => !v)}>
                <Plus size={15} /> Agregar bloque
              </button>
              {showPicker && (
                <div className={styles.picker}>
                  {available.length === 0 ? (
                    <p className={styles.pickerEmpty}>Ya tienes todos los bloques disponibles.</p>
                  ) : (
                    available.map((k) => {
                      const meta = WIDGET_REGISTRY[k];
                      const Icon = meta.icon;
                      return (
                        <button key={k} className={styles.pickerItem} onClick={() => addWidget(k)}>
                          <Icon size={15} /> {meta.label}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.bento}>
            {widgets.map((w) => {
              const meta = WIDGET_REGISTRY[w.kind];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <button
                  key={w.kind}
                  className={styles.tile}
                  style={{ "--w": w.w, "--h": w.h }}
                  onClick={() => ir(w.kind)}
                >
                  <div className={styles.tileHead}>
                    <span className={styles.tileIcon} data-tono={w.kind === primaryKind ? "acento" : undefined}>
                      <Icon size={w.h >= 2 ? 18 : 16} />
                    </span>
                    {meta.label}
                  </div>
                  {metrics === null ? (
                    <div className={styles.tileSkeleton} />
                  ) : (
                    <TileContent data={metrics[w.kind]} compact={w.h < 2} />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
