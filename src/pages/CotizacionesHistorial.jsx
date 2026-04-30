import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus, X, Download } from "lucide-react";
import { getCotizaciones, getCotizacionById, renegociarCotizacion } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import styles from "./cotizacionesHistorial.module.scss";
import CotizacionPDFPreview from "../coomponents/CotizacionPDFPreview";
import CotizacionModal from "./CotizacionModal";
import { crearCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";

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

export default function CotizacionesHistorial() {
  const { user } = useAuth();
  const token = localStorage.getItem("token");

  const [cotizaciones, setCotizaciones] = useState([]);
  const [vista, setVista] = useState("tabla");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [cotizacionARenegociar, setCotizacionARenegociar] = useState(null);

  const cargarCotizaciones = () => getCotizaciones().then(setCotizaciones);

  useEffect(() => { cargarCotizaciones(); }, []);

  const filtradas = cotizaciones.filter((c) => {
    const matchEstado = filtroEstado === "TODAS" || c.estado === filtroEstado;
    const matchCliente = !filtroCliente || c.cliente.nombreComercial.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchVendedor = !filtroVendedor || c.usuario?.nombre.toLowerCase().includes(filtroVendedor.toLowerCase());
    return matchEstado && matchCliente && matchVendedor;
  });

  const guardarCotizacion = async ({ clienteId, items, margen, conIgv }) => {
    const data = {
      clienteId,
      usuarioId: user.id,
      margen,
      conIgv,
      items: items.map((i) => ({
        productoId: i.productoId,
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
      alert("Error creando cotización");
    }
  };

  const buildModalItems = (cot) =>
    (cot.items || []).map((item) => {
      const p = item.producto;
      const tipoMedida = p?.tipoMedida || "UNIDAD";
      const medida = item.medida || 1;
      const medidaAncho = item.medidaAncho || 1;
      const medidaAlto = item.medidaAlto || 1;
      const sumaAdicionales = (item.adicionales || [])
        .filter((a) => a.seleccionado)
        .reduce((acc, a) => acc + Number(a.precio), 0);
      const precioBase = parseFloat(((p?.precio_final || 0) * medida + sumaAdicionales).toFixed(2));
      return {
        productoId: p?.id,
        nombre: p?.nombre || p?.servicio || p?.material || "(sin nombre)",
        precio_final: p?.precio_final || 0,
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

  const guardarRenegociacion = async ({ items, conIgv }) => {
    if (!cotizacionARenegociar) return;
    const payload = {
      conIgv,
      items: items.map((i) => ({
        productoId: i.productoId,
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
      alert("Error al re-enviar la cotización");
    }
  };

  const handlePreview = (cotizacion) => setSelectedCotizacion(cotizacion);

  const confirmPdf = async () => {
    if (!selectedCotizacion) return;
    try {
      const cotizacionCompleta = await getCotizacionById(selectedCotizacion.id);
      await descargarPDFInteligente(cotizacionCompleta, token);
    } catch {
      alert("Error obteniendo datos de la cotización");
    }
    setSelectedCotizacion(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <h2>Cotizaciones</h2>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={styles.btnView}
            onClick={() => setVista(vista === "cards" ? "tabla" : "cards")}
            title={vista === "cards" ? "Ver como tabla" : "Ver como tarjetas"}
          >
            {vista === "cards" ? <List size={15} /> : <LayoutGrid size={15} />}
            {vista === "cards" ? "Tabla" : "Tarjetas"}
          </button>
          <button className={styles.btnNew} onClick={() => setShowModal(true)}>
            <Plus size={15} /> Nueva Cotización
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
        <div className={styles.lista}>
          {filtradas.map((c) => (
            <div key={c.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.numero}>#{c.numero}</span>
                <EstadoBadge estado={c.estado} />
              </div>
              <p className={styles.cliente}>{c.cliente.nombreComercial}</p>
              <p className={styles.total}>{fmt(c.total)}</p>
              <p className={styles.fecha}>{new Date(c.createdAt).toLocaleDateString("es-PE")}</p>
              <p className={styles.vendedor}>{c.usuario?.nombre}</p>
              {c.estado === "RENEGOCIACION" && c.respuestaComentario && (
                <p className={styles.cardComentario}>"{c.respuestaComentario}"</p>
              )}
              <button className={styles.btnPreview} onClick={() => handlePreview(c)}>
                Vista previa / PDF
              </button>
              {c.estado === "RENEGOCIACION" && (
                <button
                  className={styles.btnRenegociarCard}
                  onClick={() => setCotizacionARenegociar(c)}
                >
                  Re-enviar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Vista tabla ── */}
      {vista === "tabla" && (
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
                  <td>{c.cliente.nombreComercial}</td>
                  <td>
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
                    <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                      <button className={styles.btnSmall} onClick={() => handlePreview(c)}>
                        PDF
                      </button>
                      {c.estado === "RENEGOCIACION" && (
                        <button
                          className={styles.btnRenegociar}
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
      )}

      {showModal && (
        <CotizacionModal
          onClose={() => setShowModal(false)}
          onSave={guardarCotizacion}
        />
      )}

      {cotizacionARenegociar && (
        <CotizacionModal
          onClose={() => setCotizacionARenegociar(null)}
          onSave={guardarRenegociacion}
          initialClienteId={String(cotizacionARenegociar.clienteId)}
          initialItems={buildModalItems(cotizacionARenegociar)}
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
          nombre: item.producto?.nombre || item.producto?.servicio || "(sin nombre)",
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
  );
}
