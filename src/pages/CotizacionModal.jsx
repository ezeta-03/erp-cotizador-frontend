import { useState, useEffect } from "react";
import { getClientes } from "../api/clientes";
import { getProductos } from "../api/productos";
import { getMisAprobadas, crearSolicitud } from "../api/solicitudesMargen";
import styles from "./CotizacionModal.module.scss";

const MARGEN_MINIMO = 30;
const INDIRECTO = 1.1;
const ADMINISTRATIVO = 1.17;
const MARKUP_BASE = INDIRECTO * ADMINISTRATIVO; // sin margen

const precioConMargen = (costoMaterial, margenPct) =>
  parseFloat((costoMaterial * MARKUP_BASE * (1 + margenPct / 100)).toFixed(2));

const nombreProducto = (p) => p?.nombre || p?.servicio || p?.material || "(sin nombre)";

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

export default function CotizacionModal({ onClose, onSave }) {
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [items, setItems] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // Margen
  const [margen, setMargen] = useState(MARGEN_MINIMO);
  const [margenInput, setMargenInput] = useState(String(MARGEN_MINIMO));
  const margenBajoMinimo = margen < MARGEN_MINIMO;

  // Solicitud de margen reducido
  const [aprobaciones, setAprobaciones] = useState([]); // solicitudes APROBADA del usuario
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

  // Lowest approved margin available (null if none)
  const margenAprobado = aprobaciones.length > 0
    ? Math.min(...aprobaciones.map((s) => s.margenSolicitado))
    : null;

  const margenPermitido = margenAprobado !== null && margen >= margenAprobado;
  const puedeGuardar = !margenBajoMinimo || margenPermitido;

  const productosFiltrados = productos.filter((p) =>
    nombreProducto(p).toLowerCase().includes(busquedaProducto.toLowerCase())
  );

  // Recompute all item prices when margen changes
  const recalcularItems = (nuevoMargen, prevItems) =>
    prevItems.map((item) => {
      const nuevoPrecio = precioConMargen(item.costo_material, nuevoMargen);
      const sumaAdicionales = item.adicionales
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);
      const precioTotal = parseFloat((nuevoPrecio + sumaAdicionales).toFixed(2));
      return {
        ...item,
        precio: precioTotal,
        subtotal: parseFloat((precioTotal * item.cantidad).toFixed(2)),
      };
    });

  const handleMargenChange = (val) => {
    setMargenInput(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setMargen(num);
      setItems((prev) => recalcularItems(num, prev));
    }
  };

  const agregarProducto = (producto) => {
    const precio = precioConMargen(producto.costo_material, margen);
    setItems((prev) => [
      ...prev,
      {
        productoId: producto.id,
        nombre: nombreProducto(producto),
        costo_material: producto.costo_material,
        precio,
        cantidad: 1,
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

  const toggleAdicional = (idx, j, checked) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].adicionales[j].seleccionado = checked;
      const sumaAdicionales = next[idx].adicionales
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);
      const precioBase = precioConMargen(next[idx].costo_material, margen);
      next[idx].precio = parseFloat((precioBase + sumaAdicionales).toFixed(2));
      next[idx].subtotal = parseFloat((next[idx].precio * next[idx].cantidad).toFixed(2));
      return next;
    });
  };

  const actualizarCantidad = (idx, value) => {
    setItems((prev) => {
      const next = [...prev];
      next[idx].cantidad = Math.max(1, Number(value));
      next[idx].subtotal = parseFloat((next[idx].precio * next[idx].cantidad).toFixed(2));
      return next;
    });
  };

  const total = items.reduce((s, i) => s + i.subtotal, 0);

  const abrirVistaPrevia = () => {
    if (!clienteId || items.length === 0) {
      alert("Selecciona un cliente y agrega al menos un producto");
      return;
    }
    setShowPreview(true);
  };

  const handleSave = () => {
    onSave({ clienteId, items, margen });
    onClose();
  };

  const verificarAprobacion = async () => {
    setVerificando(true);
    try {
      const data = await getMisAprobadas();
      setAprobaciones(data);
    } catch {
      // silencioso — no interrumpir el flujo
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
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={margenInput}
                  onChange={(e) => handleMargenChange(e.target.value)}
                  className={`${styles.margenInput} ${margenBajoMinimo ? styles.margenInputError : ""}`}
                />
                <span className={styles.margenSuffix}>%</span>
                {margenBajoMinimo && (
                  <span className={styles.margenWarn}>mínimo {MARGEN_MINIMO}%</span>
                )}
                {!margenBajoMinimo && margen > MARGEN_MINIMO && (
                  <span className={styles.margenOk}>✓</span>
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
                        ✓ Solicitud enviada. Espera la aprobación del administrador.
                      </p>
                      <button
                        className={styles.btnVerificar}
                        onClick={verificarAprobacion}
                        disabled={verificando}
                      >
                        {verificando ? "Verificando…" : "↻ Verificar aprobación"}
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
                ✓ Margen de <strong>{margenAprobado}%</strong> aprobado por el administrador
              </div>
            )}

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
                    <span>{nombreProducto(p)}</span>
                    <span className={styles.dropdownPrice}>
                      {fmt(precioConMargen(p.costo_material, margen))}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {busquedaProducto && productosFiltrados.length === 0 && (
              <p className={styles.noResults}>Sin resultados para "{busquedaProducto}"</p>
            )}

            {/* Tabla de items */}
            {items.length > 0 && (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio unit.</th>
                    <th>Cant.</th>
                    <th>Subtotal</th>
                    <th>Adicionales</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.nombre}</td>
                      <td>{fmt(item.precio)}</td>
                      <td>
                        <input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => actualizarCantidad(idx, e.target.value)}
                          className={styles.inputCantidad}
                        />
                      </td>
                      <td>{fmt(item.subtotal)}</td>
                      <td>
                        {item.adicionales.map((a, j) => (
                          <label key={a.id} className={styles.checkbox}>
                            <input
                              type="checkbox"
                              checked={a.seleccionado}
                              onChange={(e) => toggleAdicional(idx, j, e.target.checked)}
                            />
                            {a.nombre} ({fmt(a.precio)})
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
            )}

            <h3 className={styles.total}>Total: {fmt(total)}</h3>

            <div className={styles.actions}>
              <button className={styles.btnSecondary} onClick={onClose}>
                Cancelar
              </button>
              <button
                className={styles.btnPrimary}
                onClick={abrirVistaPrevia}
                disabled={!puedeGuardar || items.length === 0 || !clienteId}
                title={
                  !puedeGuardar
                    ? "Margen por debajo del mínimo. Solicita aprobación."
                    : undefined
                }
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
                {margen}%
                {margenBajoMinimo && " (aprobado por admin)"}
              </span>
            </p>

            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Cant.</th>
                  <th>Precio unit.</th>
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
                      <td>{item.cantidad}</td>
                      <td>{fmt(item.precio)}</td>
                      <td>{fmt(item.subtotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <h3 className={styles.total}>TOTAL: {fmt(total)}</h3>

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
