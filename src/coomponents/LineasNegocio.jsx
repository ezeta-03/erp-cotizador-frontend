import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { Badge, Button } from "../components/ui";
import { getLineasNegocio, guardarLineaNegocio } from "../api/cuentas";
import Spinner from "./Spinner";
import styles from "../pages/cuentas.module.scss";

const celda = { padding: "0.55rem 0.75rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", verticalAlign: "middle" };

// Catálogo editable de líneas de negocio (pestaña de Cuentas por pagar). Cada
// proveedor reparte sus gastos entre ellas con porcentajes (en su ficha). No se
// borran: se desactivan, para no perder el reparto ya registrado.
export default function LineasNegocio({ showToast }) {
  const [lineas, setLineas] = useState(null);
  const [nombre, setNombre] = useState("");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    getLineasNegocio().then(setLineas).catch(() => setLineas([]));
  }, []);

  const ejecutar = async (accion, exito) => {
    setOcupado(true);
    try {
      setLineas(await accion());
      showToast(exito, "success");
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo guardar la línea de negocio");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const crear = async () => {
    const n = nombre.trim();
    if (await ejecutar(() => guardarLineaNegocio(null, { nombre: n }), `Línea ${n} creada`)) setNombre("");
  };
  const renombrar = (l) => {
    const n = prompt("Nuevo nombre:", l.nombre);
    if (n?.trim() && n.trim() !== l.nombre) ejecutar(() => guardarLineaNegocio(l.id, { nombre: n.trim() }), "Línea renombrada");
  };
  const alternar = (l) => ejecutar(() => guardarLineaNegocio(l.id, { activo: !l.activo }), l.activo ? `${l.nombre} desactivada` : `${l.nombre} activada`);

  if (!lineas) return <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={16} /> Cargando líneas de negocio...</div>;

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <p className={styles.sub} style={{ margin: 0 }}>
        Los gastos de cada proveedor se reparten entre estas líneas según los porcentajes de su ficha (pestaña Proveedores).
        Se ven en el Flujo de Efectivo y en el Libro Mayor.
      </p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className={styles.buscar} style={{ marginLeft: 0, flex: "1 1 220px" }} placeholder="Nueva línea de negocio (p. ej. Outdoor)…"
          value={nombre} onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && nombre.trim() && !ocupado && crear()} />
        <Button icon={Plus} disabled={!nombre.trim() || ocupado} onClick={crear}>Agregar</Button>
      </div>
      <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr>
              {["Línea de negocio", "Proveedores", ""].map((h, i) => (
                <th key={i} style={{ ...celda, textAlign: i === 1 ? "right" : "left", fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lineas.length === 0 && <tr><td colSpan={3} style={{ ...celda, color: "var(--color-text3)" }}>Aún no hay líneas de negocio</td></tr>}
            {lineas.map((l) => (
              <tr key={l.id} style={{ opacity: l.activo ? 1 : 0.55 }}>
                <td style={celda}><strong style={{ fontWeight: 600 }}>{l.nombre}</strong>{!l.activo && <> <Badge tone="gray">Inactiva</Badge></>}</td>
                <td style={{ ...celda, textAlign: "right" }}>{l._count?.proveedores || <span className={styles.sub}>—</span>}</td>
                <td style={celda}>
                  <div className={styles.filaAcciones}>
                    <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Renombrar ${l.nombre}`} disabled={ocupado} onClick={() => renombrar(l)} />
                    <Button size="sm" variant="ghost" icon={l.activo ? EyeOff : Eye} disabled={ocupado} onClick={() => alternar(l)}>
                      {l.activo ? "Desactivar" : "Activar"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
