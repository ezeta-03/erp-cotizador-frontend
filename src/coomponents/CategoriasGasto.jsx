import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { Badge, Button } from "../components/ui";
import { actualizarCategoriaGasto, crearCategoriaGasto, getCategoriasGasto } from "../api/cuentas";
import { GRUPO_GASTO_LABEL } from "../constants/cuentas";
import Spinner from "./Spinner";
import styles from "../pages/cuentas.module.scss";

const TONO_GRUPO = { COSTO_VENTA: "purple", GASTO_OPERATIVO: "blue" };
const celda = { padding: "0.55rem 0.75rem", borderBottom: "1px solid var(--color-border)", fontSize: "var(--text-sm)", verticalAlign: "middle" };

// Catálogo editable de categorías de gasto (pestaña de Cuentas por pagar).
// Las categorías no se borran: se desactivan, para no perder la clasificación
// de los documentos ya registrados. onCambio: para refrescar los selectores.
export default function CategoriasGasto({ showToast, onCambio }) {
  const [arbol, setArbol] = useState(null);
  const [nueva, setNueva] = useState({ nombre: "", grupo: "GASTO_OPERATIVO" });
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    getCategoriasGasto(true).then(setArbol).catch(() => setArbol([]));
  }, []);

  const ejecutar = async (accion, exito) => {
    setOcupado(true);
    try {
      setArbol(await accion());
      if (exito) showToast(exito, "success");
      onCambio?.();
      return true;
    } catch (err) {
      showToast(err.response?.data?.message || "No se pudo guardar la categoría");
      return false;
    } finally {
      setOcupado(false);
    }
  };

  const crearPrincipal = async () => {
    if (await ejecutar(() => crearCategoriaGasto(nueva), `Categoría ${nueva.nombre} creada`)) setNueva({ ...nueva, nombre: "" });
  };
  const crearSub = (padre) => {
    const nombre = prompt(`Nueva subcategoría de ${padre.nombre}:`);
    if (nombre?.trim()) ejecutar(() => crearCategoriaGasto({ nombre: nombre.trim(), padreId: padre.id }), `Subcategoría ${nombre.trim()} creada`);
  };
  const renombrar = (c) => {
    const nombre = prompt("Nuevo nombre:", c.nombre);
    if (nombre?.trim() && nombre.trim() !== c.nombre) ejecutar(() => actualizarCategoriaGasto(c.id, { nombre: nombre.trim() }), "Categoría renombrada");
  };
  const alternar = (c) => ejecutar(() => actualizarCategoriaGasto(c.id, { activo: !c.activo }), c.activo ? `${c.nombre} desactivada` : `${c.nombre} activada`);
  const cambiarGrupo = (c, grupo) => ejecutar(() => actualizarCategoriaGasto(c.id, { grupo }), `${c.nombre}: ${GRUPO_GASTO_LABEL[grupo]}`);

  if (!arbol) return <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={16} /> Cargando categorías...</div>;

  const fila = (c, padre) => (
    <tr key={c.id} style={{ opacity: c.activo ? 1 : 0.55 }}>
      <td style={{ ...celda, paddingLeft: padre ? "2rem" : celda.padding.split(" ")[1] }}>
        {padre ? <span className={styles.sub}>{padre.nombre} › </span> : null}
        <strong style={{ fontWeight: padre ? 500 : 600 }}>{c.nombre}</strong>
        {!c.activo && <> <Badge tone="gray">Inactiva</Badge></>}
      </td>
      <td style={celda}>
        {padre ? <span className={styles.sub}>{GRUPO_GASTO_LABEL[c.grupo]}</span> : (
          <select className={styles.buscar} style={{ margin: 0, minWidth: 0 }} value={c.grupo} disabled={ocupado}
            aria-label={`Grupo de ${c.nombre}`} onChange={(e) => cambiarGrupo(c, e.target.value)}>
            {Object.entries(GRUPO_GASTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        )}
      </td>
      <td style={{ ...celda, textAlign: "right" }}>{c.documentos || <span className={styles.sub}>—</span>}</td>
      <td style={celda}>
        <div className={styles.filaAcciones}>
          {!padre && c.activo && <Button size="sm" variant="ghost" icon={Plus} disabled={ocupado} onClick={() => crearSub(c)}>Subcategoría</Button>}
          <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Renombrar ${c.nombre}`} disabled={ocupado} onClick={() => renombrar(c)} />
          <Button size="sm" variant="ghost" icon={c.activo ? EyeOff : Eye} disabled={ocupado} onClick={() => alternar(c)}>
            {c.activo ? "Desactivar" : "Activar"}
          </Button>
        </div>
      </td>
    </tr>
  );

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
        <input className={styles.buscar} style={{ marginLeft: 0, flex: "1 1 220px" }} placeholder="Nueva categoría principal…"
          value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && nueva.nombre.trim() && crearPrincipal()} />
        <select className={styles.buscar} style={{ marginLeft: 0, minWidth: 0 }} value={nueva.grupo} aria-label="Grupo de la nueva categoría"
          onChange={(e) => setNueva({ ...nueva, grupo: e.target.value })}>
          {Object.entries(GRUPO_GASTO_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button icon={Plus} disabled={!nueva.nombre.trim() || ocupado} onClick={crearPrincipal}>Agregar</Button>
      </div>

      {Object.entries(GRUPO_GASTO_LABEL).map(([grupo, etiqueta]) => {
        const principales = arbol.filter((c) => c.grupo === grupo);
        return (
          <div key={grupo} style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflowX: "auto", background: "var(--color-surface)" }}>
            <div style={{ padding: "0.6rem 0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Badge tone={TONO_GRUPO[grupo]}>{etiqueta}</Badge>
              <span className={styles.sub}>{principales.length} categoría{principales.length !== 1 ? "s" : ""}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
              <thead>
                <tr>
                  {["Categoría", "Grupo", "Docs.", ""].map((h, i) => (
                    <th key={i} style={{ ...celda, textAlign: i === 2 ? "right" : "left", fontSize: "var(--text-xs)", color: "var(--color-text3)", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {principales.length === 0 && <tr><td colSpan={4} style={{ ...celda, color: "var(--color-text3)" }}>Sin categorías</td></tr>}
                {principales.flatMap((c) => [fila(c), ...c.hijos.map((h) => fila(h, c))])}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
