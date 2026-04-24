import { useEffect, useState } from "react";
import { getSolicitudes, aprobarSolicitud, rechazarSolicitud } from "../api/solicitudesMargen";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

const ESTADO_COLORS = {
  PENDIENTE: { bg: "#fef9c3", color: "#854d0e", label: "Pendiente" },
  APROBADA: { bg: "#dcfce7", color: "#166534", label: "Aprobada" },
  RECHAZADA: { bg: "#fee2e2", color: "#991b1b", label: "Rechazada" },
  USADA: { bg: "#f3f4f6", color: "#6b7280", label: "Usada" },
};

const badge = (estado) => {
  const s = ESTADO_COLORS[estado] || ESTADO_COLORS.PENDIENTE;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.55rem",
        borderRadius: "99px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
};

export default function SolicitudesMargenPanel() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("PENDIENTE");

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
      await aprobarSolicitud(id);
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: "APROBADA" } : s))
      );
    } catch (err) {
      alert("Error aprobando solicitud");
    }
  };

  const handleRechazar = async (id) => {
    if (!confirm("¿Rechazar esta solicitud de margen?")) return;
    try {
      await rechazarSolicitud(id);
      setSolicitudes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, estado: "RECHAZADA" } : s))
      );
    } catch (err) {
      alert("Error rechazando solicitud");
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "10px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        overflow: "hidden",
        marginTop: "1.5rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #f3f4f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#111" }}>
            Solicitudes de Margen Reducido
          </h3>
          {pendientes > 0 && (
            <span
              style={{
                background: "#ef4444",
                color: "#fff",
                borderRadius: "99px",
                fontSize: "0.7rem",
                fontWeight: 700,
                padding: "0.1rem 0.5rem",
              }}
            >
              {pendientes}
            </span>
          )}
        </div>
        <button
          onClick={cargar}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            gap: "0.3rem",
            fontSize: "0.8rem",
          }}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "0.4rem", padding: "0.75rem 1.25rem", borderBottom: "1px solid #f3f4f6", flexWrap: "wrap" }}>
        {["PENDIENTE", "APROBADA", "RECHAZADA", "USADA", "TODAS"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f === "TODAS" ? "" : f)}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "6px",
              border: "1px solid",
              fontSize: "0.78rem",
              fontWeight: 500,
              cursor: "pointer",
              borderColor: (filtro === f || (f === "TODAS" && !filtro)) ? "#111" : "#d1d5db",
              background: (filtro === f || (f === "TODAS" && !filtro)) ? "#111" : "#f9fafb",
              color: (filtro === f || (f === "TODAS" && !filtro)) ? "#fff" : "#374151",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Content */}
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
              {["Vendedor", "Margen solicitado", "Comentario", "Fecha", "Estado", "Acciones"].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: "0.6rem 1rem",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    borderBottom: "1px solid #e5e7eb",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {solicitudes.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "0.7rem 1rem" }}>
                  <div style={{ fontWeight: 500 }}>{s.usuario?.nombre}</div>
                  <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{s.usuario?.email}</div>
                </td>
                <td style={{ padding: "0.7rem 1rem" }}>
                  <span
                    style={{
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: s.margenSolicitado < 20 ? "#dc2626" : "#ea580c",
                    }}
                  >
                    {s.margenSolicitado}%
                  </span>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af", marginLeft: "0.3rem" }}>
                    (mín. 30%)
                  </span>
                </td>
                <td style={{ padding: "0.7rem 1rem", maxWidth: "260px", color: "#374151" }}>
                  {s.comentario}
                </td>
                <td style={{ padding: "0.7rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                  {new Date(s.createdAt).toLocaleDateString("es-PE")}
                </td>
                <td style={{ padding: "0.7rem 1rem" }}>{badge(s.estado)}</td>
                <td style={{ padding: "0.7rem 1rem" }}>
                  {s.estado === "PENDIENTE" && (
                    <div style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        onClick={() => handleAprobar(s.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.35rem 0.75rem",
                          background: "#059669",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        <CheckCircle size={13} /> Aprobar
                      </button>
                      <button
                        onClick={() => handleRechazar(s.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          padding: "0.35rem 0.75rem",
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer",
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
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
