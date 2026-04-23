import { useEffect, useRef, useState } from "react";
import useAuth from "../auth/useAuth";
import { getProductos, deleteProducto, importarProductosCSV } from "../api/productos";
import ConfiguracionForm from "../coomponents/ConfiguracionForm";
import styles from "./productos.module.scss";
import {
  Upload,
  Download,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
} from "lucide-react";

const PLANTILLA_CSV = `Producto;Precio de Produccion\nBANNER DELGADO 10 ONZAS;S/ 9.00\nBANNER GRUESO 12 ONZAS;S/ 13.50`;

export default function Productos() {
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null); // { creados, actualizados, omitidos, errores }
  const [confirmacion, setConfirmacion] = useState(null); // archivo pendiente de confirmación

  const cargarProductos = async () => {
    setLoading(true);
    try {
      const data = await getProductos();
      setProductos(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  // ── Filtrado ──────────────────────────────────────────────
  const productosFiltrados = productos.filter((p) =>
    (p.nombre || p.servicio || "").toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── Descarga de plantilla ─────────────────────────────────
  const descargarPlantilla = () => {
    const blob = new Blob([PLANTILLA_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_productos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Selección de archivo → pide confirmación ──────────────
  const onFileChange = (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    e.target.value = ""; // reset para permitir re-selección del mismo archivo
    setConfirmacion(archivo);
  };

  // ── Ejecuta la importación ────────────────────────────────
  const ejecutarImport = async () => {
    if (!confirmacion) return;
    setConfirmacion(null);
    setImportando(true);
    setResultado(null);
    try {
      const res = await importarProductosCSV(confirmacion);
      setResultado(res);
      await cargarProductos();
    } catch (err) {
      setResultado({
        message: "Error al importar",
        errores: [{ fila: "-", error: err.response?.data?.message || err.message }],
        creados: 0,
        actualizados: 0,
        omitidos: 0,
        total: 0,
      });
    } finally {
      setImportando(false);
    }
  };

  // ── Eliminar (soft delete) ────────────────────────────────
  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Desactivar "${nombre}"?`)) return;
    try {
      await deleteProducto(id);
      await cargarProductos();
    } catch {
      alert("No se pudo desactivar el producto.");
    }
  };

  const formatCurrency = (v) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

  return (
    <div className={styles.container}>
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
              className={styles.btnPrimary}
              onClick={() => fileInputRef.current?.click()}
              disabled={importando}
            >
              {importando ? <RefreshCw size={16} className={styles.spin} /> : <Upload size={16} />}
              {importando ? "Importando..." : "Importar CSV"}
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

      {/* ── Alerta de confirmación ── */}
      {confirmacion && (
        <div className={styles.confirmBanner}>
          <AlertTriangle size={20} />
          <div>
            <strong>¿Confirmar importación?</strong>
            <p>
              Esto reemplazará <strong>todos los productos activos</strong> con los del
              archivo <code>{confirmacion.name}</code>. Los productos sin precio serán omitidos.
            </p>
          </div>
          <div className={styles.confirmActions}>
            <button className={styles.btnDanger} onClick={ejecutarImport}>
              Sí, importar
            </button>
            <button className={styles.btnGhost} onClick={() => setConfirmacion(null)}>
              <X size={16} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Resultado de importación ── */}
      {resultado && (
        <div className={`${styles.resultado} ${resultado.errores?.length ? styles.resultadoWarn : styles.resultadoOk}`}>
          <div className={styles.resultadoHeader}>
            {resultado.errores?.length ? <AlertTriangle size={18} /> : <CheckCircle size={18} />}
            <strong>{resultado.message}</strong>
            <button className={styles.btnClose} onClick={() => setResultado(null)}>
              <X size={16} />
            </button>
          </div>
          <ul className={styles.resultadoStats}>
            <li><CheckCircle size={14} /> <span>{resultado.creados} creados</span></li>
            <li><RefreshCw size={14} /> <span>{resultado.actualizados} actualizados</span></li>
            <li><XCircle size={14} /> <span>{resultado.omitidos} omitidos</span></li>
          </ul>
          {resultado.errores?.length > 0 && (
            <details className={styles.erroresDetail}>
              <summary>{resultado.errores.length} error(es)</summary>
              <ul>
                {resultado.errores.map((e, i) => (
                  <li key={i}>Fila {e.fila}: {e.nombre ? `"${e.nombre}" — ` : ""}{e.error}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* ── Configuración de precios (solo ADMIN) ── */}
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

      {/* ── Tabla ── */}
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
                {user.role === "ADMIN" && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {productosFiltrados.map((p, idx) => (
                <tr key={p.id}>
                  <td className={styles.tdIdx}>{idx + 1}</td>
                  <td className={styles.tdNombre}>{p.nombre || p.servicio}</td>
                  <td className={styles.tdPrecio}>{formatCurrency(p.precio_final)}</td>
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
                        title="Desactivar producto"
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
