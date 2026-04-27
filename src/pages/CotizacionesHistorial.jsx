import { useEffect, useState } from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { getCotizaciones, getCotizacionById } from "../api/cotizaciones";
import { descargarPDFInteligente } from "../api/pdf";
import styles from "./cotizacionesHistorial.module.scss";
import VistaPreviaCotizacion from "../coomponents/VistaPreviaCotizacion";
import CotizacionModal from "./CotizacionModal";
import { crearCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";

const ESTADOS = ["TODAS", "PENDIENTE", "APROBADA", "FACTURADA", "RECHAZADA"];

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
  const [vista, setVista] = useState("cards");
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [selectedCotizacion, setSelectedCotizacion] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
              <button className={styles.btnPreview} onClick={() => handlePreview(c)}>
                Vista previa / PDF
              </button>
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
                  <td><EstadoBadge estado={c.estado} /></td>
                  <td>
                    <div>{new Date(c.createdAt).toLocaleDateString("es-PE")}</div>
                    <div className={styles.tdSub}>{new Date(c.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}</div>
                  </td>
                  <td>
                    <button className={styles.btnSmall} onClick={() => handlePreview(c)}>
                      PDF
                    </button>
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

      {selectedCotizacion && (
        <VistaPreviaCotizacion
          cotizacion={selectedCotizacion}
          onConfirm={confirmPdf}
          onCancel={() => setSelectedCotizacion(null)}
        />
      )}
    </div>
  );
}
