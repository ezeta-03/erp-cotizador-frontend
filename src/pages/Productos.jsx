import { useEffect, useRef, useState } from "react";
import useAuth from "../auth/useAuth";
import {
  getProductos,
  deleteProducto,
  previewProductosCSV,
  importarProductosCSV,
  eliminarTodosProductos,
} from "../api/productos";
import ConfiguracionForm from "../coomponents/ConfiguracionForm";
import styles from "./productos.module.scss";
import {
  Upload,
  Download,
  Search,
  RefreshCw,
  Trash2,
  Trash,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  X,
} from "lucide-react";

const PLANTILLA_CSV = `Producto;Precio de Produccion\nBANNER DELGADO 10 ONZAS;S/ 9.00\nBANNER GRUESO 12 ONZAS;S/ 13.50`;

// ── Pasos del wizard de importación ──────────────────────────────────────────
const PASO = { NINGUNO: 0, CARGANDO_PREVIEW: 1, PREVIEW: 2, IMPORTANDO: 3, RESULTADO: 4 };

export default function Productos() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmEliminarTodos, setConfirmEliminarTodos] = useState(false);

  // Wizard de importación
  const [paso, setPaso] = useState(PASO.NINGUNO);
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [previewData, setPreviewData] = useState(null);   // { preview[], stats, omitidos[], erroresDetalle[] }
  const [resultado, setResultado] = useState(null);        // { creados, actualizados, omitidos, total }
  const [busquedaPreview, setBusquedaPreview] = useState("");

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const data = await getProductos();
      setProductos(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarProductos(); }, []);

  const productosFiltrados = productos.filter((p) =>
    (p.nombre || p.servicio || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── Descarga de plantilla ─────────────────────────────────────────────────
  const descargarPlantilla = () => {
    const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── PASO 1: usuario selecciona archivo → preview ──────────────────────────
  const onFileChange = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = "";
    setArchivoCSV(archivo);
    setPaso(PASO.CARGANDO_PREVIEW);
    setPreviewData(null);
    setBusquedaPreview("");
    try {
      const data = await previewProductosCSV(archivo);
      setPreviewData(data);
      setPaso(PASO.PREVIEW);
    } catch (err) {
      alert("Error al analizar el archivo: " + (err.response?.data?.message || err.message));
      setPaso(PASO.NINGUNO);
    }
  };

  // ── PASO 2: usuario confirma → importar ──────────────────────────────────
  const ejecutarImport = async () => {
    if (!archivoCSV) return;
    setPaso(PASO.IMPORTANDO);
    try {
      const res = await importarProductosCSV(archivoCSV);
      setResultado(res);
      setPaso(PASO.RESULTADO);
      await cargarProductos();
    } catch (err) {
      setResultado({
        message: "Error al importar",
        creados: 0, actualizados: 0, omitidos: 0, total: 0,
        errores: [{ error: err.response?.data?.message || err.message }],
      });
      setPaso(PASO.RESULTADO);
    }
  };

  const cancelarWizard = () => {
    setPaso(PASO.NINGUNO);
    setArchivoCSV(null);
    setPreviewData(null);
    setResultado(null);
  };

  // ── Eliminar todos ────────────────────────────────────────────────────────
  const handleEliminarTodos = async () => {
    setConfirmEliminarTodos(false);
    try {
      await eliminarTodosProductos();
      await cargarProductos();
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || err.message));
    }
  };

  // ── Eliminar uno ──────────────────────────────────────────────────────────
  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar "${nombre}"?`)) return;
    try {
      await deleteProducto(id);
      await cargarProductos();
    } catch {
      alert("No se pudo desactivar el producto.");
    }
  };

  const fmt = (v) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <div className={styles.container}>

      {/* ── WIZARD DE IMPORTACIÓN (overlay cuando está activo) ── */}
      {paso !== PASO.NINGUNO && (
        <div className={styles.wizardOverlay}>
          <div className={styles.wizardCard}>

            {/* Cargando preview */}
            {paso === PASO.CARGANDO_PREVIEW && (
              <div className={styles.wizardCenter}>
                <RefreshCw size={36} className={styles.spin} />
                <p>Analizando archivo <strong>{archivoCSV?.name}</strong>…</p>
              </div>
            )}

            {/* Importando */}
            {paso === PASO.IMPORTANDO && (
              <div className={styles.wizardCenter}>
                <RefreshCw size={36} className={styles.spin} />
                <p>Importando productos en la base de datos…</p>
                <p className={styles.wizardHint}>Esto puede tardar unos segundos.</p>
              </div>
            )}

            {/* Preview */}
            {paso === PASO.PREVIEW && previewData && (
              <>
                <div className={styles.wizardHeader}>
                  <div>
                    <h3 className={styles.wizardTitle}>Vista previa — {archivoCSV?.name}</h3>
                    <p className={styles.wizardSubtitle}>
                      Revisa los productos antes de importar. Los actuales serán reemplazados.
                    </p>
                  </div>
                  <button className={styles.btnIcon} onClick={cancelarWizard} title="Cancelar">
                    <X size={20} />
                  </button>
                </div>

                {/* Stats */}
                <div className={styles.previewStats}>
                  <div className={`${styles.statChip} ${styles.statChipGreen}`}>
                    <strong>{previewData.stats.nuevos}</strong> nuevos
                  </div>
                  <div className={`${styles.statChip} ${styles.statChipBlue}`}>
                    <strong>{previewData.stats.actualizar}</strong> actualizar
                  </div>
                  <div className={`${styles.statChip} ${styles.statChipGray}`}>
                    <strong>{previewData.stats.omitidos}</strong> omitidos
                  </div>
                  {previewData.stats.errores > 0 && (
                    <div className={`${styles.statChip} ${styles.statChipRed}`}>
                      <strong>{previewData.stats.errores}</strong> errores
                    </div>
                  )}
                  <span className={styles.statTotal}>
                    Total a importar: <strong>{previewData.stats.validos}</strong> de {previewData.stats.total} filas
                  </span>
                </div>

                {/* Buscador en preview */}
                <div className={styles.searchBar} style={{ marginBottom: "0.75rem" }}>
                  <Search size={14} className={styles.searchIcon} />
                  <input
                    className={styles.searchInput}
                    placeholder="Buscar en la vista previa…"
                    value={busquedaPreview}
                    onChange={(e) => setBusquedaPreview(e.target.value)}
                  />
                  {busquedaPreview && (
                    <button className={styles.btnClear} onClick={() => setBusquedaPreview("")}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Tabla de preview */}
                <div className={styles.previewTableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Nombre del producto</th>
                        <th>Precio producción</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview
                        .filter((p) =>
                          !busquedaPreview ||
                          p.nombre.toLowerCase().includes(busquedaPreview.toLowerCase())
                        )
                        .map((p, i) => (
                          <tr key={i}>
                            <td className={styles.tdIdx}>{p.fila}</td>
                            <td className={styles.tdNombre}>{p.nombre}</td>
                            <td className={styles.tdPrecio}>{fmt(p.precio)}</td>
                            <td>
                              <span
                                className={
                                  p.accion === "crear"
                                    ? styles.badgeNuevo
                                    : styles.badgeActualizar
                                }
                              >
                                {p.accion === "crear" ? "Nuevo" : "Actualizar"}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Omitidos */}
                {previewData.omitidos?.length > 0 && (
                  <details className={styles.erroresDetail}>
                    <summary>{previewData.omitidos.length} fila(s) omitida(s) (sin precio)</summary>
                    <ul>
                      {previewData.omitidos.map((o, i) => (
                        <li key={i}>Fila {o.fila}: "{o.nombre || "(vacío)"}" — {o.motivo}</li>
                      ))}
                    </ul>
                  </details>
                )}

                {/* Acciones */}
                <div className={styles.wizardActions}>
                  <button className={styles.btnGhost} onClick={cancelarWizard}>
                    <X size={16} /> Cancelar
                  </button>
                  <button
                    className={styles.btnPrimary}
                    onClick={ejecutarImport}
                    disabled={previewData.stats.validos === 0}
                  >
                    Importar {previewData.stats.validos} productos
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}

            {/* Resultado */}
            {paso === PASO.RESULTADO && resultado && (
              <>
                <div className={styles.wizardHeader}>
                  <h3 className={styles.wizardTitle}>
                    {resultado.errores?.length
                      ? "Importación con advertencias"
                      : "Importación completada"}
                  </h3>
                </div>

                <div className={styles.previewStats}>
                  <div className={`${styles.statChip} ${styles.statChipGreen}`}>
                    <CheckCircle size={14} /> <strong>{resultado.creados}</strong> creados
                  </div>
                  <div className={`${styles.statChip} ${styles.statChipBlue}`}>
                    <RefreshCw size={14} /> <strong>{resultado.actualizados}</strong> actualizados
                  </div>
                  <div className={`${styles.statChip} ${styles.statChipGray}`}>
                    <XCircle size={14} /> <strong>{resultado.omitidos}</strong> omitidos
                  </div>
                </div>

                {resultado.errores?.length > 0 && (
                  <details className={`${styles.erroresDetail} ${styles.erroresDetailWarn}`} open>
                    <summary>{resultado.errores.length} error(es)</summary>
                    <ul>
                      {resultado.errores.map((e, i) => (
                        <li key={i}>{e.nombre ? `"${e.nombre}" — ` : ""}{e.error}</li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className={styles.wizardActions}>
                  <button className={styles.btnPrimary} onClick={cancelarWizard}>
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Encabezado ── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Productos</h2>
          <p className={styles.subtitle}>
            {productos.length} producto{productos.length !== 1 ? "s" : ""} activo{productos.length !== 1 ? "s" : ""}
          </p>
        </div>

        {user.role === "ADMIN" && (
          <div className={styles.headerActions}>
            <button className={styles.btnOutline} onClick={descargarPlantilla}>
              <Download size={16} />
              Plantilla CSV
            </button>
            <button
              className={styles.btnDanger}
              onClick={() => setConfirmEliminarTodos(true)}
              disabled={productos.length === 0}
            >
              <Trash size={16} />
              Eliminar todos
            </button>
            <button
              className={styles.btnPrimary}
              onClick={() => fileInputRef.current?.click()}
              disabled={paso !== PASO.NINGUNO}
            >
              <Upload size={16} />
              Importar CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={onFileChange}
            />
          </div>
        )}
      </div>

      {/* ── Confirmación eliminar todos ── */}
      {confirmEliminarTodos && (
        <div className={styles.confirmBanner} style={{ borderColor: "#fca5a5", background: "#fff1f2", color: "#991b1b" }}>
          <AlertTriangle size={20} />
          <div>
            <strong>¿Eliminar todos los productos?</strong>
            <p>Se desactivarán los <strong>{productos.length} productos</strong> activos.</p>
          </div>
          <div className={styles.confirmActions}>
            <button className={styles.btnDanger} onClick={handleEliminarTodos}>Sí, eliminar todos</button>
            <button className={styles.btnGhost} onClick={() => setConfirmEliminarTodos(false)}>
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Configuración (solo ADMIN) ── */}
      {user.role === "ADMIN" && (
        <ConfiguracionForm onRecalcular={cargarProductos} />
      )}

      {/* ── Buscador ── */}
      <div className={styles.searchBar}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className={styles.searchInput}
        />
        {busqueda && (
          <button className={styles.btnClear} onClick={() => setBusqueda("")}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Tabla de productos ── */}
      {loading ? (
        <div className={styles.loadingRow}>
          <RefreshCw size={20} className={styles.spin} /> Cargando productos...
        </div>
      ) : productosFiltrados.length === 0 ? (
        <div className={styles.emptyState}>
          {busqueda
            ? `Sin resultados para "${busqueda}"`
            : "No hay productos. Importa un CSV para comenzar."}
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre del producto</th>
                <th>Precio producción</th>
                <th>Estado</th>
                {user.role === "ADMIN" && <th></th>}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p, idx) => (
                <tr key={p.id}>
                  <td className={styles.tdIdx}>{idx + 1}</td>
                  <td className={styles.tdNombre}>{p.nombre || p.servicio}</td>
                  <td className={styles.tdPrecio}>{fmt(p.precio_final)}</td>
                  <td>
                    <span className={p.activo ? styles.badgeActivo : styles.badgeInactivo}>
                      {p.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {user.role === "ADMIN" && (
                    <td>
                      <button
                        className={styles.btnDelete}
                        onClick={() => handleDelete(p.id, p.nombre || p.servicio)}
                        title="Desactivar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
