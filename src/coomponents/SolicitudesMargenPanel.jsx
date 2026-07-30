import { useEffect, useState } from "react";
import { getSolicitudes, aprobarSolicitud, rechazarSolicitud } from "../api/solicitudesMargen";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";
import s from "./SolicitudesMargenPanel.module.scss";
import Spinner from "./Spinner";
import { MARGEN_MINIMO } from "../config/negocio";
import { useToast } from "./Toast";

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export default function SolicitudesMargenPanel() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtro, setFiltro]           = useState("PENDIENTE");
  const [rechazando, setRechazando]   = useState(null);
  const [motivo, setMotivo]           = useState("");
  const [enviando, setEnviando]       = useState(false);
  const { show: showToast, ToastNode } = useToast();

  const cargar = async () => {
    setLoading(true);
    try {
      const data = await getSolicitudes(filtro);
      setSolicitudes(data);
    } catch (err) {
      console.error("Error cargando solicitudes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [filtro]);

  const handleAprobar = async (id) => {
    try {
      const updated = await aprobarSolicitud(id);
      setSolicitudes((prev) => prev.map((sol) => (sol.id === id ? updated : sol)));
    } catch {
      showToast("Error aprobando solicitud");
    }
  };

  const handleRechazar = async (id) => {
    if (!motivo.trim()) return;
    setEnviando(true);
    try {
      const updated = await rechazarSolicitud(id, motivo.trim());
      setSolicitudes((prev) => prev.map((sol) => (sol.id === id ? updated : sol)));
      setRechazando(null);
      setMotivo("");
    } catch (err) {
      showToast(err?.response?.data?.message || "Error rechazando solicitud");
    } finally {
      setEnviando(false);
    }
  };

  const cancelarRechazo = () => { setRechazando(null); setMotivo(""); };

  const pendientes = solicitudes.filter((sol) => sol.estado === "PENDIENTE").length;

  const FILTROS = ["PENDIENTE", "APROBADA", "RECHAZADA", "USADA", "TODAS"];

  return (
    <>
    {ToastNode}
    <div className={s.panel}>
      {/* Header */}
      <div className={s.panelHeader}>
        <div className={s.panelTitle}>
          <h3>Solicitudes de Margen Reducido</h3>
          {pendientes > 0 && <span className={s.badgeCount}>{pendientes}</span>}
        </div>
        <button className={s.btnRefresh} onClick={cargar}>
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className={s.filtros}>
        {FILTROS.map((f) => {
          const isActive = filtro === f || (f === "TODAS" && !filtro);
          return (
            <button
              key={f}
              className={isActive ? s.filtroBtnActivo : s.filtroBtn}
              onClick={() => setFiltro(f === "TODAS" ? "" : f)}
            >
              {f}
            </button>
          );
        })}
      </div>

      {/* Contenido */}
      {loading ? (
        <div className={s.empty} style={{ flexDirection: "row", gap: "0.5rem" }}>
          <Spinner size={18} /> Cargando solicitudes...
        </div>
      ) : solicitudes.length === 0 ? (
        <p className={s.empty}>
          No hay solicitudes{filtro ? ` con estado "${filtro}"` : ""}.
        </p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th className={s.th}>Vendedor</th>
                <th className={s.th}>Cliente</th>
                <th className={s.th} style={{ width: "120px" }}>Margen</th>
                <th className={s.th}>Comentario</th>
                <th className={s.th} style={{ width: "110px" }}>Solicitado</th>
                <th className={s.th} style={{ width: "100px" }}>Estado</th>
                <th className={s.th} style={{ width: "160px" }}>Resuelto por</th>
                <th className={s.th} style={{ width: "200px" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {solicitudes.map((sol) => (
                <>
                  <tr key={sol.id} style={{ borderBottom: rechazando === sol.id ? "none" : "1px solid #f3f4f6" }}>
                    <td className={s.tdNombre}>
                      <div className={s.tdNombreMain}>{sol.usuario?.nombre}</div>
                      <div className={s.tdNombreSub}>{sol.usuario?.email}</div>
                    </td>
                    <td className={s.tdNombre}>{sol.cliente?.nombreComercial || "—"}</td>
                    <td className={s.tdMargen}>
                      <span className={`${s.margenValor} ${sol.margenSolicitado < 20 ? s.margenBajo : s.margenMedio}`}>
                        {sol.margenSolicitado}%
                      </span>
                      <span className={s.margenHint}>(mín. {MARGEN_MINIMO}%)</span>
                    </td>
                    <td className={s.tdComentario}>{sol.comentario}</td>
                    <td className={s.tdFecha}>{fmtFecha(sol.createdAt)}</td>
                    <td className={s.tdEstado}>
                      <span className={`${s.estadoBadge} ${s[sol.estado]}`}>
                        {sol.estado}
                      </span>
                    </td>
                    <td className={s.tdResueltoPor}>
                      {sol.aprobadaPor ? (
                        <div>
                          <div className={s.resueltoPorNombre}>{sol.aprobadaPor.nombre}</div>
                          <div className={s.resueltoPorFecha}>{fmtFecha(sol.resolvedAt)}</div>
                          {sol.motivoRechazo && (
                            <div className={s.resueltoPorMotivo}>"{sol.motivoRechazo}"</div>
                          )}
                        </div>
                      ) : (
                        <span className={s.resueltoPorVacio}>—</span>
                      )}
                    </td>
                    <td className={s.tdAcciones}>
                      {sol.estado === "PENDIENTE" && (
                        <div className={s.accionesWrap}>
                          <button className={s.btnAprobar} onClick={() => handleAprobar(sol.id)}>
                            <CheckCircle size={13} /> Aprobar
                          </button>
                          <button className={s.btnRechazar} onClick={() => { setRechazando(sol.id); setMotivo(""); }}>
                            <XCircle size={13} /> Rechazar
                          </button>
                        </div>
                      )}
                      {sol.estado === "APROBADA" && (
                        <span className={s.estadoTextoAprobado}>✓ Aprobada</span>
                      )}
                      {(sol.estado === "RECHAZADA" || sol.estado === "USADA") && (
                        <span className={s.estadoTexto}>
                          {sol.estado === "RECHAZADA" ? "Rechazada" : "Cotización generada"}
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Fila inline de motivo de rechazo */}
                  {rechazando === sol.id && (
                    <tr key={`rechazo-${sol.id}`} className={s.filaRechazo}>
                      <td colSpan={8}>
                        <div className={s.rechazoInner}>
                          <div style={{ flex: 1 }}>
                            <label className={s.rechazoLabel}>
                              Motivo del rechazo (requerido)
                            </label>
                            <textarea
                              className={s.rechazoTextarea}
                              value={motivo}
                              onChange={(e) => setMotivo(e.target.value)}
                              placeholder="Explica por qué se rechaza esta solicitud..."
                              rows={2}
                              autoFocus
                            />
                          </div>
                          <div className={s.rechazoAcciones}>
                            <button
                              className={s.btnConfirmarRechazo}
                              onClick={() => handleRechazar(sol.id)}
                              disabled={!motivo.trim() || enviando}
                            >
                              {enviando ? "Enviando..." : "Confirmar rechazo"}
                            </button>
                            <button className={s.btnCancelarRechazo} onClick={cancelarRechazo}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
