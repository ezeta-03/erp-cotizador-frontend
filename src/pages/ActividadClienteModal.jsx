import { useEffect, useState, useMemo } from "react";
import { X, ChevronDown, ChevronUp, Search } from "lucide-react";
import { actividadesClientes } from "../api/clientes";
import styles from "./actividadClienteModal.module.scss";

const ESTADOS = ["TODAS", "PENDIENTE", "APROBADA", "RENEGOCIACION", "RECHAZADA", "FACTURADA"];

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

function EstadoBadge({ estado }) {
  return <span className={`${styles.badge} ${styles[estado]}`}>{estado}</span>;
}

export default function ActividadClienteModal({ cliente, onClose }) {
  const [actividad, setActividad] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  // Filtros
  const [busqueda, setBusqueda]       = useState("");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [desde, setDesde]             = useState("");
  const [hasta, setHasta]             = useState("");

  // Paginación
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 8;

  useEffect(() => {
    if (!cliente) return;
    setLoading(true);
    setActividad([]);
    setPagina(1);
    setExpandedId(null);
    actividadesClientes(cliente.id)
      .then(setActividad)
      .catch(() => setActividad([]))
      .finally(() => setLoading(false));
  }, [cliente]);

  // Vendedores únicos para el dropdown
  const vendedores = useMemo(() => {
    const nombres = [...new Set(actividad.map((c) => c.usuario?.nombre).filter(Boolean))];
    return nombres.sort();
  }, [actividad]);

  // Filtrado dinámico
  const filtradas = useMemo(() => {
    return actividad.filter((c) => {
      if (filtroEstado !== "TODAS" && c.estado !== filtroEstado) return false;
      if (filtroVendedor && c.usuario?.nombre !== filtroVendedor) return false;
      if (desde && new Date(c.createdAt) < new Date(desde)) return false;
      if (hasta && new Date(c.createdAt) > new Date(hasta + "T23:59:59")) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const enProductos = c.items?.some((i) =>
          (i.producto?.nombre || i.producto?.material || "").toLowerCase().includes(q)
        );
        const enNumero = String(c.numero).includes(q);
        if (!enProductos && !enNumero) return false;
      }
      return true;
    });
  }, [actividad, filtroEstado, filtroVendedor, desde, hasta, busqueda]);

  const totalPaginas = Math.ceil(filtradas.length / POR_PAGINA);
  const paginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroEstado("TODAS");
    setFiltroVendedor("");
    setDesde("");
    setHasta("");
    setPagina(1);
  };

  const hayFiltros = busqueda || filtroEstado !== "TODAS" || filtroVendedor || desde || hasta;

  const handleOverlay = (e) => { if (e.target === e.currentTarget) onClose(); };

  if (!cliente) return null;

  return (
    <div className={styles.wizardOverlay} onClick={handleOverlay}>
      <div className={styles.wizardCard}>

        {/* Header */}
        <div className={styles.wizardHeader}>
          <div>
            <h2 className={styles.wizardTitle}>Actividad de {cliente.nombreComercial}</h2>
            <p className={styles.wizardSubtitle}>
              {loading ? "Cargando..." : `${actividad.length} cotización${actividad.length !== 1 ? "es" : ""} registrada${actividad.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button className={styles.btnClose} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filtros */}
        <div className={styles.filtrosWrap}>
          {/* Búsqueda */}
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              className={styles.searchInput}
              placeholder="Buscar por producto o N° cotización..."
              value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            />
          </div>

          {/* Vendedor + Fechas */}
          <div className={styles.filtrosRow}>
            {vendedores.length > 1 && (
              <select
                className={styles.select}
                value={filtroVendedor}
                onChange={(e) => { setFiltroVendedor(e.target.value); setPagina(1); }}
              >
                <option value="">Todos los vendedores</option>
                {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            <div className={styles.dateRange}>
              <input
                type="date"
                className={styles.dateInput}
                value={desde}
                onChange={(e) => { setDesde(e.target.value); setPagina(1); }}
                title="Desde"
              />
              <span className={styles.dateSep}>—</span>
              <input
                type="date"
                className={styles.dateInput}
                value={hasta}
                onChange={(e) => { setHasta(e.target.value); setPagina(1); }}
                title="Hasta"
              />
            </div>
            {hayFiltros && (
              <button className={styles.btnLimpiar} onClick={limpiarFiltros}>
                Limpiar
              </button>
            )}
          </div>

          {/* Estado chips */}
          <div className={styles.chips}>
            {ESTADOS.map((e) => (
              <button
                key={e}
                className={`${styles.chip} ${filtroEstado === e ? styles.chipActive : ""}`}
                onClick={() => { setFiltroEstado(e); setPagina(1); }}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Contenido */}
        <div className={styles.body}>
          {loading ? (
            <div className={styles.empty}>Cargando actividad...</div>
          ) : filtradas.length === 0 ? (
            <div className={styles.empty}>
              {hayFiltros ? "No hay resultados para los filtros aplicados." : "No hay actividad registrada para este cliente."}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>N°</th>
                    <th>Vendedor</th>
                    <th>Productos</th>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map((c) => {
                    const expanded = expandedId === c.id;
                    const productos = c.items?.map(
                      (i) => i.producto?.nombre || i.producto?.material || i.producto?.servicio || "—"
                    );
                    return (
                      <>
                        <tr key={c.id} className={expanded ? styles.trExpanded : ""}>
                          <td className={styles.tdNumero}>#{c.numero}</td>
                          <td>{c.usuario?.nombre || "—"}</td>
                          <td className={styles.tdProductos}>
                            {productos?.slice(0, 2).join(", ")}
                            {productos?.length > 2 && (
                              <span className={styles.more}> +{productos.length - 2} más</span>
                            )}
                          </td>
                          <td className={styles.tdFecha}>
                            {new Date(c.createdAt).toLocaleDateString("es-PE", {
                              day: "2-digit", month: "short", year: "numeric",
                            })}
                          </td>
                          <td className={styles.tdTotal}>{fmt(c.total)}</td>
                          <td><EstadoBadge estado={c.estado} /></td>
                          <td>
                            <button
                              className={styles.btnExpand}
                              onClick={() => setExpandedId(expanded ? null : c.id)}
                              title={expanded ? "Ocultar detalle" : "Ver detalle"}
                            >
                              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </button>
                          </td>
                        </tr>

                        {expanded && (
                          <tr key={`${c.id}-detail`} className={styles.trDetail}>
                            <td colSpan={7}>
                              <div className={styles.detailBox}>
                                <p className={styles.detailLabel}>Detalle de productos</p>
                                <table className={styles.detailTable}>
                                  <thead>
                                    <tr>
                                      <th>Producto</th>
                                      <th>Cantidad</th>
                                      <th>Precio unit.</th>
                                      <th>Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {c.items?.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.producto?.nombre || item.producto?.material || item.descripcion || "—"}</td>
                                        <td>{item.cantidad}</td>
                                        <td>{fmt(item.precio)}</td>
                                        <td className={styles.detailSubtotal}>{fmt(item.subtotal)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {c.respuestaComentario && (
                                  <p className={styles.detailComentario}>
                                    <strong>Comentario:</strong> "{c.respuestaComentario}"
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer: paginación + resumen */}
        {!loading && filtradas.length > 0 && (
          <div className={styles.footer}>
            <span className={styles.footerInfo}>
              Mostrando {Math.min((pagina - 1) * POR_PAGINA + 1, filtradas.length)}–{Math.min(pagina * POR_PAGINA, filtradas.length)} de {filtradas.length}
            </span>
            {totalPaginas > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.btnPag}
                  onClick={() => setPagina(pagina - 1)}
                  disabled={pagina === 1}
                >
                  Anterior
                </button>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    className={`${styles.btnPag} ${p === pagina ? styles.btnPagActive : ""}`}
                    onClick={() => setPagina(p)}
                  >
                    {p}
                  </button>
                ))}
                <button
                  className={styles.btnPag}
                  onClick={() => setPagina(pagina + 1)}
                  disabled={pagina === totalPaginas}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
