import { useState, useEffect, useRef } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { getMisAprobadas, crearSolicitud } from "../api/solicitudesMargen";
import styles from "./CotizacionModal.module.scss";

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

export default function CotizacionModal({ onClose, onSave }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

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

  const productosFiltrados = productos.filter((p) =>
    nombreProducto(p).toLowerCase().includes(busquedaProducto.toLowerCase())
  );

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
    setBusquedaProducto("");
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
          <span className={styles.medidaResult}>
            = {parseFloat(((item.medidaAncho || 1) * (item.medidaAlto || 1)).toFixed(4))}
          </span>
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
        {item.unidad && <span className={styles.unidadLabel}>{item.unidad}</span>}
      </div>
    );
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Nueva Cotización</h2>

        {!showPreview ? (
          <>
            {/* Cliente */}
            <label className={styles.label}>Cliente</label>
            <select
              className={styles.select}
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

            {/* Margen de rentabilidad */}
            <div className={styles.margenRow}>
              <label className={styles.label} style={{ margin: 0 }}>
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
            <label className={styles.label}>Agregar producto</label>
            <input
              className={styles.select}
              placeholder="Buscar producto..."
              value={busquedaProducto}
              onChange={(e) => setBusquedaProducto(e.target.value)}
            />
            {busquedaProducto && productosFiltrados.length > 0 && (
              <div className={styles.dropdown}>
                {productosFiltrados.slice(0, 10).map((p) => (
                  <button
                    key={p.id}
                    className={styles.dropdownItem}
                    onClick={() => agregarProducto(p)}
                    type="button"
                  >
                    <span>
                      {nombreProducto(p)}
                      {p.tipoMedida && p.tipoMedida !== "UNIDAD" && (
                        <span className={styles.dropdownTipo}>
                          {" "}· {p.tipoMedida === "AREA" ? "m²" : p.unidad || p.tipoMedida.toLowerCase()}
                        </span>
                      )}
                    </span>
                    <span className={styles.dropdownPrice}>
                      {fmt(parseFloat((Number(p.precio_final) * (1 + margen / 100)).toFixed(2)))}
                      {p.unidad ? `/${p.unidad}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {busquedaProducto && productosFiltrados.length === 0 && (
              <p className={styles.noResults}>Sin resultados para "{busquedaProducto}"</p>
            )}

            {/* Tabla interna */}
            {items.length > 0 && (
              <>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Dimensiones</th>
                      <th>Piezas</th>
                      <th>P./pieza</th>
                      <th>Subtotal</th>
                      <th>Adicionales</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.nombre}</td>
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
                          <button className={styles.btnRemove} onClick={() => eliminarProducto(idx)}>
                            ✕
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

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button
                className={styles.btnPrimary}
                onClick={abrirVistaPrevia}
                disabled={!puedeGuardar || items.length === 0 || !clienteId}
                title={!puedeGuardar ? "Margen por debajo del mínimo. Solicita aprobación." : undefined}
              >
                Vista Previa
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className={styles.title}>Vista Previa</h3>
            <p>
              <strong>Cliente:</strong>{" "}
              {clientes.find((c) => String(c.id) === String(clienteId))?.nombreComercial}
            </p>
            <p>
              <strong>Fecha:</strong> {new Date().toLocaleDateString("es-PE")}
            </p>
            <p>
              <strong>Margen aplicado:</strong>{" "}
              <span className={margenBajoMinimo ? styles.margenWarn : ""}>
                {margen}%{margenBajoMinimo && " (aprobado por admin)"}
              </span>
            </p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Medida</th>
                  <th>Piezas</th>
                  <th>Precio/pieza</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const glosa = item.adicionales
                    .filter((a) => a.seleccionado)
                    .map((a) => `con ${a.nombre}`)
                    .join(", ");
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>
                        {item.nombre}
                        {glosa && <span className={styles.glosa}> — {glosa}</span>}
                      </td>
                      <td>{medidaStr(item)}</td>
                      <td>{item.cantidad}</td>
                      <td>{fmt(item.precio)}</td>
                      <td>{fmt(item.subtotal)}</td>
                    </tr>
                  );
                })}
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

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={() => setShowPreview(false)}>
                Volver
              </button>
              <button className={styles.btnPrimary} onClick={handleSave}>
                Generar Cotización
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
