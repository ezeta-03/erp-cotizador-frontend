import { useEffect, useState, useCallback } from "react";
import {
  Plus, Minus, RefreshCw, X, Search, ClipboardList, PackageSearch, PackagePlus,
  FileStack, FileDown, Trash2, Inbox, Check,
} from "lucide-react";
import useAuth from "../auth/useAuth";
import {
  getItemsAlmacen, crearItemAlmacen,
  getMovimientos, registrarSalida,
  getOrdenes, crearOrdenAlmacen, descargarOrdenPdf,
  getSolicitudes, aprobarSolicitud, rechazarSolicitud,
} from "../api/almacen";
import { getClientes } from "../api/clientes";
import { getProyectos, getProyectosExternos } from "../api/proyectos";
import styles from "./almacen.module.scss";

const fmtMoney = (n) =>
  `S/ ${Number(n || 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtFecha = (iso) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
};

const TIPO_LABEL = {
  INSUMO: "Insumo",
  PRODUCTO_TERMINADO: "Producto terminado",
  HERRAMIENTA: "Herramienta",
  MAQUINARIA_EQUIPO: "Maquinaria y equipo",
  MUEBLE_ENSER: "Mueble y enser",
};
// Valor del inventario = stock × costo unitario, igual que la columna
// "VALOR DEL INVENTARIO" del Excel.
const valorInventario = (lista) => lista.reduce((s, i) => s + (i.stockActual || 0) * (i.costoUnitario || 0), 0);
const stockBajo = (i) => i.stockMinimo > 0 && i.stockActual <= i.stockMinimo;

const EMPRESA_LABEL = { BTL_OUTDOOR: "BTL / Outdoor", NETWISE: "Netwise" };
const EMPRESA_CORTA = { BTL_OUTDOOR: "BTL", NETWISE: "Netwise" };

/* ── Campo de formulario ────────────────────────────────────────────────── */
function F({ label, children, optional }) {
  return (
    <div className={styles.formField}>
      <label>{label}{optional && <span className={styles.opcional}> (opcional)</span>}</label>
      {children}
    </div>
  );
}

const ITEM_VACIO = {
  codigo: "", nombre: "", tipo: "INSUMO", empresa: "BTL_OUTDOOR", categoria: "", unidad: "",
  ubicacion: "", stockMinimo: "", stockMaximo: "", costoUnitario: "", proveedorNombre: "", observaciones: "",
};
const SALIDA_VACIA  = { productoId: "", clienteId: "", proyectoKey: "", cantidad: "", precioUnitario: "", precioFacturado: "", notas: "" };

// Un proyecto puede vivir solo como Proyecto interno del ERP, solo en
// seguimiento-actividades (todavía sin "stub"), o en ambos — esta clave
// combina las dos listas en un único selector, y al elegir se resuelve de
// vuelta a { proyectoId } o { proyectoExternoId } según corresponda.
function resolverProyectoPayload(proyectoKey, proyectoOptions) {
  const opcion = proyectoOptions.find((o) => o.key === proyectoKey);
  if (!opcion) return {};
  return {
    proyectoId: opcion.proyectoId || undefined,
    proyectoExternoId: opcion.proyectoExternoId || undefined,
  };
}

function construirProyectoOptions(internos, externos) {
  const opcionesInternas = internos.map((p) => ({
    key: `int-${p.id}`, proyectoId: p.id, proyectoExternoId: null,
    label: p.nombre,
  }));
  // Los que ya tienen Proyecto interno (proyectoInternoId) ya están arriba —
  // acá solo van los que viven únicamente en seguimiento-actividades.
  const opcionesExternas = externos
    .filter((p) => !p.proyectoInternoId)
    .map((p) => ({
      key: `ext-${p.id}`, proyectoId: null, proyectoExternoId: p.id,
      label: `${p.nombre} (Seguimiento de Actividades)`,
    }));
  return [...opcionesInternas, ...opcionesExternas];
}

function SelectorProyecto({ value, onChange, opciones }) {
  return (
    <select value={value} onChange={onChange}>
      <option value="">Sin proyecto directo</option>
      {opciones.map((o) => (
        <option key={o.key} value={o.key}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── Botón que abre el picker de ítems (reemplaza al <select> plano) ─────── */
function ItemPickerTrigger({ itemSel, onOpen, placeholder }) {
  return (
    <button type="button" className={styles.pickerTrigger} onClick={onOpen}>
      {itemSel ? (
        <span className={styles.pickerTriggerValor}>
          <span className={styles.itemCode}>{itemSel.codigo}</span> {itemSel.nombre}
        </span>
      ) : (
        <span className={styles.pickerPlaceholder}>{placeholder || "Selecciona un ítem"}</span>
      )}
      <Search size={14} />
    </button>
  );
}

const ORDEN_TIPOS_ITEM = ["INSUMO", "PRODUCTO_TERMINADO", "HERRAMIENTA", "MAQUINARIA_EQUIPO", "MUEBLE_ENSER"];

/* ── Modal: buscar ítems escribiendo, eligiendo o por Tipo (igual que el
   buscador de Productos BTL en Cotizaciones, pero sobre el catálogo de
   Almacén — agrupado por Tipo, la división más grande del catálogo, no por
   categoría, que es demasiado granular). En modo `multi` funciona como el
   carrito de una cotización: se van marcando varios ítems y recién se
   agregan todos juntos al confirmar — no hace falta abrir el buscador una
   vez por cada uno ────────────────────────────────────────────────────── */
function ItemPickerModal({ items, tipo, onSelect, onConfirmMultiple, onClose, onCrearNuevo, multi }) {
  const [busqueda, setBusqueda] = useState("");
  const [tipoItemFiltro, setTipoItemFiltro] = useState("TODOS");
  const [seleccionados, setSeleccionados] = useState(new Map());

  const tiposPresentes = ORDEN_TIPOS_ITEM.filter((t) => items.some((i) => i.tipo === t));
  const contPorTipo = {};
  items.forEach((i) => { contPorTipo[i.tipo] = (contPorTipo[i.tipo] || 0) + 1; });

  const q = busqueda.trim().toLowerCase();
  const filtrados = items.filter((i) => {
    const matchTexto = !q ||
      i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q) ||
      i.categoria?.toLowerCase().includes(q);
    const matchTipoItem = tipoItemFiltro === "TODOS" || i.tipo === tipoItemFiltro;
    return matchTexto && matchTipoItem;
  });

  const toggleSeleccionado = (item) => {
    setSeleccionados((prev) => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, item);
      return next;
    });
  };

  const handleClickItem = (item) => {
    if (multi) toggleSeleccionado(item);
    else onSelect(item);
  };

  const handleConfirmarMultiple = () => {
    onConfirmMultiple([...seleccionados.values()]);
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.formModal} style={{ maxWidth: 560 }}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{multi ? "Agregar ítems" : "Selecciona un ítem"}</h2>
          <button className={styles.btnClose} onClick={onClose}><X size={18} /></button>
        </div>

        <div className={styles.pickerBody}>
          <div className={styles.searchWrap}>
            <Search size={14} className={styles.searchIcon} />
            <input
              autoFocus
              className={styles.searchInput}
              placeholder="Buscar por código o nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className={styles.searchClear} onClick={() => setBusqueda("")}><X size={13} /></button>
            )}
          </div>

          <div className={styles.catFiltros}>
            <button
              type="button"
              className={`${styles.catChip} ${tipoItemFiltro === "TODOS" ? styles.catChipActive : ""}`}
              onClick={() => setTipoItemFiltro("TODOS")}
            >
              Todos
            </button>
            {tiposPresentes.map((t) => (
              <button
                key={t}
                type="button"
                className={`${styles.catChip} ${tipoItemFiltro === t ? styles.catChipActive : ""}`}
                onClick={() => setTipoItemFiltro(t)}
              >
                {TIPO_LABEL[t]} <span className={styles.catCount}>{contPorTipo[t]}</span>
              </button>
            ))}
          </div>

          {onCrearNuevo && (
            <button type="button" className={styles.btnAgregarLinea} onClick={onCrearNuevo}>
              <PackagePlus size={13} /> Crear nuevo ítem
            </button>
          )}

          <div className={styles.pickerList}>
            {filtrados.length === 0 ? (
              <p className={styles.empty}>Sin resultados{busqueda ? ` para "${busqueda}"` : ""}.</p>
            ) : (
              filtrados.slice(0, 40).map((i) => {
                const marcado = multi && seleccionados.has(i.id);
                return (
                  <button
                    key={i.id}
                    type="button"
                    className={`${styles.pickerItem} ${marcado ? styles.pickerItemMarcado : ""}`}
                    onClick={() => handleClickItem(i)}
                  >
                    {multi && (
                      <span className={`${styles.pickerCheck} ${marcado ? styles.pickerCheckOn : ""}`}>
                        {marcado && <Check size={12} />}
                      </span>
                    )}
                    <span className={styles.pickerItemInfo}>
                      <span className={styles.itemCode}>{i.codigo}</span>
                      <span className={styles.pickerItemNombre}>{i.nombre}</span>
                    </span>
                    <span className={styles.pickerItemMeta}>
                      {i.categoria && <span className={styles.pickerItemCategoria}>{i.categoria}</span>}
                      <span className={styles.badge}>{EMPRESA_CORTA[i.empresa]}</span>
                      {tipo === "SALIDA" && (
                        <span className={`${styles.stockBadge} ${i.stockActual <= 0 ? styles.stockBadgeVacio : ""}`}>
                          {i.stockActual} {i.unidad}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
            {filtrados.length > 40 && (
              <p className={styles.dropdownMore}>+{filtrados.length - 40} más — refina la búsqueda</p>
            )}
          </div>
        </div>

        {multi && (
          <div className={styles.formActions}>
            <span className={styles.finCalculado} style={{ marginRight: "auto" }}>
              {seleccionados.size} ítem{seleccionados.size !== 1 ? "s" : ""} seleccionado{seleccionados.size !== 1 ? "s" : ""}
            </span>
            <button type="button" className={styles.btnOutline} onClick={onClose}>Cancelar</button>
            <button type="button" className={styles.btnPrimary} onClick={handleConfirmarMultiple} disabled={seleccionados.size === 0}>
              Agregar {seleccionados.size > 0 ? seleccionados.size : ""}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Modal: nuevo ítem de catálogo (insumo o producto terminado) ─────────── */
function ItemFormModal({ onSave, onCancel }) {
  const [form, setForm] = useState(ITEM_VACIO);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.codigo || !form.nombre || !form.categoria || !form.unidad) {
      setError("Código, nombre, categoría y unidad son obligatorios.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        ...form,
        stockMinimo: form.stockMinimo || undefined,
        stockMaximo: form.stockMaximo || undefined,
        costoUnitario: form.costoUnitario || undefined,
        proveedorNombre: form.proveedorNombre || undefined,
        observaciones: form.observaciones || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al crear el ítem");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Nuevo ítem de almacén</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <div className={styles.formRow}>
            <F label="Empresa">
              <select value={form.empresa} onChange={set("empresa")}>
                <option value="BTL_OUTDOOR">BTL / Outdoor</option>
                <option value="NETWISE">Netwise</option>
              </select>
            </F>
            <F label="Tipo">
              <select value={form.tipo} onChange={set("tipo")}>
                <option value="INSUMO">Insumo</option>
                <option value="PRODUCTO_TERMINADO">Producto terminado</option>
                <option value="HERRAMIENTA">Herramienta</option>
                <option value="MAQUINARIA_EQUIPO">Maquinaria y equipo</option>
                <option value="MUEBLE_ENSER">Mueble y enser</option>
              </select>
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Código">
              <input value={form.codigo} onChange={set("codigo")} placeholder="Ej. ZOPEINS003-01" />
            </F>
            <F label="Unidad">
              <input value={form.unidad} onChange={set("unidad")} placeholder="Metro, Unidad, Plancha…" />
            </F>
          </div>

          <F label="Nombre">
            <input value={form.nombre} onChange={set("nombre")} placeholder="Ej. Vinil azul - MCCAL" />
          </F>

          <F label="Categoría">
            <input value={form.categoria} onChange={set("categoria")} placeholder="Ej. Vinil, PVC, Señalética 30x20…" />
          </F>

          <div className={styles.formRow}>
            <F label="Stock mínimo" optional>
              <input type="number" min="0" step="0.01" value={form.stockMinimo} onChange={set("stockMinimo")} placeholder="0" />
            </F>
            <F label="Stock máximo" optional>
              <input type="number" min="0" step="0.01" value={form.stockMaximo} onChange={set("stockMaximo")} placeholder="0" />
            </F>
          </div>

          <div className={styles.formRow}>
            <F label="Ubicación" optional>
              <input value={form.ubicacion} onChange={set("ubicacion")} placeholder="Almacen" />
            </F>
            <F label="Costo unitario (S/)" optional>
              <input type="number" min="0" step="0.01" value={form.costoUnitario} onChange={set("costoUnitario")} placeholder="0.00" />
            </F>
          </div>

          <F label="Proveedor habitual" optional>
            <input value={form.proveedorNombre} onChange={set("proveedorNombre")} placeholder="Nombre del proveedor" />
          </F>

          <F label="Observaciones" optional>
            <input value={form.observaciones} onChange={set("observaciones")} placeholder="Ej. casi nuevo, 1 dañado…" />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Crear ítem"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modal: registrar salida (venta / consumo de proyecto) ────────────── */
function SalidaFormModal({ items, clientes, proyectoOptions, onSave, onCancel }) {
  const [form, setForm] = useState(SALIDA_VACIA);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const itemSel = items.find((i) => String(i.id) === String(form.productoId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.productoId || !form.cantidad || form.precioUnitario === "") {
      setError("Ítem, cantidad y precio unitario son obligatorios.");
      return;
    }
    if (!form.proyectoKey) {
      setError("Toda salida debe estar anexada a un proyecto.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        productoId: Number(form.productoId),
        clienteId: form.clienteId ? Number(form.clienteId) : undefined,
        ...resolverProyectoPayload(form.proyectoKey, proyectoOptions),
        cantidad: Number(form.cantidad),
        precioUnitario: Number(form.precioUnitario),
        precioFacturado: form.precioFacturado !== "" ? Number(form.precioFacturado) : undefined,
        notas: form.notas || undefined,
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al registrar la salida");
      setSaving(false);
    }
  };

  const total = form.cantidad && form.precioUnitario ? Number(form.cantidad) * Number(form.precioUnitario) : 0;

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Registrar salida</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          <F label="Ítem">
            <ItemPickerTrigger itemSel={itemSel} onOpen={() => setShowPicker(true)} />
          </F>

          <F label="Proyecto">
            <SelectorProyecto value={form.proyectoKey} onChange={set("proyectoKey")} opciones={proyectoOptions} />
          </F>

          <F label="Cliente" optional>
            <select value={form.clienteId} onChange={set("clienteId")}>
              <option value="">Sin cliente directo</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombreComercial}</option>
              ))}
            </select>
          </F>

          <div className={styles.formRow}>
            <F label="Cantidad">
              <input type="number" min="0.01" step="0.01" value={form.cantidad} onChange={set("cantidad")} placeholder="30" />
            </F>
            <F label="Precio unitario (S/)">
              <input type="number" min="0" step="0.01" value={form.precioUnitario} onChange={set("precioUnitario")} placeholder="15.00" />
            </F>
          </div>

          <F label="Precio facturado (S/)" optional>
            <input type="number" min="0" step="0.01" value={form.precioFacturado} onChange={set("precioFacturado")} placeholder="Si difiere del total calculado" />
          </F>

          {total > 0 && <p className={styles.totalPreview}>Total: {fmtMoney(total)}</p>}

          <F label="Notas" optional>
            <input value={form.notas} onChange={set("notas")} placeholder="Referencia, motivo, etc." />
          </F>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : "Registrar salida"}
            </button>
          </div>
        </form>
      </div>

      {showPicker && (
        <ItemPickerModal
          items={items}
          tipo="SALIDA"
          onSelect={(i) => { setForm((f) => ({ ...f, productoId: i.id })); setShowPicker(false); }}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

const LINEA_VACIA = { itemAlmacenId: "", cantidad: "", precioUnitario: "" };
const lineaDeItem = (item) => ({ itemAlmacenId: String(item.id), cantidad: "1", precioUnitario: "" });

/* ── Modal: nueva orden / registrar entrada (varias líneas, como armar una
   cotización: primero el comprobante o los datos de cabecera, luego se
   eligen uno o varios ítems, y recién ahí se guarda) ─────────────────────
   Con `tipoFijo="ENTRADA"` este mismo formulario es el que abre el botón
   "Entrada" — una entrada también puede traer varios ítems bajo un solo
   comprobante, no tiene sentido que fuera de un solo ítem nada más. ────── */
function OrdenFormModal({ items, clientes, proyectoOptions, soloSalida, tipoFijo, onSave, onCancel, onCrearItem }) {
  const [tipo, setTipo] = useState(tipoFijo || "SALIDA");
  const [ordenServicio, setOrdenServicio] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [proyectoKey, setProyectoKey] = useState("");
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pickerLineaIdx, setPickerLineaIdx] = useState(null);
  const [showPickerMultiple, setShowPickerMultiple] = useState(false);
  const [nuevoItemLineaIdx, setNuevoItemLineaIdx] = useState(null);

  const setLinea = (idx, campo) => (e) => {
    const valor = e.target.value;
    setLineas((ls) => ls.map((l, i) => (i === idx ? { ...l, [campo]: valor } : l)));
  };
  const setLineaItem = (idx, itemId) => {
    setLineas((ls) => ls.map((l, i) => (i === idx ? { ...l, itemAlmacenId: itemId } : l)));
  };
  const quitarLinea = (idx) => setLineas((ls) => ls.filter((_, i) => i !== idx));

  // Elegir varios ítems de una pasada, como al armar una cotización: se
  // marcan varios en el buscador y acá se agregan todos juntos como líneas.
  const agregarVarios = (itemsElegidos) => {
    setLineas((ls) => [...ls, ...itemsElegidos.map(lineaDeItem)]);
    setShowPickerMultiple(false);
  };

  const handleCrearItemInline = async (payload) => {
    const nuevo = await onCrearItem(payload);
    setLineaItem(nuevoItemLineaIdx, String(nuevo.id));
    setNuevoItemLineaIdx(null);
  };

  const total = lineas.reduce((s, l) => s + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const lineasValidas = lineas.filter((l) => l.itemAlmacenId && l.cantidad);
    if (lineasValidas.length === 0) {
      setError("Agrega al menos un ítem con cantidad.");
      return;
    }
    if (tipo === "SALIDA" && !proyectoKey) {
      setError("Toda salida debe estar anexada a un proyecto.");
      return;
    }
    if (tipo === "ENTRADA" && !notas.trim()) {
      setError("Indica el N° de guía, factura o comprobante de esta entrada.");
      return;
    }
    setSaving(true);
    try {
      await onSave({
        tipo,
        ordenServicio: ordenServicio || undefined,
        clienteId: tipo === "SALIDA" && clienteId ? Number(clienteId) : undefined,
        ...(tipo === "SALIDA" ? resolverProyectoPayload(proyectoKey, proyectoOptions) : {}),
        notas: notas.trim() || undefined,
        items: lineasValidas.map((l) => ({
          itemAlmacenId: Number(l.itemAlmacenId),
          cantidad: Number(l.cantidad),
          precioUnitario: l.precioUnitario !== "" ? Number(l.precioUnitario) : undefined,
        })),
      });
    } catch (err) {
      setError(err.response?.data?.message ?? "Error al crear la orden");
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal} style={{ maxWidth: 640 }}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>{tipoFijo === "ENTRADA" ? "Registrar entrada" : "Nueva orden de almacén"}</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>

        <form className={styles.formBody} onSubmit={handleSubmit}>
          {error && <p className={styles.formError}>{error}</p>}

          {(!tipoFijo || tipo === "SALIDA") && (
            <div className={styles.formRow}>
              {!soloSalida && !tipoFijo && (
                <F label="Tipo">
                  <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    <option value="SALIDA">Salida</option>
                    <option value="ENTRADA">Entrada</option>
                  </select>
                </F>
              )}
              {tipo === "SALIDA" && (
                <F label="Orden de servicio" optional>
                  <input value={ordenServicio} onChange={(e) => setOrdenServicio(e.target.value)} placeholder="Ej. OS-2026-001" />
                </F>
              )}
            </div>
          )}

          {tipo === "SALIDA" && (
            <div className={styles.formRow}>
              <F label="Proyecto">
                <SelectorProyecto value={proyectoKey} onChange={(e) => setProyectoKey(e.target.value)} opciones={proyectoOptions} />
              </F>
              <F label="Cliente" optional>
                <select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Sin cliente directo</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombreComercial}</option>
                  ))}
                </select>
              </F>
            </div>
          )}

          {/* El comprobante va primero, como el número de cotización antes de
              elegir productos: sin él no tiene caso ni empezar a listar ítems. */}
          {tipo === "ENTRADA" && (
            <F label="N° de guía / factura / comprobante">
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. F001-00123" />
            </F>
          )}

          <F label={tipoFijo === "ENTRADA" ? "Ítems" : "Ítems de la orden"}>
            {lineas.length === 0 ? (
              <p className={styles.empty}>Agrega ítems para empezar.</p>
            ) : (
              <div className={styles.lineasWrap}>
                {lineas.map((l, idx) => {
                  const itemSel = items.find((i) => String(i.id) === String(l.itemAlmacenId));
                  return (
                    <div key={idx} className={styles.lineaRow}>
                      <ItemPickerTrigger itemSel={itemSel} onOpen={() => setPickerLineaIdx(idx)} />
                      <input
                        type="number" min="0.01" step="0.01" placeholder="Cant."
                        value={l.cantidad} onChange={setLinea(idx, "cantidad")}
                        title={itemSel?.unidad || ""}
                      />
                      <input
                        type="number" min="0" step="0.01" placeholder="P. unit."
                        value={l.precioUnitario} onChange={setLinea(idx, "precioUnitario")}
                      />
                      <button type="button" className={styles.btnQuitarLinea} onClick={() => quitarLinea(idx)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <button type="button" className={styles.btnAgregarLinea} onClick={() => setShowPickerMultiple(true)}>
              <Plus size={13} /> Agregar ítems
            </button>
          </F>

          {total > 0 && <p className={styles.totalPreview}>Total: {fmtMoney(total)}</p>}

          {tipo === "SALIDA" && (
            <F label="Notas" optional>
              <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Referencia, motivo, etc." />
            </F>
          )}

          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? "Guardando…" : tipoFijo === "ENTRADA" ? "Registrar entrada" : "Crear orden"}
            </button>
          </div>
        </form>
      </div>

      {pickerLineaIdx !== null && (
        <ItemPickerModal
          items={items}
          tipo={tipo}
          onSelect={(i) => { setLineaItem(pickerLineaIdx, String(i.id)); setPickerLineaIdx(null); }}
          onClose={() => setPickerLineaIdx(null)}
          onCrearNuevo={tipo === "ENTRADA" ? () => { setNuevoItemLineaIdx(pickerLineaIdx); setPickerLineaIdx(null); } : undefined}
        />
      )}

      {showPickerMultiple && (
        <ItemPickerModal
          items={items}
          tipo={tipo}
          multi
          onConfirmMultiple={agregarVarios}
          onClose={() => setShowPickerMultiple(false)}
        />
      )}

      {nuevoItemLineaIdx !== null && (
        <ItemFormModal onSave={handleCrearItemInline} onCancel={() => setNuevoItemLineaIdx(null)} />
      )}
    </div>
  );
}

/* ── Modal: motivo al rechazar una solicitud pendiente ─────────────────── */
function RechazarSolicitudModal({ onConfirm, onCancel }) {
  const [motivo, setMotivo] = useState("");
  const [saving, setSaving] = useState(false);

  const handleConfirmar = async () => {
    setSaving(true);
    try { await onConfirm(motivo.trim() || undefined); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className={styles.formModal}>
        <div className={styles.formHeader}>
          <h2 className={styles.formTitle}>Rechazar solicitud</h2>
          <button className={styles.btnClose} onClick={onCancel}><X size={18} /></button>
        </div>
        <div className={styles.formBody}>
          <F label="Motivo" optional>
            <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por qué se rechaza" />
          </F>
          <div className={styles.formActions}>
            <button type="button" className={styles.btnOutline} onClick={onCancel}>Cancelar</button>
            <button type="button" className={styles.btnPrimary} onClick={handleConfirmar} disabled={saving}>
              {saving ? "Rechazando…" : "Rechazar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Página principal ──────────────────────────────────────────────────── */
export default function Almacen() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");
  const isAdmin  = user?.role === "ADMIN";
  const isVentas = user?.role === "VENTAS";
  const puedeVerMovimientos = isAdmin; // backend: ADMIN + CONTABLE (CONTABLE aún no tiene esta ruta en el menú)
  const puedeVerOrdenes = isAdmin || isVentas;

  const [vista, setVista] = useState("stock");
  const [items, setItems] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [ordenes, setOrdenes] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [proyectoOptions, setProyectoOptions] = useState([]);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipoStock, setFiltroTipoStock] = useState("");
  const [filtroEmpresa, setFiltroEmpresa] = useState("");
  const [filtroCategoriaStock, setFiltroCategoriaStock] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [showEntrada, setShowEntrada] = useState(false);
  const [showSalida, setShowSalida] = useState(false);
  const [showOrden, setShowOrden] = useState(false);
  const [rechazandoId, setRechazandoId] = useState(null);

  const cargarTodo = useCallback(async () => {
    setLoading(true);
    try {
      const [its, movs, ords, clis, proys, proysExt, sols] = await Promise.all([
        getItemsAlmacen(),
        puedeVerMovimientos ? getMovimientos() : Promise.resolve([]),
        puedeVerOrdenes ? getOrdenes() : Promise.resolve([]),
        getClientes(),
        puedeVerOrdenes ? getProyectos() : Promise.resolve([]),
        // Si seguimiento-actividades/Firestore no responde, no debe tumbar
        // toda la carga de Almacén — el selector simplemente queda más corto.
        puedeVerOrdenes ? getProyectosExternos().catch(() => []) : Promise.resolve([]),
        puedeVerOrdenes ? getSolicitudes() : Promise.resolve([]),
      ]);
      setItems(its);
      setMovimientos(movs);
      setOrdenes(ords);
      setClientes(clis);
      setProyectoOptions(construirProyectoOptions(proys, proysExt));
      setSolicitudes(sols);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, [puedeVerMovimientos, puedeVerOrdenes]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const recargarMovimientos = async (tipo) => {
    if (!puedeVerMovimientos) return;
    try {
      setMovimientos(await getMovimientos(tipo ? { tipo } : undefined));
    } catch { /* silencioso */ }
  };

  const irAVista = (v) => {
    setVista(v);
    if (v === "movimientos") recargarMovimientos(filtroTipo);
  };

  const cambiarFiltroTipo = (tipo) => {
    setFiltroTipo(tipo);
    recargarMovimientos(tipo);
  };

  const q = busqueda.trim().toLowerCase();
  // Categorías (y sus conteos) respetan búsqueda/tipo/empresa, pero no la
  // categoría misma — así el desplegable siempre refleja lo que hay bajo los
  // demás filtros activos.
  const itemsPreCategoria = items.filter((i) => {
    if (filtroTipoStock && i.tipo !== filtroTipoStock) return false;
    if (filtroEmpresa && i.empresa !== filtroEmpresa) return false;
    if (!q) return true;
    return i.nombre?.toLowerCase().includes(q) ||
      i.codigo?.toLowerCase().includes(q) ||
      i.categoria?.toLowerCase().includes(q) ||
      i.departamento?.toLowerCase().includes(q);
  });
  const categoriasStock = [...new Set(itemsPreCategoria.map((i) => i.categoria || "General"))].sort();
  const contPorCategoriaStock = {};
  itemsPreCategoria.forEach((i) => {
    const c = i.categoria || "General";
    contPorCategoriaStock[c] = (contPorCategoriaStock[c] || 0) + 1;
  });
  const itemsFiltrados = itemsPreCategoria.filter(
    (i) => !filtroCategoriaStock || (i.categoria || "General") === filtroCategoriaStock
  );

  // Crear un ítem nuevo ya no es una acción aparte — vive dentro del flujo
  // de Entradas (single o por línea de Orden): crea el ítem, refresca el
  // catálogo en segundo plano, y devuelve el ítem para que el formulario que
  // lo llamó lo deje seleccionado de una.
  const handleCrearItemInline = async (payload) => {
    const nuevo = await crearItemAlmacen(payload);
    cargarTodo();
    return nuevo;
  };

  const handleSalida = async (payload) => {
    await registrarSalida(payload);
    setShowSalida(false);
    cargarTodo();
  };

  // Compartido entre "Entrada" y "Nueva orden" — ambas son, por dentro, el
  // mismo tipo de documento con una o varias líneas; solo cambia qué modal
  // hay que cerrar al terminar.
  const handleCrearOrden = async (payload, cerrar) => {
    const orden = await crearOrdenAlmacen(payload);
    cerrar();
    cargarTodo();
    try { await descargarOrdenPdf(orden.id, token); } catch { /* la orden ya quedó creada igual */ }
  };

  const handleAprobarSolicitud = async (id) => {
    await aprobarSolicitud(id);
    cargarTodo();
  };

  const handleRechazarSolicitud = async (motivo) => {
    await rechazarSolicitud(rechazandoId, motivo);
    setRechazandoId(null);
    cargarTodo();
  };

  const pendientesCount = solicitudes.filter((s) => s.estado === "PENDIENTE").length;

  const contraparte = (m) =>
    m.proveedor?.nombre || m.cliente?.nombreComercial || m.proyecto?.nombre || m.proyectoExternoId || "—";
  const contraparteOrden = (o) => o.cliente?.nombreComercial || o.proyecto?.nombre || o.proyectoExternoId || "—";

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Almacén</h1>
          <p className={styles.subtitle}>
            {loading ? "Cargando…" : `${items.length} ítem${items.length !== 1 ? "s" : ""} en catálogo · Valor del inventario ${fmtMoney(valorInventario(items))}`}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.btnOutline} onClick={cargarTodo} title="Actualizar"><RefreshCw size={16} /></button>
          {isAdmin && (
            <button className={styles.btnOutline} onClick={() => setShowEntrada(true)}>
              <Plus size={16} /> Entrada
            </button>
          )}
          {(isAdmin || isVentas) && (
            <button className={styles.btnPrimary} onClick={() => setShowSalida(true)}>
              <Minus size={16} /> Salida
            </button>
          )}
          {puedeVerOrdenes && (
            <button className={styles.btnOutline} onClick={() => setShowOrden(true)}>
              <FileStack size={16} /> Nueva orden
            </button>
          )}
        </div>
      </div>

      {(puedeVerMovimientos || puedeVerOrdenes) && (
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${vista === "stock" ? styles.tabActive : ""}`}
            onClick={() => irAVista("stock")}
          >
            <PackageSearch size={15} /> Stock
          </button>
          {puedeVerMovimientos && (
            <button
              className={`${styles.tab} ${vista === "movimientos" ? styles.tabActive : ""}`}
              onClick={() => irAVista("movimientos")}
            >
              <ClipboardList size={15} /> Movimientos
            </button>
          )}
          {puedeVerOrdenes && (
            <button
              className={`${styles.tab} ${vista === "ordenes" ? styles.tabActive : ""}`}
              onClick={() => irAVista("ordenes")}
            >
              <FileStack size={15} /> Órdenes
            </button>
          )}
          {puedeVerOrdenes && (
            <button
              className={`${styles.tab} ${vista === "solicitudes" ? styles.tabActive : ""}`}
              onClick={() => irAVista("solicitudes")}
            >
              <Inbox size={15} /> Solicitudes
              {pendientesCount > 0 && <span className={styles.tabBadge}>{pendientesCount}</span>}
            </button>
          )}
        </div>
      )}

      {vista === "stock" ? (
        <>
          <div className={styles.filtersBar}>
            <div className={styles.searchWrap}>
              <Search size={14} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Buscar por código, nombre, categoría…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button className={styles.searchClear} onClick={() => setBusqueda("")}>
                  <X size={13} />
                </button>
              )}
            </div>
            <select className={styles.filterSelect} value={filtroEmpresa} onChange={(e) => setFiltroEmpresa(e.target.value)}>
              <option value="">Todas las empresas</option>
              <option value="BTL_OUTDOOR">BTL / Outdoor</option>
              <option value="NETWISE">Netwise</option>
            </select>
            <select className={styles.filterSelect} value={filtroTipoStock} onChange={(e) => setFiltroTipoStock(e.target.value)}>
              <option value="">Todos los tipos</option>
              <option value="INSUMO">Insumos</option>
              <option value="PRODUCTO_TERMINADO">Productos terminados</option>
              <option value="HERRAMIENTA">Herramientas</option>
              <option value="MAQUINARIA_EQUIPO">Maquinaria y equipo</option>
              <option value="MUEBLE_ENSER">Muebles y enseres</option>
            </select>
            {/* Categorías en un desplegable (antes eran chips y con ~90
                categorías ocupaban media pantalla). Si la categoría elegida
                queda sin ítems por otro filtro, se sigue mostrando con 0. */}
            <select className={styles.filterSelect} value={filtroCategoriaStock} onChange={(e) => setFiltroCategoriaStock(e.target.value)}>
              <option value="">Todas las categorías ({itemsPreCategoria.length})</option>
              {filtroCategoriaStock && !categoriasStock.includes(filtroCategoriaStock) && (
                <option value={filtroCategoriaStock}>{filtroCategoriaStock} (0)</option>
              )}
              {categoriasStock.map((c) => (
                <option key={c} value={c}>{c} ({contPorCategoriaStock[c]})</option>
              ))}
            </select>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.empty}>Cargando stock…</p>
            ) : itemsFiltrados.length === 0 ? (
              <p className={styles.empty}>No hay ítems que coincidan.</p>
            ) : (
              <table className={`${styles.table} ${styles.tablaStock}`}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Ítem</th>
                    <th>Empresa</th>
                    <th>Tipo</th>
                    <th>Categoría</th>
                    <th>Ubicación</th>
                    <th>Unidad</th>
                    <th className={styles.num}>Stock actual</th>
                    <th className={styles.num} title="Stock mínimo / máximo">Mín / Máx</th>
                    <th className={styles.num}>Costo unit.</th>
                    <th className={styles.num}>Valor</th>
                    <th>Proveedor</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsFiltrados.map((i) => (
                    <tr key={i.id}>
                      <td>{i.codigo}</td>
                      <td>{i.nombre}</td>
                      <td>{EMPRESA_LABEL[i.empresa] || i.empresa}</td>
                      <td>
                        <span className={`${styles.badge} ${i.tipo === "INSUMO" ? styles.badgeEntrada : styles.badgeSalida}`}>
                          {TIPO_LABEL[i.tipo]}
                        </span>
                      </td>
                      <td>{i.categoria}</td>
                      <td>{i.ubicacion || "—"}</td>
                      <td>{i.unidad || "—"}</td>
                      <td className={styles.num}>
                        <span
                          className={`${styles.stockBadge} ${i.stockActual <= 0 ? styles.stockBadgeVacio : stockBajo(i) ? styles.stockBadgeBajo : ""}`}
                          title={stockBajo(i) && i.stockActual > 0 ? "Por debajo del stock mínimo" : undefined}
                        >
                          {i.stockActual}
                        </span>
                      </td>
                      <td className={`${styles.num} ${styles.tenue}`}>
                        {i.stockMinimo || i.stockMaximo ? `${i.stockMinimo} / ${i.stockMaximo}` : "—"}
                      </td>
                      <td className={styles.num}>{i.costoUnitario ? fmtMoney(i.costoUnitario) : "—"}</td>
                      <td className={styles.num}>{i.costoUnitario ? fmtMoney(i.stockActual * i.costoUnitario) : "—"}</td>
                      <td>{i.proveedorNombre || "—"}</td>
                      <td className={styles.observaciones} title={i.observaciones || undefined}>{i.observaciones || "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={10}>
                      Valor de los {itemsFiltrados.length} ítem{itemsFiltrados.length !== 1 ? "s" : ""} mostrados
                    </td>
                    <td className={styles.num}>{fmtMoney(valorInventario(itemsFiltrados))}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </>
      ) : vista === "movimientos" ? (
        <>
          <div className={styles.filtersBar}>
            <select className={styles.filterSelect} value={filtroTipo} onChange={(e) => cambiarFiltroTipo(e.target.value)}>
              <option value="">Todos los movimientos</option>
              <option value="ENTRADA">Solo entradas</option>
              <option value="SALIDA">Solo salidas</option>
            </select>
          </div>

          <div className={styles.tableContainer}>
            {loading ? (
              <p className={styles.empty}>Cargando movimientos…</p>
            ) : movimientos.length === 0 ? (
              <p className={styles.empty}>No hay movimientos registrados aún.</p>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Ítem</th>
                    <th>Cantidad</th>
                    <th>P. Unitario</th>
                    <th>Total</th>
                    <th>Contraparte</th>
                    <th>Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id}>
                      <td>{fmtFecha(m.fecha)}</td>
                      <td>
                        <span className={`${styles.badge} ${m.tipo === "ENTRADA" ? styles.badgeEntrada : styles.badgeSalida}`}>
                          {m.tipo}
                        </span>
                      </td>
                      <td>{m.item?.codigo} — {m.item?.nombre}</td>
                      <td>{m.cantidad}</td>
                      <td>{fmtMoney(m.precioUnitario)}</td>
                      <td>{fmtMoney(m.precioTotal)}</td>
                      <td>{contraparte(m)}</td>
                      <td>{m.usuario?.nombre || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : vista === "ordenes" ? (
        <div className={styles.tableContainer}>
          {loading ? (
            <p className={styles.empty}>Cargando órdenes…</p>
          ) : ordenes.length === 0 ? (
            <p className={styles.empty}>No hay órdenes registradas aún.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Orden de servicio</th>
                  <th>Contraparte</th>
                  <th>Ítems</th>
                  <th>Registrado por</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {ordenes.map((o) => (
                  <tr key={o.id}>
                    <td>{fmtFecha(o.fecha)}</td>
                    <td>
                      <span className={`${styles.badge} ${o.tipo === "ENTRADA" ? styles.badgeEntrada : styles.badgeSalida}`}>
                        {o.tipo}
                      </span>
                    </td>
                    <td>{o.ordenServicio || "—"}</td>
                    <td>{contraparteOrden(o)}</td>
                    <td>{o.items.length}</td>
                    <td>{o.usuario?.nombre || "—"}</td>
                    <td>
                      <button className={styles.btnGhost} onClick={() => descargarOrdenPdf(o.id, token)} title="Descargar PDF">
                        <FileDown size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className={styles.tableContainer}>
          {loading ? (
            <p className={styles.empty}>Cargando solicitudes…</p>
          ) : solicitudes.length === 0 ? (
            <p className={styles.empty}>No hay solicitudes desde seguimiento-actividades todavía.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Proyecto</th>
                  <th>Ítem</th>
                  <th>Cantidad</th>
                  <th>Solicitante</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {solicitudes.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtFecha(s.createdAt)}</td>
                    <td>{s.proyecto?.nombre || s.proyectoExternoId}</td>
                    <td>{s.item?.codigo} — {s.item?.nombre}</td>
                    <td>{s.cantidad} {s.item?.unidad}</td>
                    <td>{s.solicitanteEmail || "—"}</td>
                    <td>
                      <span className={`${styles.badge} ${
                        s.estado === "PENDIENTE" ? styles.badgeEntrada
                        : s.estado === "APROBADA" ? styles.stockBadge
                        : styles.stockBadgeVacio
                      }`}>
                        {s.estado}
                      </span>
                      {s.estado === "RECHAZADA" && s.motivoRechazo && (
                        <div className={styles.finCalculado}>{s.motivoRechazo}</div>
                      )}
                    </td>
                    <td>
                      {s.estado === "PENDIENTE" ? (
                        <div className={styles.tdActions}>
                          <button className={styles.btnGhost} onClick={() => handleAprobarSolicitud(s.id)} title="Aprobar">
                            <Check size={15} />
                          </button>
                          <button className={styles.btnDelete} onClick={() => setRechazandoId(s.id)} title="Rechazar">
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className={styles.finCalculado}>{s.resueltoPor?.nombre || "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showEntrada && (
        <OrdenFormModal
          items={items.filter((i) => i.activo)}
          clientes={clientes}
          proyectoOptions={proyectoOptions}
          tipoFijo="ENTRADA"
          onSave={(payload) => handleCrearOrden(payload, () => setShowEntrada(false))}
          onCancel={() => setShowEntrada(false)}
          onCrearItem={handleCrearItemInline}
        />
      )}

      {showSalida && (
        <SalidaFormModal
          items={items.filter((i) => i.activo)}
          clientes={clientes}
          proyectoOptions={proyectoOptions}
          onSave={handleSalida}
          onCancel={() => setShowSalida(false)}
        />
      )}

      {showOrden && (
        <OrdenFormModal
          items={items.filter((i) => i.activo)}
          clientes={clientes}
          proyectoOptions={proyectoOptions}
          soloSalida={!isAdmin}
          onSave={(payload) => handleCrearOrden(payload, () => setShowOrden(false))}
          onCancel={() => setShowOrden(false)}
          onCrearItem={handleCrearItemInline}
        />
      )}

      {rechazandoId && (
        <RechazarSolicitudModal
          onConfirm={handleRechazarSolicitud}
          onCancel={() => setRechazandoId(null)}
        />
      )}
    </div>
  );
}
