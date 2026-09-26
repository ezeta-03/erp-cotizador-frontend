import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2, Link2 } from "lucide-react";
import { getPartidasPresupuesto, guardarPartidasPresupuesto } from "../api/proyectos";
import { getItemsAlmacen } from "../api/almacen";
import { CATEGORIAS_PRESUPUESTO, UNIDADES_PRESUPUESTO } from "../constants/presupuesto";
import styles from "./catalogoPartidas.module.scss";

let siguienteKey = 1;
const conKey = (p) => ({ ...p, _key: siguienteKey++ });

const fmtNum = (n) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Catálogo de partidas: las filas que salen precargadas en cada presupuesto nuevo ── */
export default function CatalogoPartidasModal({ onClose }) {
  const [partidas, setPartidas] = useState([]);
  const [itemsAlmacen, setItemsAlmacen] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;
    Promise.all([getPartidasPresupuesto(), getItemsAlmacen().catch(() => [])])
      .then(([ps, items]) => {
        if (!activo) return;
        setPartidas(ps.map(conKey));
        setItemsAlmacen(Array.isArray(items) ? items : []);
      })
      .catch((err) => activo && setError(err.response?.data?.message ?? "No se pudo cargar el catálogo"))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, []);

  const itemPorId = useMemo(() => new Map(itemsAlmacen.map((i) => [i.id, i])), [itemsAlmacen]);

  // Agrupados por categoría para el <select> de enlace a Almacén.
  const itemsPorCategoria = useMemo(() => {
    const grupos = new Map();
    for (const i of itemsAlmacen) {
      if (!grupos.has(i.categoria)) grupos.set(i.categoria, []);
      grupos.get(i.categoria).push(i);
    }
    return [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [itemsAlmacen]);

  const setCampo = (key, campo, valor) =>
    setPartidas((lista) => lista.map((p) => (p._key === key ? { ...p, [campo]: valor } : p)));

  const agregar = (categoria) =>
    setPartidas((lista) => {
      const ultimo = lista.map((p) => p.categoria).lastIndexOf(categoria);
      const copia = [...lista];
      copia.splice(ultimo + 1, 0, conKey({ categoria, nombre: "", unidad: "unid.", precioUnitario: 0, itemAlmacenId: null, activo: true }));
      return copia;
    });

  const quitar = (key) => setPartidas((lista) => lista.filter((p) => p._key !== key));

  const handleGuardar = async () => {
    setError("");
    if (partidas.some((p) => !String(p.nombre).trim())) {
      setError("Hay partidas sin nombre — complétalas o quítalas.");
      return;
    }
    setGuardando(true);
    try {
      // Se manda en el orden de las secciones para que "orden" quede agrupado.
      const ordenadas = CATEGORIAS_PRESUPUESTO.flatMap((c) => partidas.filter((p) => p.categoria === c.codigo));
      await guardarPartidasPresupuesto(
        ordenadas.map(({ id, categoria, nombre, unidad, precioUnitario, itemAlmacenId, activo }) => ({
          id, categoria, nombre, unidad, precioUnitario: Number(precioUnitario || 0), itemAlmacenId: itemAlmacenId || null, activo,
        }))
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar el catálogo");
      setGuardando(false);
    }
  };

  return (
    <div className={styles.wizardOverlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.wizardCard} style={{ maxWidth: 1040 }}>
        <div className={styles.wizardHeader}>
          <div>
            <h3>Catálogo de partidas del presupuesto</h3>
            <p className={styles.wizardSubtitle}>
              Filas y precios que aparecen precargados al abrir el presupuesto de un proyecto. Los presupuestos ya guardados no cambian.
            </p>
          </div>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.body}>
          {error && <p className={styles.formError}>{error}</p>}
          {cargando ? (
            <p className={styles.empty}>Cargando catálogo…</p>
          ) : (
            <table className={styles.tabla}>
              <thead>
                <tr>
                  <th>Partida</th>
                  <th style={{ width: 100 }}>Unidad</th>
                  <th style={{ width: 120 }}>Precio unit.</th>
                  <th style={{ width: 300 }}>Enlace a Almacén (usa su costo)</th>
                  <th style={{ width: 60 }} title="Si está apagada, no sale en presupuestos nuevos">Activa</th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {CATEGORIAS_PRESUPUESTO.map((cat) => (
                  <Seccion
                    key={cat.codigo}
                    titulo={cat.titulo}
                    filas={partidas.filter((p) => p.categoria === cat.codigo)}
                    itemPorId={itemPorId}
                    itemsPorCategoria={itemsPorCategoria}
                    onCampo={setCampo}
                    onQuitar={quitar}
                    onAgregar={() => agregar(cat.codigo)}
                  />
                ))}
              </tbody>
            </table>
          )}
          <datalist id="unidades-catalogo">
            {UNIDADES_PRESUPUESTO.map((u) => <option key={u} value={u} />)}
          </datalist>
        </div>

        <div className={styles.wizardActions}>
          <button className={styles.btnOutline} onClick={onClose}>Cancelar</button>
          <button className={styles.btnPrimary} onClick={handleGuardar} disabled={cargando || guardando}>
            {guardando ? "Guardando…" : "Guardar catálogo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Seccion({ titulo, filas, itemPorId, itemsPorCategoria, onCampo, onQuitar, onAgregar }) {
  return (
    <>
      <tr className={styles.filaCategoria}>
        <td colSpan={6}>{titulo}</td>
      </tr>
      {filas.map((p) => {
        const enlazado = p.itemAlmacenId ? itemPorId.get(Number(p.itemAlmacenId)) : null;
        return (
          <tr key={p._key} className={p.activo ? undefined : styles.inactiva}>
            <td><input value={p.nombre} onChange={(e) => onCampo(p._key, "nombre", e.target.value)} placeholder="Nombre de la partida" /></td>
            <td><input value={p.unidad} list="unidades-catalogo" onChange={(e) => onCampo(p._key, "unidad", e.target.value)} /></td>
            <td>
              {p.itemAlmacenId ? (
                <span className={styles.precioEnlazado} title="Sale del costo unitario del ítem de Almacén">
                  <Link2 size={13} /> S/ {fmtNum(enlazado?.costoUnitario ?? p.precioEfectivo)}
                </span>
              ) : (
                <input type="number" min="0" step="0.01" value={p.precioUnitario} onChange={(e) => onCampo(p._key, "precioUnitario", e.target.value)} />
              )}
            </td>
            <td>
              <select
                value={p.itemAlmacenId ?? ""}
                onChange={(e) => onCampo(p._key, "itemAlmacenId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Sin enlace (precio manual)</option>
                {itemsPorCategoria.map(([categoria, items]) => (
                  <optgroup key={categoria} label={categoria}>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.codigo} · {i.nombre} — S/ {fmtNum(i.costoUnitario)} / {i.unidad}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </td>
            <td className={styles.centro}>
              <input type="checkbox" checked={p.activo} onChange={(e) => onCampo(p._key, "activo", e.target.checked)} />
            </td>
            <td>
              <button className={styles.btnDelete} onClick={() => onQuitar(p._key)} title="Eliminar partida"><Trash2 size={15} /></button>
            </td>
          </tr>
        );
      })}
      <tr>
        <td colSpan={6} className={styles.celdaAgregar}>
          <button className={styles.btnGhost} onClick={onAgregar}><Plus size={14} /> Agregar partida en {titulo.toLowerCase()}</button>
        </td>
      </tr>
    </>
  );
}
