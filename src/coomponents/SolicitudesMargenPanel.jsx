import { useEffect, useState } from "react";
import { getSolicitudes, aprobarSolicitud, rechazarSolicitud } from "../api/solicitudesMargen";
import { CheckCircle, XCircle, RefreshCw } from "lucide-react";

const ESTADO_COLORS = {
  PENDIENTE:  { bg: "#fef9c3", color: "#854d0e",  label: "Pendiente"  },
  APROBADA:   { bg: "#dcfce7", color: "#166534",  label: "Aprobada"   },
  RECHAZADA:  { bg: "#fee2e2", color: "#991b1b",  label: "Rechazada"  },
  USADA:      { bg: "#f3f4f6", color: "#6b7280",  label: "Usada"      },
};

const fmtFecha = (d) =>
  d ? new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const badge = (estado) => {
  const s = ESTADO_COLORS[estado] || ESTADO_COLORS.PENDIENTE;
  return (
    <span style={{
      display: "inline-block", padding: "0.15rem 0.55rem", borderRadius: "99px",
      fontSize: "0.72rem", fontWeight: 600, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
};

export default function SolicitudesMargenPanel() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtro, setFiltro]           = useState("PENDIENTE");

  // Rechazo inline: id de la solicitud con formulario abierto + texto del motivo
  const [rechazando, setRechazando]   = useState(null);
  const [motivo, setMotivo]           = useState("");
  const [enviando, setEnviando]       = useState(false);

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
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? updated : s)));
    } catch {
      alert("Error aprobando solicitud");
    }
  };

  const handleRechazar = async (id) => {
    if (!motivo.trim()) return;
    setEnviando(true);
    try {
      const updated = await rechazarSolicitud(id, motivo.trim());
      setSolicitudes((prev) => prev.map((s) => (s.id === id ? updated : s)));
      setRechazando(null);
      setMotivo("");
    } catch (err) {
      alert(err?.response?.data?.message || "Error rechazando solicitud");
    } finally {
      setEnviando(false);
    }
  };

  const cancelarRechazo = () => { setRechazando(null); setMotivo(""); };

  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  const th = (label, width) => (
    <th key={label} style={{
      padding: "0.6rem 1rem", textAlign: "left", fontWeight: 600,
      fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase",
      letterSpacing: "0.04em", borderBottom: "1px solid #e5e7eb",
      ...(width ? { width } : {}),
    }}>
      {label}
    </th>
  );

  return (
    <div style={{
      background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb",
      boxShadow: "0 1px 4px rgba(0,0,0,.06)", overflow: "hidden", marginTop: "1.5rem",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "1rem 1.25rem", borderBottom: "1px solid #f3f4f6",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#111" }}>
            Solicitudes de Margen Reducido
          </h3>
          {pendientes > 0 && (
            <span style={{
              background: "#ef4444", color: "#fff", borderRadius: "99px",
              fontSize: "0.7rem", fontWeight: 700, padding: "0.1rem 0.5rem",
            }}>
              {pendientes}
            </span>
          )}
        </div>
        <button
          onClick={cargar}
          style={{
            background: "none", border: "none", cursor: "pointer", color: "#6b7280",
            display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem",
          }}
        >
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{
        display: "flex", gap: "0.4rem", padding: "0.75rem 1.25rem",
        borderBottom: "1px solid #f3f4f6", flexWrap: "wrap",
      }}>
        {["PENDIENTE", "APROBADA", "RECHAZADA", "USADA", "TODAS"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f === "TODAS" ? "" : f)}
            style={{
              padding: "0.3rem 0.75rem", borderRadius: "6px", border: "1px solid",
              fontSize: "0.78rem", fontWeight: 500, cursor: "pointer",
              borderColor: (filtro === f || (f === "TODAS" && !filtro)) ? "#111" : "#d1d5db",
              background:  (filtro === f || (f === "TODAS" && !filtro)) ? "#111" : "#f9fafb",
              color:       (filtro === f || (f === "TODAS" && !filtro)) ? "#fff" : "#374151",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {loading ? (
        <p style={{ color: "#9ca3af", padding: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          Cargando...
        </p>
      ) : solicitudes.length === 0 ? (
        <p style={{ color: "#9ca3af", padding: "1.5rem", textAlign: "center", fontSize: "0.875rem" }}>
          No hay solicitudes {filtro && `con estado "${filtro}"`}.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {th("Vendedor")}
              {th("Margen", "120px")}
              {th("Comentario")}
              {th("Solicitado", "110px")}
              {th("Estado", "100px")}
              {th("Resuelto por", "160px")}
              {th("Acciones", "200px")}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <>
                <tr key={s.id} style={{ borderBottom: rechazando === s.id ? "none" : "1px solid #f3f4f6" }}>
                  {/* Vendedor */}
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <div style={{ fontWeight: 500 }}>{s.usuario?.nombre}</div>
                    <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{s.usuario?.email}</div>
                  </td>

                  {/* Margen */}
                  <td style={{ padding: "0.7rem 1rem" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem", color: s.margenSolicitado < 20 ? "#dc2626" : "#ea580c" }}>
                      {s.margenSolicitado}%
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.3rem" }}>(mín. 30%)</span>
                  </td>

                  {/* Comentario */}
                  <td style={{ padding: "0.7rem 1rem", maxWidth: "220px", color: "#374151" }}>
                    {s.comentario}
                  </td>

                  {/* Fecha solicitud */}
                  <td style={{ padding: "0.7rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {fmtFecha(s.createdAt)}
                  </td>

                  {/* Estado */}
                  <td style={{ padding: "0.7rem 1rem" }}>{badge(s.estado)}</td>

                  {/* Resuelto por */}
                  <td style={{ padding: "0.7rem 1rem" }}>
                    {s.aprobadaPor ? (
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 500, color: "#374151" }}>
                          {s.aprobadaPor.nombre}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          {fmtFecha(s.resolvedAt)}
                        </div>
                        {s.motivoRechazo && (
                          <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.2rem" }}>
                            "{s.motivoRechazo}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: "#d1d5db", fontSize: "0.8rem" }}>—</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: "0.7rem 1rem" }}>
                    {s.estado === "PENDIENTE" && (
                      <div style={{ display: "flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => handleAprobar(s.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.25rem",
                            padding: "0.35rem 0.75rem", background: "#059669", color: "#fff",
                            border: "none", borderRadius: "6px", fontSize: "0.78rem",
                            fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          <CheckCircle size={13} /> Aprobar
                        </button>
                        <button
                          onClick={() => { setRechazando(s.id); setMotivo(""); }}
                          style={{
                            display: "flex", alignItems: "center", gap: "0.25rem",
                            padding: "0.35rem 0.75rem", background: "#ef4444", color: "#fff",
                            border: "none", borderRadius: "6px", fontSize: "0.78rem",
                            fontWeight: 600, cursor: "pointer",
                          }}
                        >
                          <XCircle size={13} /> Rechazar
                        </button>
                      </div>
                    )}
                    {s.estado === "APROBADA" && (
                      <span style={{ color: "#059669", fontSize: "0.8rem" }}>✓ Aprobada</span>
                    )}
                    {s.estado === "RECHAZADA" && (
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Rechazada</span>
                    )}
                    {s.estado === "USADA" && (
                      <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>Cotización generada</span>
                    )}
                  </td>
                </tr>

                {/* Fila inline de motivo de rechazo */}
                {rechazando === s.id && (
                  <tr key={`rechazo-${s.id}`} style={{ borderBottom: "1px solid #f3f4f6", background: "#fef2f2" }}>
                    <td colSpan={7} style={{ padding: "0.75rem 1rem" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#991b1b", marginBottom: "0.35rem" }}>
                            Motivo del rechazo (requerido)
                          </label>
                          <textarea
                            value={motivo}
                            onChange={(e) => setMotivo(e.target.value)}
                            placeholder="Explica por qué se rechaza esta solicitud..."
                            rows={2}
                            autoFocus
                            style={{
                              width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px",
                              border: "1px solid #fca5a5", fontSize: "0.85rem", resize: "vertical",
                              outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                            }}
                          />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", paddingTop: "1.4rem" }}>
                          <button
                            onClick={() => handleRechazar(s.id)}
                            disabled={!motivo.trim() || enviando}
                            style={{
                              padding: "0.4rem 1rem", background: motivo.trim() ? "#ef4444" : "#fca5a5",
                              color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.8rem",
                              fontWeight: 600, cursor: motivo.trim() ? "pointer" : "not-allowed", whiteSpace: "nowrap",
                            }}
                          >
                            {enviando ? "Enviando..." : "Confirmar rechazo"}
                          </button>
                          <button
                            onClick={cancelarRechazo}
                            style={{
                              padding: "0.4rem 1rem", background: "#f3f4f6", color: "#374151",
                              border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.8rem",
                              fontWeight: 500, cursor: "pointer",
                            }}
                          >
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
      )}
    </div>
  );
}
