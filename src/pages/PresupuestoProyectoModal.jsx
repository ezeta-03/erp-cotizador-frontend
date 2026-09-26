import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Save, Plus, Trash2 } from "lucide-react";
import { getPresupuestoProyecto, guardarPresupuestoProyecto } from "../api/proyectos";
import { CATEGORIAS_PRESUPUESTO, UNIDADES_PRESUPUESTO, calcularRentabilidad } from "../constants/presupuesto";
import styles from "./presupuestoProyecto.module.scss";

const fmtNum = (n) => Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Igual que el Excel: los montos en cero se muestran como "-".
const fmtMonto = (n) => (Number(n) ? `S/ ${fmtNum(n)}` : "-");
const fmtPct = (n) => (n === null || !Number.isFinite(n) ? "-" : `${(n * 100).toFixed(1)}%`);
const aFechaInput = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

let siguienteKey = 1;
const conKey = (item) => ({ ...item, _key: siguienteKey++ });

/* ── Hoja "Presupuesto y control de costos — BTL & Producción" de un proyecto ── */
export default function PresupuestoProyectoModal({ proyectoId, puedeEditar, onClose }) {
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [proyecto, setProyecto] = useState(null);
  const [guardado, setGuardado] = useState(false);
  const [cabecera, setCabecera] = useState(null);
  const [items, setItems] = useState([]);
  const [sucio, setSucio] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [aviso, setAviso] = useState("");
  const avisoTimer = useRef(null);

  const cargar = (data) => {
    setProyecto(data.proyecto);
    setGuardado(data.guardado);
    setCabecera({
      fecha: aFechaInput(data.fecha),
      responsable: data.responsable || "",
      tipoServicio: data.tipoServicio || "",
      numeroCotizacion: data.numeroCotizacion || "",
      margen: data.margen ?? 45,
      precioNegociado: data.precioNegociado ?? "",
    });
    setItems(data.items.map(conKey));
    setSucio(false);
  };

  useEffect(() => {
    let activo = true;
    getPresupuestoProyecto(proyectoId)
      .then((data) => activo && cargar(data))
      .catch((err) => activo && setError(err.response?.data?.message ?? "No se pudo cargar el presupuesto"))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; clearTimeout(avisoTimer.current); };
  }, [proyectoId]);

  const setCampo = (campo, valor) => {
    setCabecera((c) => ({ ...c, [campo]: valor }));
    setSucio(true);
  };

  const setItem = (key, campo, valor) => {
    setItems((lista) => lista.map((it) => (it._key === key ? { ...it, [campo]: valor } : it)));
    setSucio(true);
  };

  const agregarFila = (categoria) => {
    setItems((lista) => {
      // La fila nueva va al final de su sección, no al final de la hoja.
      const ultimo = lista.map((it) => it.categoria).lastIndexOf(categoria);
      const nueva = conKey({ categoria, descripcion: "", unidad: "unid.", cantidad: 0, precioUnitario: 0 });
      const copia = [...lista];
      copia.splice(ultimo + 1, 0, nueva);
      return copia;
    });
    setSucio(true);
  };

  const quitarFila = (key) => {
    setItems((lista) => lista.filter((it) => it._key !== key));
    setSucio(true);
  };

  const totalFila = (it) => Number(it.cantidad || 0) * Number(it.precioUnitario || 0);
  const costoDirecto = useMemo(() => items.reduce((s, it) => s + totalFila(it), 0), [items]);
  const r = calcularRentabilidad(costoDirecto, cabecera?.margen ?? 0, cabecera?.precioNegociado);

  const handleGuardar = async () => {
    setError("");
    const margen = Number(cabecera.margen);
    if (!Number.isFinite(margen) || margen < 0 || margen >= 100) {
      setError("El margen debe estar entre 0% y 99.99%.");
      return;
    }
    if (items.some((it) => !String(it.descripcion).trim())) {
      setError("Hay filas sin descripción — complétalas o quítalas.");
      return;
    }
    setGuardando(true);
    try {
      const data = await guardarPresupuestoProyecto(proyectoId, {
        ...cabecera,
        fecha: cabecera.fecha || null,
        margen,
        precioNegociado: cabecera.precioNegociado === "" ? null : Number(cabecera.precioNegociado),
        items: items.map(({ categoria, descripcion, unidad, cantidad, precioUnitario }) => ({
          categoria, descripcion, unidad, cantidad: Number(cantidad || 0), precioUnitario: Number(precioUnitario || 0),
        })),
      });
      cargar(data);
      setAviso("Presupuesto guardado");
      clearTimeout(avisoTimer.current);
      avisoTimer.current = setTimeout(() => setAviso(""), 2500);
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al guardar el presupuesto");
    } finally {
      setGuardando(false);
    }
  };

  const handleCerrar = () => {
    if (sucio && puedeEditar && !window.confirm("Hay cambios sin guardar en el presupuesto. ¿Cerrar de todas formas?")) return;
    onClose();
  };

  // El PDF sale del diálogo de impresión del navegador ("Guardar como PDF");
  // el título del documento es el nombre sugerido del archivo.
  const handleImprimir = () => {
    const tituloOriginal = document.title;
    document.title = `Presupuesto - ${proyecto?.nombre || "Proyecto"}`;
    window.print();
    document.title = tituloOriginal;
  };

  const soloLectura = !puedeEditar;

  // Portal directo al <body>: al imprimir se oculta todo lo demás del body
  // (ver @media print), así el PDF sale solo con la hoja y sin páginas en blanco.
  return createPortal(
    <div className={`${styles.overlay} presupuesto-print-root`} onClick={(e) => e.target === e.currentTarget && handleCerrar()}>
      <div className={styles.card}>
        <div className={`${styles.barra} ${styles.noPrint}`}>
          <div>
            <h3>Presupuesto del proyecto</h3>
            <p className={styles.barraSub}>
              {proyecto?.nombre || "Cargando…"}
              {!cargando && !guardado && " · Borrador sin guardar (precargado del catálogo)"}
              {sucio && guardado && " · Cambios sin guardar"}
            </p>
          </div>
          <div className={styles.barraAcciones}>
            {aviso && <span className={styles.aviso}>{aviso}</span>}
            <button className={styles.btnOutline} onClick={handleImprimir} disabled={cargando}>
              <Printer size={16} /> Imprimir / PDF
            </button>
            {puedeEditar && (
              <button className={styles.btnPrimary} onClick={handleGuardar} disabled={cargando || guardando}>
                <Save size={16} /> {guardando ? "Guardando…" : "Guardar"}
              </button>
            )}
            <button className={styles.btnClose} onClick={handleCerrar}><X size={18} /></button>
          </div>
        </div>

        <div className={styles.scroll}>
          {error && <p className={`${styles.error} ${styles.noPrint}`}>{error}</p>}
          {cargando || !cabecera ? (
            <p className={styles.cargando}>Cargando presupuesto…</p>
          ) : (
            <div className={styles.hoja}>
              {/* ── Datos del proyecto ── */}
              <div className={styles.bloque}>
                <div className={styles.tituloPrincipal}>PRESUPUESTO Y CONTROL DE COSTOS — BTL &amp; PRODUCCIÓN</div>
                <div className={styles.tituloSeccion}>DATOS DEL PROYECTO</div>
                <div className={styles.datos}>
                  <label>Cliente:</label>
                  <span>{proyecto?.cliente?.nombreComercial || "—"}</span>
                  <label>Fecha:</label>
                  <input type="date" value={cabecera.fecha} onChange={(e) => setCampo("fecha", e.target.value)} disabled={soloLectura} />

                  <label>Nombre del proyecto:</label>
                  <span>{proyecto?.nombre}</span>
                  <label>Responsable:</label>
                  <input value={cabecera.responsable} onChange={(e) => setCampo("responsable", e.target.value)} disabled={soloLectura} />

                  <label>Tipo de servicio:</label>
                  <input value={cabecera.tipoServicio} onChange={(e) => setCampo("tipoServicio", e.target.value)} disabled={soloLectura} placeholder={soloLectura ? "" : "Ej. Activación BTL"} />
                  <label>N° Cotización:</label>
                  <input value={cabecera.numeroCotizacion} onChange={(e) => setCampo("numeroCotizacion", e.target.value)} disabled={soloLectura} />
                </div>
              </div>

              {/* ── Costos directos ── */}
              <div className={styles.bloque}>
                <div className={styles.bandaVerde} />
                <table className={styles.tabla}>
                  <colgroup>
                    <col className={styles.colDesc} />
                    <col className={styles.colUnidad} />
                    <col className={styles.colCant} />
                    <col className={styles.colPrecio} />
                    <col className={styles.colTotal} />
                    {puedeEditar && <col className={`${styles.colAccion} ${styles.noPrint}`} />}
                  </colgroup>
                  <tbody>
                    {CATEGORIAS_PRESUPUESTO.map((cat, i) => {
                      const filas = items.filter((it) => it.categoria === cat.codigo);
                      return (
                        <SeccionFilas
                          key={cat.codigo}
                          titulo={cat.titulo}
                          conEncabezados={i === 0}
                          filas={filas}
                          puedeEditar={puedeEditar}
                          totalFila={totalFila}
                          onCambiar={setItem}
                          onQuitar={quitarFila}
                          onAgregar={() => agregarFila(cat.codigo)}
                        />
                      );
                    })}
                    <tr className={styles.filaTotal}>
                      <td colSpan={4}>TOTAL COSTOS DIRECTOS</td>
                      <td>
                        <span className={styles.monto}><span>S/</span><span>{fmtNum(costoDirecto)}</span></span>
                      </td>
                      {puedeEditar && <td className={styles.noPrint} />}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── Rentabilidad ── */}
              <div className={`${styles.bloque} ${styles.rentabilidad}`}>
                <div className={styles.tituloPrincipal}>DETERMINACIÓN DE PRECIO Y RENTABILIDAD</div>
                <div className={styles.filaRent}>
                  <span>Margen de rentabilidad deseado (%)</span>
                  <span className={`${styles.valorInput} ${styles.celdaMargen}`}>
                    <NumInput
                      min="0" max="99.99" step="0.01"
                      value={cabecera.margen}
                      placeholder="0.00"
                      onChange={(v) => setCampo("margen", v)}
                      disabled={soloLectura}
                    />
                    <b>%</b>
                  </span>
                </div>
                <FilaMonto etiqueta="Precio de venta sugerido (S/.)" valor={r.precioSugerido} />
                <FilaMonto etiqueta="Utilidad bruta 1 (S/.)" valor={r.utilidad1} />
                <div className={`${styles.filaRent} ${styles.filaNegociado}`}>
                  <span>Precio negociado / aprobado (S/.)</span>
                  <span className={styles.monto}>
                    <span>S/</span>
                    <NumInput
                      min="0" step="0.01"
                      value={cabecera.precioNegociado}
                      onChange={(v) => setCampo("precioNegociado", v)}
                      disabled={soloLectura}
                      placeholder="0.00"
                    />
                  </span>
                </div>
              </div>

              <div className={`${styles.bloque} ${styles.rentabilidad}`}>
                <FilaMonto etiqueta="Utilidad bruta 2 (S/.)" valor={r.utilidad2} />
                <div className={styles.filaRent}>
                  <span>Margen real sobre venta (%)</span>
                  <span className={styles.centro}>{fmtPct(r.margenReal)}</span>
                </div>
                <div className={styles.filaRent}>
                  <span>Markup sobre costo (%)</span>
                  <span className={styles.centro}>{fmtPct(r.markup)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <datalist id="unidades-presupuesto">
        {UNIDADES_PRESUPUESTO.map((u) => <option key={u} value={u} />)}
      </datalist>
    </div>,
    document.body
  );
}

function SeccionFilas({ titulo, conEncabezados, filas, puedeEditar, totalFila, onCambiar, onQuitar, onAgregar }) {
  const ro = !puedeEditar;
  return (
    <>
      <tr className={styles.filaCategoria}>
        <td colSpan={conEncabezados ? 1 : 5}>{titulo.toUpperCase()}</td>
        {conEncabezados ? (
          <>
            <td>UNIDAD MEDIDA</td>
            <td className={styles.centro}>CANTIDAD</td>
            <td className={styles.centro}>PRECIO UNITARIO</td>
            <td className={styles.centro}>TOTAL</td>
          </>
        ) : null}
        {puedeEditar && <td className={styles.noPrint} />}
      </tr>
      {filas.map((it) => (
        <tr key={it._key} className={styles.fila}>
          <td>
            <input value={it.descripcion} onChange={(e) => onCambiar(it._key, "descripcion", e.target.value)} disabled={ro} placeholder="Descripción" />
          </td>
          <td>
            <input value={it.unidad} list="unidades-presupuesto" onChange={(e) => onCambiar(it._key, "unidad", e.target.value)} disabled={ro} />
          </td>
          <td className={styles.celdaInput}>
            <NumInput
              min="0" step="any" decimales={0}
              className={styles.centro}
              value={it.cantidad}
              placeholder="0"
              onChange={(v) => onCambiar(it._key, "cantidad", v === "" ? 0 : v)}
              disabled={ro}
            />
          </td>
          <td className={styles.celdaInput}>
            <span className={styles.monto}>
              <span>S/</span>
              <NumInput
                min="0" step="0.01"
                value={it.precioUnitario}
                placeholder="-"
                onChange={(v) => onCambiar(it._key, "precioUnitario", v === "" ? 0 : v)}
                disabled={ro}
              />
            </span>
          </td>
          <td className={styles.derecha}>{fmtMonto(totalFila(it))}</td>
          {puedeEditar && (
            <td className={`${styles.noPrint} ${styles.celdaAccion}`}>
              <button className={styles.btnQuitar} onClick={() => onQuitar(it._key)} title="Quitar fila"><Trash2 size={14} /></button>
            </td>
          )}
        </tr>
      ))}
      {puedeEditar && (
        <tr className={styles.noPrint}>
          <td colSpan={6} className={styles.celdaAgregar}>
            <button className={styles.btnAgregar} onClick={onAgregar}><Plus size={14} /> Agregar fila</button>
          </td>
        </tr>
      )}
    </>
  );
}

// Input numérico que, sin foco, muestra el valor con formato (1,500.00) como
// el Excel; al enfocarlo vuelve al número crudo para editarlo.
function NumInput({ value, onChange, decimales = 2, placeholder, ...rest }) {
  const [enfocado, setEnfocado] = useState(false);
  const vacio = value === "" || value === null || value === undefined || Number(value) === 0;
  // Con foco se respeta lo que se va tipeando ("0.", "0.5"); solo el 0
  // numérico guardado se muestra vacío.
  const mostrado = enfocado
    ? (value === 0 || value === null || value === undefined ? "" : value)
    : (vacio ? "" : Number(value).toLocaleString("es-PE", { minimumFractionDigits: decimales, maximumFractionDigits: decimales }));
  return (
    <input
      {...rest}
      type={enfocado ? "number" : "text"}
      inputMode="decimal"
      value={mostrado}
      placeholder={placeholder}
      onFocus={() => setEnfocado(true)}
      onBlur={() => setEnfocado(false)}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function FilaMonto({ etiqueta, valor }) {
  return (
    <div className={styles.filaRent}>
      <span>{etiqueta}</span>
      <span className={styles.monto}>
        <span>S/</span>
        <span>{valor === null ? "-" : fmtNum(valor)}</span>
      </span>
    </div>
  );
}
