import { useEffect, useState } from "react";
import FiltrosClientes from "./FiltrosClientes";
import { getActividadClientes } from "../api/clientes";
import useAuth from "../auth/useAuth";

const nombreProducto = (p) => p?.nombre || p?.material || "(producto)";

const ESTADO_COLORS = {
  PENDIENTE: { bg: "#fef9c3", color: "#854d0e" },
  APROBADA: { bg: "#dcfce7", color: "#166534" },
  FACTURADA: { bg: "#dbeafe", color: "#1e40af" },
};

const badge = (estado) => {
  const s = ESTADO_COLORS[estado] || { bg: "#f3f4f6", color: "#374151" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.15rem 0.5rem",
        borderRadius: "99px",
        fontSize: "0.75rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
      }}
    >
      {estado}
    </span>
  );
};

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

export default function ActividadClientes() {
  const { user } = useAuth();
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading] = useState(true);

  const buscarActividad = async (filtros) => {
    setLoading(true);
    try {
      const data = await getActividadClientes(filtros);
      setActividad(data);
    } catch (error) {
      console.error("❌ Error cargando actividad de clientes:", error);
      setActividad([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) buscarActividad({});
  }, [user]);

  if (!user) return <p>Cargando usuario...</p>;

  return (
    <div style={{ padding: "1.5rem" }}>
      <h2 style={{ marginBottom: "1rem", fontWeight: 700 }}>Actividad de Clientes</h2>
      <FiltrosClientes onBuscar={buscarActividad} />

      {loading ? (
        <p style={{ color: "#6b7280", marginTop: "1rem" }}>Cargando...</p>
      ) : actividad.length === 0 ? (
        <p style={{ color: "#9ca3af", marginTop: "1.5rem", textAlign: "center" }}>
          No hay cotizaciones registradas.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem", fontSize: "0.875rem" }}>
          <thead>
            <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
              <th style={thStyle}>Cliente</th>
              <th style={thStyle}>N° Cotización</th>
              <th style={thStyle}>Productos</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Total</th>
              <th style={thStyle}>Estado</th>
              {user?.role === "ADMIN" && <th style={thStyle}>Vendedor</th>}
            </tr>
          </thead>
          <tbody>
            {actividad.map((c) => (
              <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>{c.cliente?.nombreComercial}</td>
                <td style={tdStyle}>{c.numero}</td>
                <td style={tdStyle}>
                  {c.items?.map((i) => nombreProducto(i.producto)).join(", ") || "—"}
                </td>
                <td style={tdStyle}>{new Date(c.createdAt).toLocaleDateString("es-PE")}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{fmt(c.total)}</td>
                <td style={tdStyle}>{badge(c.estado)}</td>
                {user?.role === "ADMIN" && <td style={tdStyle}>{c.usuario?.nombre}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const thStyle = {
  padding: "0.6rem 0.75rem",
  textAlign: "left",
  fontWeight: 600,
  fontSize: "0.75rem",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: "#6b7280",
};

const tdStyle = {
  padding: "0.65rem 0.75rem",
  color: "#374151",
  verticalAlign: "middle",
};
