import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw, ShoppingCart } from "lucide-react";
import { Badge, Button, Table } from "../components/ui";
import useAuth from "../auth/useAuth";
import { getOrdenesCompra, getSugerenciasCompra } from "../api/compras";
import { monto } from "../utils/formato";
import { useToast } from "../coomponents/Toast";
import Spinner from "../coomponents/Spinner";
import OrdenCompraDrawer from "../coomponents/OrdenCompraDrawer";
import { ESTADO_OC, ESTADO_PAGO_OC } from "../constants/compras";
import styles from "./cuentas.module.scss";

const PROPUESTOS = 3;
const fechaCorta = (iso) => (iso ? new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const chip = (activo) => ({
  padding: "0.3rem 0.75rem", borderRadius: 999, cursor: "pointer", fontSize: "var(--text-xs)",
  border: `1px solid ${activo ? "var(--color-accent)" : "var(--color-border)"}`,
  background: activo ? "var(--color-accent)" : "var(--color-surface)",
  color: activo ? "var(--color-on-accent)" : "var(--color-text2)",
});
const FILTROS = [
  ["", "Todas"], ["PENDIENTE", "Por validar"], ["APROBADA", "Aprobadas"], ["RECIBIDA_PARCIAL", "Recibidas en parte"],
  ["RECIBIDA", "Recibidas"], ["BORRADOR", "Borradores"], ["RECHAZADA", "Rechazadas"], ["ANULADA", "Anuladas"],
];

// Proveedores propuestos de un ítem, del más barato al más caro, con aviso si faltan.
function Propuestos({ proveedores = [] }) {
  return (
    <div style={{ display: "grid", gap: "0.1rem" }}>
      {proveedores.map((p) => (
        <span key={p.proveedorId} style={{ fontSize: "var(--text-xs)" }}>
          {p.proveedor.razonSocial} · <strong>{monto(p.precio, p.moneda)}</strong>
        </span>
      ))}
      {proveedores.length < PROPUESTOS && <span><Badge tone="yellow">{proveedores.length}/{PROPUESTOS} propuestos</Badge></span>}
    </div>
  );
}

// Prellenado de una orden: proveedor más barato del primer ítem y sus líneas.
const ordenDesde = (lineas, proyectoId = null) => ({
  proveedorId: lineas[0]?.proveedores?.[0]?.proveedorId || null,
  proyectoId,
  items: lineas.map((l) => ({ itemAlmacenId: l.itemAlmacenId, cantidad: l.cantidad, solicitudAlmacenId: l.solicitudAlmacenId || null })),
});

// Compras: órdenes de compra (generar, validar en Finanzas, recibir, pagar vía
// Por pagar) y qué comprar (ítems bajo su stock mínimo y solicitudes sin stock).
export default function Compras() {
  const { user } = useAuth();
  const esFinanzas = ["ADMIN", "CONTABLE"].includes(user?.role);
  const [vista, setVista] = useState(esFinanzas ? "ORDENES" : "SUGERENCIAS");
  const [filtro, setFiltro] = useState(esFinanzas ? "PENDIENTE" : "");
  const [buscar, setBuscar] = useState("");
  const [datos, setDatos] = useState(null);
  const [sugerencias, setSugerencias] = useState(null);
  const [error, setError] = useState(null);
  const [drawer, setDrawer] = useState(null); // { ordenId } | { inicial }
  const [marcados, setMarcados] = useState(() => new Set());
  const { show: showToast, ToastNode } = useToast();

  const cargar = useCallback(() => {
    setError(null);
    getOrdenesCompra({ estado: filtro || undefined, buscar: buscar.trim() || undefined })
      .then(setDatos)
      .catch((err) => setError(err.response?.data?.message || "No se pudieron cargar las órdenes de compra"));
  }, [filtro, buscar]);
  const cargarSugerencias = useCallback(() => {
    getSugerenciasCompra().then(setSugerencias).catch(() => setSugerencias({ stockBajo: [], solicitudes: [] }));
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, buscar ? 300 : 0);
    return () => clearTimeout(t);
  }, [cargar, buscar]);
  useEffect(() => { cargarSugerencias(); }, [cargarSugerencias]);

  const alCambiar = () => {
    cargar();
    cargarSugerencias();
  };

  const porEstado = datos?.porEstado || {};
  const columnas = [
    { key: "numero", label: "Orden", render: (o) => (
      <>
        <strong>{o.numero}</strong>
        <div className={styles.sub}>{fechaCorta(o.createdAt)} · {o.creadoPor?.nombre}</div>
      </>
    ) },
    { key: "proveedor", label: "Proveedor", render: (o) => o.proveedor.razonSocial },
    { key: "items", label: "Ítems", render: (o) => (
      <span className={styles.sub}>
        {o.items.slice(0, 2).map((l) => `${l.item.nombre} × ${l.cantidad}`).join(", ")}{o.items.length > 2 ? ` y ${o.items.length - 2} más` : ""}
      </span>
    ) },
    { key: "total", label: "Total", align: "right", render: (o) => <strong>{monto(o.total, o.moneda)}</strong> },
    { key: "estado", label: "Estado", render: (o) => (
      <div style={{ display: "grid", gap: "0.2rem", justifyItems: "start" }}>
        <Badge tone={ESTADO_OC[o.estado][1]} dot>{ESTADO_OC[o.estado][0]}</Badge>
        {o.faltanCotizaciones.length > 0 && ["BORRADOR", "PENDIENTE"].includes(o.estado) && <Badge tone="yellow">Faltan cotizaciones</Badge>}
      </div>
    ) },
    { key: "pago", label: "Pago", render: (o) => (["APROBADA", "RECIBIDA_PARCIAL", "RECIBIDA"].includes(o.estado)
      ? <Badge tone={ESTADO_PAGO_OC[o.pago.estado][1]}>{ESTADO_PAGO_OC[o.pago.estado][0]}</Badge>
      : <span className={styles.sub}>—</span>) },
    { key: "ver", label: "", render: (o) => (
      <Button size="sm" variant={o.estado === "PENDIENTE" && esFinanzas && o.creadoPorId !== user?.id ? "primary" : "ghost"}
        onClick={() => setDrawer({ ordenId: o.id })}>
        {o.estado === "PENDIENTE" && esFinanzas && o.creadoPorId !== user?.id ? "Validar" : "Ver"}
      </Button>
    ) },
  ];

  const enCurso = (lista) => (lista?.length
    ? lista.map((o) => <Badge key={o.id} tone={ESTADO_OC[o.estado][1]}>{o.numero}</Badge>)
    : null);
  const alternar = (clave) => setMarcados((s) => {
    const n = new Set(s);
    if (n.has(clave)) n.delete(clave);
    else n.add(clave);
    return n;
  });
  const lineasStock = (sugerencias?.stockBajo || []).map((i) => ({
    clave: `I${i.id}`, itemAlmacenId: i.id, cantidad: i.sugerido || 1, proveedores: i.proveedores,
  }));
  const generarMarcadas = () => {
    const lineas = lineasStock.filter((l) => marcados.has(l.clave));
    if (!lineas.length) return;
    setDrawer({ inicial: ordenDesde(lineas) });
    setMarcados(new Set());
  };

  return (
    <>
      {ToastNode}
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.heading}>Compras</h2>
            <p className={styles.subtitle}>Órdenes de compra con validación de Finanzas, recepción en almacén y pago vía Por pagar</p>
          </div>
          <div className={styles.acciones}>
            <Button variant="secondary" icon={RefreshCw} onClick={alCambiar} aria-label="Actualizar" />
            <Button icon={Plus} onClick={() => setDrawer({ inicial: null })}>Nueva orden</Button>
          </div>
        </div>

        <div className={styles.kpis}>
          <div className={`${styles.kpi} ${porEstado.PENDIENTE ? styles.kpiAlerta : ""}`}>
            <p className={styles.kpiLabel}>Por validar</p>
            <p className={styles.kpiValor}>{porEstado.PENDIENTE || 0}</p>
            <p className={styles.kpiNota}>Esperan aprobación de Finanzas</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Por recibir</p>
            <p className={styles.kpiValor}>{(porEstado.APROBADA || 0) + (porEstado.RECIBIDA_PARCIAL || 0)}</p>
            <p className={styles.kpiNota}>Aprobadas, falta que llegue la mercadería</p>
          </div>
          <div className={styles.kpi}>
            <p className={styles.kpiLabel}>Qué comprar</p>
            <p className={styles.kpiValor}>{sugerencias ? sugerencias.stockBajo.length + sugerencias.solicitudes.length : "…"}</p>
            <p className={styles.kpiNota}>Stock bajo y solicitudes sin stock</p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button type="button" className={`${styles.tab} ${vista === "ORDENES" ? styles.tabActivo : ""}`} onClick={() => setVista("ORDENES")}>Órdenes de compra</button>
          <button type="button" className={`${styles.tab} ${vista === "SUGERENCIAS" ? styles.tabActivo : ""}`} onClick={() => setVista("SUGERENCIAS")}>Qué comprar</button>
          {vista === "ORDENES" && (
            <input className={styles.buscar} placeholder="Buscar número, proveedor o ítem..." value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          )}
        </div>

        {vista === "ORDENES" ? (
          <>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
              {FILTROS.map(([k, label]) => (
                <button key={k} type="button" style={chip(filtro === k)} onClick={() => setFiltro(k)}>
                  {label}{k && porEstado[k] ? ` (${porEstado[k]})` : ""}
                </button>
              ))}
            </div>
            {error ? <p className={styles.error}>{error}</p> : !datos ? (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Cargando órdenes...</div>
            ) : (
              <Table columns={columnas} rows={datos.ordenes} rowKey="id"
                empty={filtro === "PENDIENTE" ? "No hay órdenes por validar" : "No hay órdenes de compra"} />
            )}
          </>
        ) : !sugerencias ? (
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}><Spinner size={18} /> Calculando qué comprar...</div>
        ) : (
          <>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "0 0 0.5rem", flexWrap: "wrap" }}>
              <Badge tone="orange">Stock bajo el mínimo</Badge>
              <span className={styles.sub}>Cantidad sugerida para llegar al stock máximo</span>
              {marcados.size > 0 && (
                <Button size="sm" icon={ShoppingCart} style={{ marginLeft: "auto" }} onClick={generarMarcadas}>
                  Orden con {marcados.size} ítem{marcados.size !== 1 ? "s" : ""}
                </Button>
              )}
            </div>
            <Table rowKey="id" rows={sugerencias.stockBajo} empty="Ningún ítem está bajo su stock mínimo" columns={[
              { key: "sel", label: "", render: (i) => (
                <input type="checkbox" aria-label={`Marcar ${i.nombre}`} checked={marcados.has(`I${i.id}`)} onChange={() => alternar(`I${i.id}`)} />
              ) },
              { key: "nombre", label: "Ítem", render: (i) => <><strong>{i.nombre}</strong><div className={styles.sub}>{i.codigo}</div></> },
              { key: "stock", label: "Stock / mín.", align: "right", render: (i) => `${i.stockActual} / ${i.stockMinimo} ${i.unidad}` },
              { key: "sugerido", label: "Sugerido", align: "right", render: (i) => <strong>{i.sugerido}</strong> },
              { key: "prov", label: "Proveedores propuestos", render: (i) => <Propuestos proveedores={i.proveedores} /> },
              { key: "oc", label: "", render: (i) => enCurso(i.ordenesEnCurso) || (
                <Button size="sm" variant="ghost" icon={ShoppingCart}
                  onClick={() => setDrawer({ inicial: ordenDesde([{ itemAlmacenId: i.id, cantidad: i.sugerido || 1, proveedores: i.proveedores }]) })}>
                  Orden
                </Button>
              ) },
            ]} />

            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", margin: "1.25rem 0 0.5rem" }}>
              <Badge tone="blue">Solicitudes de almacén sin stock</Badge>
              <span className={styles.sub}>Pendientes cuya cantidad supera el stock actual</span>
            </div>
            <Table rowKey="id" rows={sugerencias.solicitudes} empty="No hay solicitudes pendientes sin stock" columns={[
              { key: "fecha", label: "Fecha", render: (s) => fechaCorta(s.createdAt) },
              { key: "proyecto", label: "Proyecto", render: (s) => s.proyecto?.nombre || s.proyectoExternoId },
              { key: "item", label: "Ítem", render: (s) => <><strong>{s.item.nombre}</strong><div className={styles.sub}>{s.item.codigo}</div></> },
              { key: "cant", label: "Pedido / falta", align: "right", render: (s) => `${s.cantidad} / ${s.faltante} ${s.item.unidad}` },
              { key: "prov", label: "Proveedores propuestos", render: (s) => <Propuestos proveedores={s.item.proveedores} /> },
              { key: "oc", label: "", render: (s) => enCurso(s.ordenesEnCurso) || (
                <Button size="sm" variant="ghost" icon={ShoppingCart}
                  onClick={() => setDrawer({ inicial: ordenDesde([{ itemAlmacenId: s.item.id, cantidad: s.faltante, solicitudAlmacenId: s.id, proveedores: s.item.proveedores }], s.proyectoId) })}>
                  Orden
                </Button>
              ) },
            ]} />
          </>
        )}
      </div>

      <OrdenCompraDrawer
        open={!!drawer}
        ordenId={drawer?.ordenId || null}
        inicial={drawer?.inicial || null}
        onClose={() => setDrawer(null)}
        onCambio={(o) => { setDrawer((d) => (d && !d.ordenId ? { ordenId: o.id } : d)); alCambiar(); }}
        showToast={showToast}
      />
    </>
  );
}
