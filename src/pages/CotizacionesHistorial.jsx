import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, X, Download } from "lucide-react";
import { getCotizaciones, getCotizacionById, renegociarCotizacion, getCotizacionLog } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import styles from "./cotizacionesHistorial.module.scss";
import CotizacionPDFPreview from "../coomponents/CotizacionPDFPreview";
import CotizacionModal from "./CotizacionModal";
import ConvertirReservaModal from "./ConvertirReservaModal";
import { crearCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";
import { useToast } from "../coomponents/Toast";
import { nombreItem } from "../utils/cotizacionItem";

const ESTADOS = ["TODAS", "PENDIENTE", "APROBADA", "FACTURADA", "RENEGOCIACION", "RECHAZADA"];

function EstadoBadge({ estado }) {
  return (
    <span className={`${styles.estadoBadge} ${styles[estado]}`}>
      {estado}
    </span>
  );
}

const fmt = (v) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v ?? 0);

const SUBTITULOS = {
  outdoor: "Historial de cotizaciones outdoor (paneles y mupis)",
  btl: "Historial de cotizaciones BTL (productos)",
};

export default function CotizacionesHistorial({ modulo }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const token = localStorage.getItem("token");
  const { show: showToast, ToastNode } = useToast();

  const [cotizaciones, setCotizaciones] = useState([]);
  const [vista, setVista] = useState("tabla");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [logCotizacion, setLogCotizacion] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [cotizacionARenegociar, setCotizacionARenegociar] = useState(null);
  const [cotAConvertir, setCotAConvertir] = useState(null);

  const cargarCotizaciones = () => getCotizaciones().then(setCotizaciones);

  useEffect(() => { cargarCotizaciones(); }, []);

  useEffect(() => {
    if (!selectedCotizacion) return;
    getCotizacionLog(selectedCotizacion.id).then(setLogCotizacion).catch(() => {});
  }, [selectedCotizacion]);

  const esCotizacionOutdoor = (c) => (c.items || []).some((i) => i.panelId != null);

  const filtradas = cotizaciones.filter((c) => {
    const matchEstado = filtroEstado === "TODAS" || c.estado === filtroEstado;
    const matchCliente = !filtroCliente || c.cliente.nombreComercial.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchVendedor = !filtroVendedor || c.usuario?.nombre.toLowerCase().includes(filtroVendedor.toLowerCase());
    const matchModulo = !modulo || (modulo === "outdoor" ? esCotizacionOutdoor(c) : !esCotizacionOutdoor(c));
    return matchEstado && matchCliente && matchVendedor && matchModulo;
  });

  const guardarCotizacion = async ({ clienteId, items, margen, conIgv, borradorId }) => {
    const data = {
      clienteId,
      margen,
      conIgv,
      borradorId,
      items: items.map((i) => ({
        productoId: i.productoId,
        panelId: i.panelId || null,
        nombre: i.nombre || null,
        descripcion: i.descripcion || "",
        cantidad: i.cantidad,
        medida: i.medida || 1,
        medidaAncho: i.medidaAncho || null,
        medidaAlto: i.medidaAlto || null,
        precio: i.precio,
        adicionales: i.adicionales.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          precio: a.precio,
          seleccionado: a.seleccionado,
        })),
      })),
    };
    try {
      const cotizacion = await crearCotizacion(data);
      await descargarPDFInteligente(cotizacion, token);
      cargarCotizaciones();
    } catch (error) {
      console.error("Error creando cotización:", error);
      showToast(error.response?.data?.message ?? "Error creando cotización");
    }
  };

  const buildModalItems = (cot) =>
    (cot.items || []).map((item) => {
      const p = item.producto;
      const panel = item.panel;
      const tipoMedida = p?.tipoMedida || "UNIDAD";
      const medida = item.medida || 1;
      const medidaAncho = item.medidaAncho || 1;
      const medidaAlto = item.medidaAlto || 1;
      const sumaAdicionales = (item.adicionales || [])
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);

      let precioFinalBase = p?.precio_final || 0;
      if (!p && panel) {
        const nombre = item.nombre || "";
        if (nombre.startsWith("Producción")) precioFinalBase = panel.costoProduccion || 0;
        else if (nombre.startsWith("Instalación")) precioFinalBase = panel.costoInstalacion || 0;
        else precioFinalBase = panel.precioMes || 0;
      }

      const precioBase = parseFloat((precioFinalBase * medida + sumaAdicionales).toFixed(2));
      return {
        productoId: p?.id,
        panelId: item.panelId || null,
        nombre: nombreItem(item),
        precio_final: precioFinalBase,
        unidad: p?.unidad || "",
        tipoMedida,
        medida,
        medidaAncho,
        medidaAlto,
        precioBase,
        precio: item.precio,
        cantidad: item.cantidad,
        descripcion: item.descripcion || "",
        subtotalBase: parseFloat((precioBase * item.cantidad).toFixed(2)),
        subtotal: parseFloat((item.precio * item.cantidad).toFixed(2)),
        adicionales: (p?.adicionales || []).map((a) => ({
          id: a.id,
          nombre: a.nombre,
          precio: a.precio,
          seleccionado: (item.adicionales || []).some(
            (ca) => ca.adicionalId === a.id && ca.seleccionado
          ),
        })),
      };
    });

  const guardarRenegociacion = async ({ items, conIgv, margen }) => {
    if (!cotizacionARenegociar) return;
    const payload = {
      conIgv,
      margen,
      items: items.map((i) => ({
        productoId: i.productoId,
        panelId: i.panelId || null,
        nombre: i.nombre || null,
        cantidad: i.cantidad,
        medida: i.medida || 1,
        medidaAncho: i.medidaAncho || null,
        medidaAlto: i.medidaAlto || null,
        precio: i.precio,
        descripcion: i.descripcion,
        adicionales: i.adicionales.map((a) => ({
          id: a.id,
          nombre: a.nombre,
          precio: a.precio,
          seleccionado: a.seleccionado,
        })),
      })),
    };
    try {
      await renegociarCotizacion(cotizacionARenegociar.id, payload);
      setCotizacionARenegociar(null);
      cargarCotizaciones();
    } catch (error) {
      console.error("Error renegociando cotización:", error);
      showToast(error.response?.data?.message ?? "Error al re-enviar la cotización");
    }
  };

  const handlePreview = (cotizacion) => setSelectedCotizacion(cotizacion);

  const confirmPdf = async () => {
    if (!selectedCotizacion) return;
    try {
      const cotizacionCompleta = await getCotizacionById(selectedCotizacion.id);
      await descargarPDFInteligente(cotizacionCompleta, token);
    } catch {
      showToast("Error obteniendo datos de la cotización");
    }
    setSelectedCotizacion(null);
  };

  return (
    <>
    {ToastNode}
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Cotizaciones</h1>
          <p className={styles.subtitle}>{SUBTITULOS[modulo] || "Historial de cotizaciones emitidas"}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.btnOutline}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={18} /> : <LayoutGrid size={18} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          <button className={styles.btnPrimary} onClick={() => setShowModal(true)}>
            <Plus size={18} /> Nueva Cotización
          </button>
        </div>
      </div>

      {/* Filtros por estado */}
      <div className={styles.filtros}>
        {ESTADOS.map((f) => (
          <button
            key={f}
            className={filtroEstado === f ? styles.active : ""}
            onClick={() => setFiltroEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Filtros de texto */}
      <div className={styles.filtrosAvanzados}>
        <input
          type="text"
          placeholder="Filtrar por cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por vendedor..."
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
        />
      </div>

      {/* ── Vista tarjetas ── */}
      {vista === "cards" && (
        filtradas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <strong>Sin cotizaciones</strong>
            <span>No hay resultados para los filtros seleccionados.</span>
          </div>
        ) : (
        <div className={styles.lista}>
          {filtradas.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.numero}>#{c.numero}</span>
                <EstadoBadge estado={c.estado} />
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cliente}>{c.cliente.nombreComercial}</p>
                <p className={styles.total}>{fmt(c.total)}</p>
                <p className={styles.fecha}>{new Date(c.createdAt).toLocaleDateString("es-PE")}</p>
                <p className={styles.vendedor}>{c.usuario?.nombre}</p>
                {c.estado === "RENEGOCIACION" && c.respuestaComentario && (
                  <p className={styles.cardComentario}>"{c.respuestaComentario}"</p>
                )}
              </div>
              <div className={styles.cardActions}>
                <button className={styles.btnOutline} onClick={() => handlePreview(c)}>
                  Vista previa / PDF
                </button>
                {isAdmin && modulo === "outdoor" && c.estado === "APROBADA" && (
                  <button className={styles.btnOutline} onClick={() => setCotAConvertir(c)}>
                    Crear reserva
                  </button>
                )}
                {c.estado === "RENEGOCIACION" && (
                  <button
                    className={styles.btnDanger}
                    onClick={() => setCotizacionARenegociar(c)}
                  >
                    Re-enviar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        )
      )}

      {/* ── Vista tabla ── */}
      {vista === "tabla" && (
        filtradas.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📋</span>
            <strong>Sin cotizaciones</strong>
            <span>No hay resultados para los filtros seleccionados.</span>
          </div>
        ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Total</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div>{c.numero}</div>
                  </td>
                  <td className={styles.tdCliente}>{c.cliente.nombreComercial}</td>
                  <td className={styles.tdVendedor}>
                    <div>{c.usuario?.nombre}</div>
                  </td>
                  <td className={styles.tdTotal}>{fmt(c.total)}</td>
                  <td>
                    <EstadoBadge estado={c.estado} />
                    {c.estado === "RENEGOCIACION" && c.respuestaComentario && (
                      <div className={styles.tdComentario}>"{c.respuestaComentario}"</div>
                    )}
                  </td>
                  <td>
                    <div>{new Date(c.createdAt).toLocaleDateString("es-PE")}</div>
                    <div className={styles.tdSub}>{new Date(c.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div>
                  </td>
                  <td>
                    <div className={styles.tdActions}>
                      <button className={styles.btnGhost} onClick={() => handlePreview(c)}>
                        PDF
                      </button>
                      {isAdmin && modulo === "outdoor" && c.estado === "APROBADA" && (
                        <button className={styles.btnGhost} onClick={() => setCotAConvertir(c)}>
                          Reserva
                        </button>
                      )}
                      {c.estado === "RENEGOCIACION" && (
                        <button
                          className={styles.btnDanger}
                          style={{ padding: "0.4rem" }}
                          onClick={() => setCotizacionARenegociar(c)}
                        >
                          Re-enviar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )
      )}

      {showModal && (
        <CotizacionModal
          modulo={modulo}
          onClose={() => setShowModal(false)}
          onSave={guardarCotizacion}
        />
      )}

      {cotAConvertir && (
        <ConvertirReservaModal
          cotizacion={cotAConvertir}
          onClose={() => setCotAConvertir(null)}
        />
      )}

      {cotizacionARenegociar && (
        <CotizacionModal
          modulo={modulo}
          onClose={() => setCotizacionARenegociar(null)}
          onSave={guardarRenegociacion}
          initialClienteId={String(cotizacionARenegociar.clienteId)}
          initialItems={buildModalItems(cotizacionARenegociar)}
          cotizacionId={cotizacionARenegociar.id}
          title="Re-enviar Cotización"
          saveLabel="Re-enviar Cotización"
        />
      )}

      {selectedCotizacion && (() => {
        const cot = selectedCotizacion;
        const total = cot.total || 0;
        const igvMonto = cot.conIgv ? parseFloat((total - total / 1.18).toFixed(2)) : 0;
        const valorVenta = cot.conIgv ? parseFloat((total / 1.18).toFixed(2)) : total;
        const fecha = new Date(cot.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
        const previewItems = (cot.items || []).map((item) => ({
          nombre: nombreItem(item),
          descripcion: item.descripcion,
          medidaAncho: item.medidaAncho,
          medidaAlto: item.medidaAlto,
          medida: item.medida,
          unidad: item.producto?.unidad,
          cantidad: item.cantidad,
          precio: item.precio,
          subtotal: item.subtotal,
        }));
        return (
          <div className={styles.previewOverlay}>
            <div className={styles.previewModal}>
              <div className={styles.previewActions}>
                {cot.estado === "RENEGOCIACION" && (
                  <button
                    className={styles.btnEditar}
                    onClick={() => { setCotizacionARenegociar(cot); setSelectedCotizacion(null); }}
                  >
                    Editar y Re-enviar
                  </button>
                )}
                <button className={styles.btnDescargar} onClick={confirmPdf}>
                  <Download size={15} /> Descargar PDF
                </button>
                <button className={styles.btnCerrar} onClick={() => setSelectedCotizacion(null)}>
                  <X size={15} /> Cerrar
                </button>
              </div>
              {cot.respuestaComentario && (
                <div className={styles.comentarioCliente}>
                  <span className={styles.comentarioClienteLabel}>Mensaje del cliente:</span>
                  <p>"{cot.respuestaComentario}"</p>
                </div>
              )}

              {/* Timeline de estados */}
              {logCotizacion.length > 0 && (
                <div className={styles.timeline}>
                  <p className={styles.timelineTitle}>Historial de estados</p>
                  <div className={styles.timelineList}>
                    {logCotizacion.map((entry, i) => (
                      <div key={entry.id} className={styles.timelineItem}>
                        <div className={styles.timelineDot} />
                        {i < logCotizacion.length - 1 && <div className={styles.timelineLine} />}
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineEstado}>
                            {entry.estadoAnterior
                              ? <><span className={`${styles.estadoBadge} ${styles[entry.estadoAnterior]}`}>{entry.estadoAnterior}</span><span className={styles.timelineArrow}>→</span></>
                              : null}
                            <span className={`${styles.estadoBadge} ${styles[entry.estadoNuevo]}`}>{entry.estadoNuevo}</span>
                          </div>
                          <div className={styles.timelineMeta}>
                            <span>{entry.usuario?.nombre}</span>
                            <span className={styles.timelineFecha}>
                              {new Date(entry.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                              {" · "}
                              {new Date(entry.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          {entry.comentario && (
                            <p className={styles.timelineComentario}>"{entry.comentario}"</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CotizacionPDFPreview
                numero={cot.numero}
                fecha={fecha}
                estado={cot.estado}
                cliente={cot.cliente}
                conIgv={cot.conIgv !== false}
                items={previewItems}
                valorVenta={valorVenta}
                igvMonto={igvMonto}
                total={total}
              />
            </div>
          </div>
        );
      })()}
    </div>
    </>
  );
}
