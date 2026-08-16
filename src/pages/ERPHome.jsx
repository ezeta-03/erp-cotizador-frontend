import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3, UserCircle, Users,
  DollarSign, MapPin, Megaphone, KeyRound, LogOut, Moon, Sun,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import useDarkMode from "../hooks/useDarkMode";
import { getResumenDashboard } from "../api/dashboard";
import styles from "./ERPHome.module.scss";

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 0 }).format(v ?? 0);

const HOY = new Date().toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });

export default function ERPHome() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dark, toggleDark] = useDarkMode();
  const role = user?.role?.toLowerCase() ?? "";
  const isAdmin = role === "admin";
  const initials = user?.nombre?.split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  // null = cargando, false = error, objeto = datos
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    let vivo = true;
    getResumenDashboard()
      .then((d) => vivo && setResumen(d))
      .catch(() => vivo && setResumen(false));
    return () => { vivo = false; };
  }, []);

  const ir = (id) => navigate(`/erp/${role}/${id}`);

  const cargando = resumen === null;
  const error = resumen === false;
  const d = error ? null : resumen;
  const ocupacionPct = d?.outdoor?.total ? Math.round((d.outdoor.ocupados / d.outdoor.total) * 100) : 0;

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
          <span className={styles.heroDate}>{HOY}</span>
        </div>

        <div className={styles.bento}>
          {/* Outdoor — tarjeta grande */}
          <button className={`${styles.tile} ${styles.tileBig}`} onClick={() => ir("outdoor")}>
            <div className={styles.tileHead}>
              <span className={styles.tileIcon} data-tono="acento"><MapPin size={18} /></span>
              Outdoor
            </div>
            {cargando ? (
              <div className={styles.tileSkeleton} />
            ) : error ? (
              <p className={styles.tileErr}>No se pudo cargar</p>
            ) : (
              <div>
                <p className={styles.bigNum}>{d.outdoor.ocupados}<span className={styles.bigNumOf}> / {d.outdoor.total}</span></p>
                <p className={styles.subNum}>{fmt(d.outdoor.utilidadMes)} de utilidad este mes</p>
                <div className={styles.bar}><span style={{ width: `${ocupacionPct}%` }} /></div>
              </div>
            )}
          </button>

          {/* Facturar — alta */}
          <button className={`${styles.tile} ${styles.tileTall}`} onClick={() => ir("facturar")}>
            <div className={styles.tileHead}><span className={styles.tileIcon}><DollarSign size={16} /></span>Facturar</div>
            {cargando ? (
              <div className={styles.tileSkeleton} />
            ) : error ? (
              <p className={styles.tileErr}>—</p>
            ) : (
              <div>
                <p className={styles.num}>{d.facturar.pendientes}</p>
                <p className={styles.lbl}>pendientes · {fmt(d.facturar.monto)}</p>
              </div>
            )}
          </button>

          {/* Clientes — alta */}
          <button className={`${styles.tile} ${styles.tileTall}`} onClick={() => ir("clientes")}>
            <div className={styles.tileHead}><span className={styles.tileIcon}><UserCircle size={16} /></span>Clientes</div>
            {cargando ? (
              <div className={styles.tileSkeleton} />
            ) : error ? (
              <p className={styles.tileErr}>—</p>
            ) : (
              <div>
                <p className={styles.num}>{d.clientes.activos}</p>
                <p className={styles.lbl}>activos</p>
              </div>
            )}
          </button>

          {/* BTL — normal */}
          <button className={styles.tile} onClick={() => ir("btl")}>
            <div className={styles.tileHead}><span className={styles.tileIcon}><Megaphone size={16} /></span>BTL</div>
            {cargando ? (
              <div className={styles.tileSkeletonSm} />
            ) : error ? (
              <p className={styles.lbl}>—</p>
            ) : (
              <p className={styles.numSm}>{d.btl.enCurso} <span className={styles.numSmTag}>en curso</span></p>
            )}
          </button>

          {/* Usuarios — normal, solo ADMIN */}
          {isAdmin && (
            <button className={styles.tile} onClick={() => ir("usuarios")}>
              <div className={styles.tileHead}><span className={styles.tileIcon}><Users size={16} /></span>Usuarios</div>
              {cargando ? (
                <div className={styles.tileSkeletonSm} />
              ) : error ? (
                <p className={styles.lbl}>—</p>
              ) : (
                <p className={styles.numSm}>{d.usuarios?.activos ?? 0} <span className={styles.numSmTag}>activos</span></p>
              )}
            </button>
          )}

          {/* Dashboard — atajo */}
          <button className={`${styles.tile} ${styles.tileUtil}`} onClick={() => ir("dashboard")}>
            <span className={styles.tileIcon}><BarChart3 size={18} /></span>
            <span className={styles.utilLabel}>Dashboard</span>
          </button>

          {/* Cambiar contraseña — atajo */}
          <button className={`${styles.tile} ${styles.tileUtil}`} onClick={() => ir("perfil")}>
            <span className={styles.tileIcon}><KeyRound size={18} /></span>
            <span className={styles.utilLabel}>Contraseña</span>
          </button>
        </div>
      </section>
    </div>
  );
}
