import { useState, useEffect, useRef, useMemo } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { getMisAprobadas, crearSolicitud } from "../api/solicitudesMargen";
import styles from "./CotizacionModal.module.scss";
import { X, ChevronLeft, Eye, FileText, Trash2 } from "lucide-react";
import CotizacionPDFPreview from "../coomponents/CotizacionPDFPreview";

const MARGEN_MINIMO = 30;
const IGV_RATE = 0.18;

const nombreProducto = (p) => p?.nombre || p?.servicio || p?.material || "(sin nombre)";

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

// ── Input decimal: type="text" con teclado numérico — acepta coma o punto ──
function DecimalInput({ value, onChange, className, disabled, min = 0.01, placeholder }) {
  const [raw, setRaw] = useState(() => (value != null ? String(value) : ""));
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setRaw(value != null ? String(value) : "");
    }
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={raw}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      onChange={(e) => setRaw(e.target.value.replace(/[^0-9.,]/g, ""))}
      onFocus={() => { isFocused.current = true; }}
      onBlur={() => {
        isFocused.current = false;
        const num = Math.max(min, parseFloat(raw.replace(",", ".")) || min);
        setRaw(String(num));
        onChange(num);
      }}
    />
  );
}

export default function CotizacionModal({ onClose, onSave, initialClienteId, initialItems, title, saveLabel }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState(initialClienteId || "");
  const [items, setItems] = useState(initialItems || []);
  const [showPreview, setShowPreview] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("TODOS");
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);

  // IGV
  const [conIgv, setConIgv] = useState(true);

  // Margen
  const [margen, setMargen] = useState(MARGEN_MINIMO);
  const margenBajoMinimo = margen < MARGEN_MINIMO;

  // Solicitud de margen reducido
  const [aprobaciones, setAprobaciones] = useState([]);
  const [mostrarFormSolicitud, setMostrarFormSolicitud] = useState(false);
  const [comentarioSolicitud, setComentarioSolicitud] = useState("");
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false);
  const [solicitudEnviada, setSolicitudEnviada] = useState(false);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    getClientes().then(setClientes);
    getProductos().then(setProductos);
    getMisAprobadas().then(setAprobaciones).catch(() => {});
  }, []);

  const margenAprobado = aprobaciones.length > 0
    ? Math.min(...aprobaciones.map((s) => s.margenSolicitado))
    : null;

  const margenPermitido = margenAprobado !== null && margen >= margenAprobado;
  const puedeGuardar = !margenBajoMinimo || margenPermitido;

  // ── Categorías únicas (para chips de filtro) ──────────────────────────────
  const categorias = useMemo(() => {
    const cats = [...new Set(productos.map((p) => p.categoria || "GENERAL"))].sort();
    return ["TODOS", ...cats];
  }, [productos]);

  const contPorCategoria = useMemo(() => {
    const m = {};
    productos.forEach((p) => { const c = p.categoria || "GENERAL"; m[c] = (m[c] || 0) + 1; });
    return m;
  }, [productos]);

  const productosFiltrados = useMemo(() => productos.filter((p) => {
    const matchTexto = !busquedaProducto ||
      nombreProducto(p).toLowerCase().includes(busquedaProducto.toLowerCase());
    const matchCategoria = categoriaFiltro === "TODOS" || (p.categoria || "GENERAL") === categoriaFiltro;
    return matchTexto && matchCategoria;
  }), [productos, busquedaProducto, categoriaFiltro]);

  // ── Recalcula precios manteniendo medida/dimensiones actuales ──────────────
  const recalcularItems = (nuevoMargen, prevItems) =>
    prevItems.map((item) => {
      const sumaAdicionales = item.adicionales
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);
      const precioBase = parseFloat((item.precio_final * (item.medida || 1) + sumaAdicionales).toFixed(2));
      const precio = parseFloat((precioBase * (1 + nuevoMargen / 100)).toFixed(2));
      return {
        ...item,
        precioBase,
        precio,
        subtotalBase: parseFloat((precioBase * item.cantidad).toFixed(2)),
        subtotal: parseFloat((precio * item.cantidad).toFixed(2)),
      };
    });

  const handleMargenChange = (num) => {
    setMargen(num);
    setItems((prev) => recalcularItems(num, prev));
  };

  // ── Helpers de recalculo de precios por item ───────────────────────────────
  const _recalcItem = (item, nuevoMargen) => {
    const sumaAdicionales = item.adicionales
      .filter((a) => a.seleccionado)
      .reduce((acc, a) => acc + Number(a.precio), 0);
    const precioBase = parseFloat((item.precio_final * (item.medida || 1) + sumaAdicionales).toFixed(2));
    const precio = parseFloat((precioBase * (1 + nuevoMargen / 100)).toFixed(2));
    return {
      ...item,
      precioBase,
      precio,
      subtotalBase: parseFloat((precioBase * item.cantidad).toFixed(2)),
      subtotal: parseFloat((precio * item.cantidad).toFixed(2)),
    };
  };

  // ── Agregar producto ───────────────────────────────────────────────────────
  const agregarProducto = (producto) => {
    const tipoMedida = producto.tipoMedida || "UNIDAD";
    const medidaAncho = 1;
    const medidaAlto = 1;
    const medida = tipoMedida === "AREA" ? medidaAncho * medidaAlto : 1;
    const precioBase = parseFloat((producto.precio_final * medida).toFixed(2));
    const precio = parseFloat((precioBase * (1 + margen / 100)).toFixed(2));
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        nombre: nombreProducto(producto),
        precio_final: producto.precio_final,
        unidad: producto.unidad || "",
        tipoMedida,
        medida,
        medidaAncho,
        medidaAlto,
        precioBase,
        precio,
        cantidad: 1,
        descripcion: "",
        subtotalBase: precioBase,
        subtotal: precio,
        adicionales:
          producto.adicionales?.map((a) => ({
            id: a.id,
            nombre: a.nombre,
            seleccionado: false,
            precio: a.precio,
          })) || [],
      },
    ]);
  };

  const eliminarProducto = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Adicionales ────────────────────────────────────────────────────────────
  const toggleAdicional = (idx, j, checked) => {
    setItems((prev) => {
      const next = prev.map((item, i) => i !== idx ? item : { ...item });
      next[idx].adicionales = next[idx].adicionales.map((a, k) =>
        k !== j ? a : { ...a, seleccionado: checked }
      );
      return prev.map((item, i) => i !== idx ? item : _recalcItem(next[idx], margen));
    });
  };

  // ── Dimensiones AREA (ancho × alto) ───────────────────────────────────────
  const actualizarDimension = (idx, dim, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (dim === "ancho") item.medidaAncho = value;
      else item.medidaAlto = value;
      item.medida = parseFloat(((item.medidaAncho || 1) * (item.medidaAlto || 1)).toFixed(6));
      next[idx] = _recalcItem(item, margen);
      return next;
    });
  };

  // ── Medida simple (LINEAL / PESO) ─────────────────────────────────────────
  const actualizarMedida = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = _recalcItem({ ...next[idx], medida: value }, margen);
      return next;
    });
  };

  // ── Descripción / glosa libre por item ────────────────────────────────────
  const actualizarDescripcion = (idx, value) => {
    setItems((prev) => prev.map((item, i) => i !== idx ? item : { ...item, descripcion: value }));
  };

  // ── Cantidad (piezas) ─────────────────────────────────────────────────────
  const actualizarCantidad = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      const item = { ...next[idx], cantidad: value };
      item.subtotalBase = parseFloat((item.precioBase * value).toFixed(2));
      item.subtotal = parseFloat((item.precio * value).toFixed(2));
      next[idx] = item;
      return next;
    });
  };

  // ── Totales ────────────────────────────────────────────────────────────────
  const totalBase = parseFloat(items.reduce((s, i) => s + (i.subtotalBase ?? i.subtotal), 0).toFixed(2));
  const margenMonto = parseFloat((totalBase * margen / 100).toFixed(2));
  const valorVenta = parseFloat((totalBase + margenMonto).toFixed(2));
  const igvMonto = parseFloat((conIgv ? valorVenta * IGV_RATE : 0).toFixed(2));
  const totalFinal = parseFloat((valorVenta + igvMonto).toFixed(2));

  const abrirVistaPrevia = () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona un cliente y agrega al menos un producto");
      return;
    }
    setShowPreview(true);
  };

  const handleSave = () => {
    onSave({ clienteId, items, margen, conIgv });
    onClose();
  };

  const verificarAprobacion = async () => {
    setVerificando(true);
    try {
      const data = await getMisAprobadas();
      setAprobaciones(data);
    } catch {
      // silencioso
    } finally {
      setVerificando(false);
    }
  };

  const enviarSolicitud = async () => {
    if (!comentarioSolicitud.trim()) {
      alert("Escribe un comentario para justificar el margen reducido.");
      return;
    }
    setEnviandoSolicitud(true);
    try {
      await crearSolicitud({ margenSolicitado: margen, comentario: comentarioSolicitud });
      setSolicitudEnviada(true);
      setMostrarFormSolicitud(false);
      setComentarioSolicitud("");
    } catch (err) {
      alert(err.response?.data?.message || "Error enviando la solicitud.");
    } finally {
      setEnviandoSolicitud(false);
    }
  };

  // ── Helper: string descriptivo de medida para vista previa / PDF ───────────
  const medidaStr = (item) => {
    if (!item.tipoMedida || item.tipoMedida === "UNIDAD") return "—";
    if (item.tipoMedida === "AREA") {
      const a = parseFloat((item.medidaAncho || 1).toFixed(4));
      const b = parseFloat((item.medidaAlto || 1).toFixed(4));
      return `${a} × ${b}${item.unidad ? ` ${item.unidad}` : ""}`;
    }
    return `${parseFloat((item.medida || 1).toFixed(4))}${item.unidad ? ` ${item.unidad}` : ""}`;
  };

  // ── Celda de dimensiones en tabla interna ──────────────────────────────────
  const renderMedidaCell = (item, idx) => {
    if (!item.tipoMedida || item.tipoMedida === "UNIDAD") {
      return <span className={styles.medidaNA}>—</span>;
    }
    if (item.tipoMedida === "AREA") {
      const area = parseFloat(((item.medidaAncho || 1) * (item.medidaAlto || 1)).toFixed(4));
      return (
        <div className={styles.medidaAreaCell}>
          <DecimalInput
            value={item.medidaAncho || 1}
            onChange={(v) => actualizarDimension(idx, "ancho", v)}
            className={styles.inputMedida}
            placeholder="Ancho"
          />
          <span className={styles.medidaSep}>×</span>
          <DecimalInput
            value={item.medidaAlto || 1}
            onChange={(v) => actualizarDimension(idx, "alto", v)}
            className={styles.inputMedida}
            placeholder="Alto"
          />
          {item.unidad && <span className={styles.unidadLabel}>{item.unidad}</span>}
          <span className={styles.medidaResult}>= {area} por pieza</span>
        </div>
      );
    }
    return (
      <div className={styles.medidaCell}>
        <DecimalInput
          value={item.medida || 1}
          onChange={(v) => actualizarMedida(idx, v)}
          className={styles.inputMedida}
        />
        {item.unidad
          ? <span className={styles.unidadLabel}>{item.unidad} por pieza</span>
          : <span className={styles.unidadLabel}>por pieza</span>
        }
      </div>
    );
  };

  return (
    <div className={styles.wizardOverlay}>
      <div className={styles.wizardCard}>
        <div className={styles.wizardHeader}>
          <h2 className={styles.wizardTitle}>{title || "Nueva Cotización"}</h2>
          <button className={styles.btnClose} onClick={onClose} type="button" title="Cerrar">
            <X size={20} />
          </button>
        </div>

        {!showPreview ? (
          <div className={styles.formModalBody}>
            {/* Cliente */}
            <div className={styles.formField}>
              <label>Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecciona cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombreComercial}
                </option>
              ))}
            </select>
            </div>

            {/* Margen de rentabilidad */}
            <div className={styles.margenRow}>
              <label style={{ margin: 0, fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                Margen de rentabilidad
              </label>
              <div className={styles.margenInputGroup}>
                <DecimalInput
                  value={margen}
                  onChange={handleMargenChange}
                  min={0}
                  disabled={margenBajoMinimo && margenPermitido}
                  className={`${styles.margenInput} ${margenBajoMinimo && !margenPermitido ? styles.margenInputError : ""}`}
                />
                <span className={styles.margenSuffix}>%</span>
                {margenBajoMinimo && margenPermitido && (
                  <span className={styles.margenOk}>Aprobado</span>
                )}
                {margenBajoMinimo && !margenPermitido && (
                  <span className={styles.margenWarn}>mínimo {MARGEN_MINIMO}%</span>
                )}
                {!margenBajoMinimo && (
                  <span className={styles.margenOk}>OK</span>
                )}
              </div>
            </div>

            {/* Banner de margen bajo (no aprobado) */}
            {margenBajoMinimo && !margenPermitido && (
              <div className={styles.margenAlerta}>
                <div className={styles.margenAlertaTexto}>
                  <strong>Margen por debajo del mínimo ({MARGEN_MINIMO}%)</strong>
                  {margenAprobado !== null && (
                    <p>Tienes aprobación para usar hasta {margenAprobado}% de margen.</p>
                  )}
                  {solicitudEnviada ? (
                    <div className={styles.solicitudEnviadaRow}>
                      <p className={styles.solicitudEnviada}>
                        Solicitud enviada. Espera la aprobación del administrador.
                      </p>
                      <button
                        className={styles.btnVerificar}
                        onClick={verificarAprobacion}
                        disabled={verificando}
                      >
                        {verificando ? "Verificando…" : "Verificar aprobación"}
                      </button>
                    </div>
                  ) : !mostrarFormSolicitud ? (
                    <button
                      className={styles.btnSolicitar}
                      onClick={() => setMostrarFormSolicitud(true)}
                    >
                      Solicitar Margen
                    </button>
                  ) : (
                    <div className={styles.formSolicitud}>
                      <p className={styles.formSolicitudLabel}>
                        Solicitar margen de <strong>{margen}%</strong> — explica el motivo:
                      </p>
                      <textarea
                        className={styles.textareaSolicitud}
                        placeholder="Ej: Cliente licitación pública, precio de mercado competitivo..."
                        value={comentarioSolicitud}
                        onChange={(e) => setComentarioSolicitud(e.target.value)}
                        rows={3}
                      />
                      <div className={styles.formSolicitudActions}>
                        <button
                          className={styles.btnCancelarSolicitud}
                          onClick={() => { setMostrarFormSolicitud(false); setComentarioSolicitud(""); }}
                        >
                          Cancelar
                        </button>
                        <button
                          className={styles.btnEnviarSolicitud}
                          onClick={enviarSolicitud}
                          disabled={enviandoSolicitud}
                        >
                          {enviandoSolicitud ? "Enviando..." : "Enviar solicitud"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Banner de margen aprobado */}
            {margenBajoMinimo && margenPermitido && (
              <div className={styles.margenAprobado}>
                Margen de <strong>{margenAprobado}%</strong> aprobado por el administrador
              </div>
            )}

            {/* IGV Toggle */}
            <div className={styles.igvRow}>
              <span className={styles.igvLabel}>IGV (18%)</span>
              <label className={`${styles.toggle} ${conIgv ? styles.toggleOn : ""}`}>
                <input type="checkbox" checked={conIgv} onChange={(e) => setConIgv(e.target.checked)} />
                <span className={styles.toggleTrack}><span className={styles.toggleThumb} /></span>
              </label>
              <span className={conIgv ? styles.igvBadge : styles.igvBadgeSin}>
                {conIgv ? "Precios con IGV" : "Precios sin IGV"}
              </span>
            </div>

            {/* Buscar y agregar producto */}
            <div className={styles.productosSelectorHeader}>
              <label style={{ fontWeight: 600, fontSize: "0.85rem", color: "#475569" }}>
                Agregar producto
              </label>
              <button
                type="button"
                className={styles.buscadorButton}
                onClick={() => setMostrarModalProductos(true)}
              >
                Buscar productos
              </button>
            </div>

            {mostrarModalProductos && (
              <div
                className={styles.productosOverlay}
                onClick={(e) => { if (e.target === e.currentTarget) setMostrarModalProductos(false); }}
              >
                <div className={styles.productosModal}>
                  <div className={styles.productosModalHeader}>
                    <h3>Seleccionar producto</h3>
                    <button className={styles.btnClose} onClick={() => setMostrarModalProductos(false)} type="button" title="Cerrar">
                      <X size={20} />
                    </button>
                  </div>

                  <div className={styles.productosModalBody}>
                    <div className={styles.catFiltros}>
                      {categorias.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          className={`${styles.catChip} ${categoriaFiltro === cat ? styles.catChipActive : ""}`}
                          onClick={() => setCategoriaFiltro(cat)}
                        >
                          {cat}
                          {cat !== "TODOS" && (
                            <span className={styles.catCount}>{contPorCategoria[cat] ?? 0}</span>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className={styles.buscadorWrap}>
                      <span className={styles.buscadorIcon}>⌕</span>
                      <input
                        className={styles.buscadorInput}
                        placeholder={`Buscar${categoriaFiltro !== "TODOS" ? ` en ${categoriaFiltro}` : " producto"}…`}
                        value={busquedaProducto}
                        onChange={(e) => setBusquedaProducto(e.target.value)}
                      />
                      {busquedaProducto && (
                        <button
                          type="button"
                          className={styles.buscadorClear}
                          onClick={() => setBusquedaProducto("")}
                        >✕</button>
                      )}
                    </div>

                    <div className={styles.dropdown}>
                      {productosFiltrados.length === 0 ? (
                        <p className={styles.noResultsInline}>
                          Sin resultados{busquedaProducto ? ` para "${busquedaProducto}"` : ""}
                        </p>
                      ) : (
                        productosFiltrados.slice(0, 12).map((p) => {
                          const unidadLabel = (!p.tipoMedida || p.tipoMedida === "UNIDAD")
                            ? "pza"
                            : p.unidad || (p.tipoMedida === "AREA" ? "m²" : p.tipoMedida.toLowerCase());
                          const precioConMargen = parseFloat((Number(p.precio_final) * (1 + margen / 100)).toFixed(2));
                          return (
                            <button
                              key={p.id}
                              className={styles.dropdownItem}
                              onClick={() => agregarProducto(p)}
                              type="button"
                            >
                              <div className={styles.dropdownItemInfo}>
                                <span className={styles.dropdownItemNombre}>{nombreProducto(p)}</span>
                                <div className={styles.dropdownBadges}>
                                  {p.categoria && (
                                    <span className={styles.badgeCat}>{p.categoria}</span>
                                  )}
                                  {p.tipoMedida && p.tipoMedida !== "UNIDAD" && (
                                    <span className={styles.badgeTipo}>{unidadLabel}</span>
                                  )}
                                </div>
                              </div>
                              <span className={styles.dropdownPrice}>
                                {fmt(precioConMargen)}
                                <span className={styles.dropdownUnit}> / {unidadLabel}</span>
                              </span>
                            </button>
                          );
                        })
                      )}
                      {productosFiltrados.length > 12 && (
                        <p className={styles.dropdownMore}>
                          +{productosFiltrados.length - 12} más — refina la búsqueda
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla interna */}
            {items.length > 0 && (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>
                        Producto
                        <div className={styles.thHint}>nombre · notas</div>
                      </th>
                      <th>
                        Dimensiones
                        <div className={styles.thHint}>tamaño de cada pieza</div>
                      </th>
                      <th>
                        Cant.
                        <div className={styles.thHint}>piezas</div>
                      </th>
                      <th>
                        Precio
                        <div className={styles.thHint}>base / pieza</div>
                      </th>
                      <th>Subtotal</th>
                      <th>Adicionales</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className={styles.productoCell}>
                            <span className={styles.productoNombre}>{item.nombre}</span>
                            <input
                              type="text"
                              className={styles.inputDescripcion}
                              placeholder="Notas (opcional)…"
                              value={item.descripcion || ""}
                              onChange={(e) => actualizarDescripcion(idx, e.target.value)}
                            />
                          </div>
                        </td>
                        <td>{renderMedidaCell(item, idx)}</td>
                        <td>
                          <DecimalInput
                            value={item.cantidad}
                            onChange={(v) => actualizarCantidad(idx, v)}
                            className={styles.inputCantidad}
                          />
                        </td>
                        <td>{fmt(item.precioBase)}</td>
                        <td>{fmt(item.subtotalBase)}</td>
                        <td>
                          {item.adicionales.map((a, j) => (
                            <label key={a.id} className={styles.checkbox}>
                              <input
                                type="checkbox"
                                checked={a.seleccionado}
                                onChange={(e) => toggleAdicional(idx, j, e.target.checked)}
                              />
                              {a.nombre} (+{fmt(a.precio)})
                            </label>
                          ))}
                        </td>
                        <td>
                          <button className={styles.btnDelete} onClick={() => eliminarProducto(idx)} title="Quitar">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className={styles.resumenFinanciero}>
                  <div className={styles.resumenFila}>
                    <span>Subtotal base</span>
                    <span>{fmt(totalBase)}</span>
                  </div>
                  <div className={`${styles.resumenFila} ${styles.resumenMargen}`}>
                    <span>Rentabilidad ({margen}%)</span>
                    <span>+ {fmt(margenMonto)}</span>
                  </div>
                  {conIgv && (
                    <>
                      <div className={`${styles.resumenFila} ${styles.resumenValorVenta}`}>
                        <span>Valor de venta</span>
                        <span>{fmt(valorVenta)}</span>
                      </div>
                      <div className={`${styles.resumenFila} ${styles.resumenIgv}`}>
                        <span>IGV (18%)</span>
                        <span>+ {fmt(igvMonto)}</span>
                      </div>
                    </>
                  )}
                  <div className={`${styles.resumenFila} ${styles.resumenTotal}`}>
                    <span>{conIgv ? "Total con IGV" : "Total sin IGV"}</span>
                    <span>{fmt(totalFinal)}</span>
                  </div>
                </div>
              </>
            )}

            <div className={styles.wizardActions}>
              <button className={styles.btnGhost} onClick={onClose}>
                <X size={15} /> Cancelar
              </button>
              <button
                className={styles.btnPrimary}
                onClick={abrirVistaPrevia}
                disabled={!puedeGuardar || items.length === 0 || !clienteId}
                title={!puedeGuardar ? "Margen por debajo del mínimo. Solicita aprobación." : undefined}
              >
                <Eye size={15} /> Vista Previa
              </button>
            </div>
          </div>
        ) : (() => {
          const clienteObj = clientes.find((c) => String(c.id) === String(clienteId));
          const fechaFmt = new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
          const previewItems = items.map((item) => ({
            nombre: item.nombre,
            descripcion: item.descripcion ||
              item.adicionales?.filter((a) => a.seleccionado).map((a) => `con ${a.nombre}`).join(", "),
            medidaAncho: item.medidaAncho,
            medidaAlto: item.medidaAlto,
            medida: item.medida,
            unidad: item.unidad,
            cantidad: item.cantidad,
            precio: item.precio,
            subtotal: item.subtotal,
          }));
          return (
            <>
              <CotizacionPDFPreview
                numero={null}
                fecha={fechaFmt}
                estado={null}
                cliente={clienteObj}
                conIgv={conIgv}
                items={previewItems}
                valorVenta={valorVenta}
                igvMonto={igvMonto}
                total={totalFinal}
              />
              <div className={styles.wizardActions}>
                <button className={styles.btnGhost} onClick={() => setShowPreview(false)}>
                  <ChevronLeft size={15} /> Volver
                </button>
                <button className={styles.btnPrimary} onClick={handleSave}>
                  <FileText size={15} /> {saveLabel || "Generar Cotización"}
                </button>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
