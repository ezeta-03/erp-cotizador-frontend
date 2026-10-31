import { useEffect, useState } from "react";
import { getCotizaciones, facturarCotizacion } from "../api/cotizaciones";
import { getComprobantes } from "../api/comprobantes";
import Comprobantes from "./Comprobantes";
import NuevaFacturaDrawer from "./NuevaFacturaDrawer";
import styles from "./CotizacionesVentas.module.scss";
import { useToast } from "./Toast";
import Spinner from "./Spinner";
import { soles } from "../utils/formato";

const fmt = (v) =>
  soles(v ?? 0);

export default function CotizacionesVentas() {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState("TODAS");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroVendedor, setFiltroVendedor] = useState("");
  const [facturando, setFacturando] = useState(null);
  const [vista, setVista] = useState("COTIZACIONES");
  const [comprobantes, setComprobantes] = useState([]);
  const [emision, setEmision] = useState(null); // { cotizacionId, tipo }: formulario abierto
  const { show: showToast, ToastNode } = useToast();

  const cargarComprobantes = () =>
    getComprobantes()
      .then(setComprobantes)
      .catch((err) => console.error("❌ Error cargando comprobantes:", err));

  useEffect(() => {
    cargarComprobantes();
    getCotizaciones()
      .then(setCotizaciones)
      .catch((err) => {
        console.error("❌ Error cargando cotizaciones:", err);
        setError("No se pudieron cargar las cotizaciones");
      })
      .finally(() => setLoading(false));
  }, []);

  // Para cotizaciones cuya factura se emitió fuera del ERP (portal SOL): marca
  // FACTURADA y guarda el n.° del comprobante en el historial. Las emitidas
  // desde el ERP pasan a FACTURADA solas.
  const facturarFuera = async (id) => {
    const numero = prompt("Esta cotización se facturó fuera del ERP (p. ej. portal SOL).\nN° del comprobante emitido (ej. E001-1042):");
    if (numero === null) return;
    if (!/^[A-Za-z0-9]{4}-\d{1,8}$/.test(numero.trim())) return showToast("Escribe el número con la forma E001-1042");
    setFacturando(id);
    try {
      await facturarCotizacion(id, numero.trim().toUpperCase());
      setCotizaciones((prev) =>
        prev.map((c) => (c.id === id ? { ...c, estado: "FACTURADA" } : c))
      );
    } catch (err) {
      console.error("❌ Error facturando cotización:", err);
      showToast("Error al facturar la cotización.");
    } finally {
      setFacturando(null);
    }
  };

  // Comprobante vigente por cotización: el último no rechazado y no anulado con
  // nota de crédito total (la API devuelve los más recientes primero).
  const anulados = new Set(
    comprobantes
      .filter((c) => c.tipo === "NOTA_CREDITO" && c.estado === "ACEPTADO" && ["01", "02", "06"].includes(c.motivoCodigo))
      .map((c) => c.referenciaId)
  );
  const vigentePorCotizacion = {};
  for (const c of comprobantes) {
    if (["NOTA_CREDITO", "NOTA_DEBITO"].includes(c.tipo) || c.estado === "RECHAZADO" || anulados.has(c.id) || !c.cotizacionId) continue;
    vigentePorCotizacion[c.cotizacionId] ??= c;
  }

  // Al emitir desde una cotización, el backend la pasa a FACTURADA si SUNAT acepta.
  const alEmitir = (c) => {
    cargarComprobantes();
    if (c.estado === "ACEPTADO" && c.cotizacionId) {
      setCotizaciones((prev) =>
        prev.map((x) => (x.id === c.cotizacionId && x.estado === "APROBADA" ? { ...x, estado: "FACTURADA" } : x))
      );
    }
  };

  const tieneRuc = (cot) => /^(10|15|17|20)\d{9}$/.test(String(cot.cliente?.documento || "").trim());

  const filtradas = cotizaciones.filter((c) => {
    const matchEstado = filtroEstado === "TODAS" || c.estado === filtroEstado;
    const matchCliente = !filtroCliente || c.cliente?.nombreComercial?.toLowerCase().includes(filtroCliente.toLowerCase());
    const matchVendedor = !filtroVendedor || c.usuario?.nombre?.toLowerCase().includes(filtroVendedor.toLowerCase());
    return matchEstado && matchCliente && matchVendedor;
  });

  if (loading) return (
    <div className={styles.info} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}>
      <Spinner size={18} /> Cargando cotizaciones...
    </div>
  );
  if (error) return <p className={styles.info}>{error}</p>;

  return (
    <>
    {ToastNode}
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.heading}>Facturar</h2>
          <p className={styles.subtitle}>
            {vista === "COTIZACIONES"
              ? `${filtradas.length} cotizacion${filtradas.length !== 1 ? "es" : ""}`
              : `${comprobantes.length} comprobante${comprobantes.length !== 1 ? "s" : ""} electrónico${comprobantes.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      <div className={styles.filtros}>
        {[["COTIZACIONES", "Cotizaciones"], ["COMPROBANTES", "Comprobantes SUNAT"]].map(([v, label]) => (
          <button
            key={v}
            className={`${styles.filtroBtn} ${vista === v ? styles.active : ""}`}
            onClick={() => setVista(v)}
          >
            {label}
          </button>
        ))}
      </div>

      {vista === "COMPROBANTES" ? (
        <Comprobantes comprobantes={comprobantes} onActualizado={cargarComprobantes} showToast={showToast} />
      ) : (
      <>

      {/* Chips de estado */}
      <div className={styles.filtros}>
        {["TODAS", "PENDIENTE", "APROBADA", "RENEGOCIACION", "FACTURADA"].map((f) => (
          <button
            key={f}
            className={`${styles.filtroBtn} ${filtroEstado === f ? styles.active : ""}`}
            onClick={() => setFiltroEstado(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Buscadores */}
      <div className={styles.filtrosAvanzados}>
        <input
          type="text"
          placeholder="Buscar por cliente..."
          value={filtroCliente}
          onChange={(e) => setFiltroCliente(e.target.value)}
          className={styles.inputFiltro}
        />
        <input
          type="text"
          placeholder="Buscar por vendedor..."
          value={filtroVendedor}
          onChange={(e) => setFiltroVendedor(e.target.value)}
          className={styles.inputFiltro}
        />
      </div>

      {filtradas.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>📋</span>
          <strong>Sin cotizaciones</strong>
          <span>No hay resultados para los filtros seleccionados.</span>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Número</th>
                <th>Cliente</th>
                <th>Vendedor</th>
                <th>Estado</th>
                <th>Total</th>
                <th>Factura externa</th>
                <th>Comprobante SUNAT</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((c) => (
                <tr key={c.id}>
                  <td>{c.numero}</td>
                  <td>{c.cliente?.nombreComercial}</td>
                  <td>{c.usuario?.nombre}</td>
                  <td>
                    <span className={`${styles.estado} ${styles[c.estado]}`}>{c.estado}</span>
                  </td>
                  <td>{fmt(c.total)}</td>
                  <td>
                    <button
                      className={styles.btnFacturar}
                      onClick={() => facturarFuera(c.id)}
                      disabled={c.estado !== "APROBADA" || facturando === c.id || !!vigentePorCotizacion[c.id]}
                      title="Marcar como facturada con un comprobante emitido fuera del ERP (portal SOL)"
                    >
                      {facturando === c.id ? "Guardando..." : "Facturada fuera del ERP"}
                    </button>
                  </td>
                  <td>
                    {vigentePorCotizacion[c.id] ? (
                      <button className={styles.filtroBtn} onClick={() => setVista("COMPROBANTES")}>
                        {vigentePorCotizacion[c.id].numero} · {vigentePorCotizacion[c.id].estado}
                      </button>
                    ) : ["APROBADA", "FACTURADA"].includes(c.estado) ? (
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {["FACTURA", "BOLETA"].map((tipo) => {
                          const sinRuc = tipo === "FACTURA" && !tieneRuc(c);
                          return (
                            <button
                              key={tipo}
                              className={styles.btnFacturar}
                              onClick={() => setEmision({ cotizacionId: c.id, tipo })}
                              disabled={sinRuc}
                              title={sinRuc ? "El cliente no tiene RUC: solo puede recibir boleta" : `Revisar y emitir ${tipo === "FACTURA" ? "factura" : "boleta"}`}
                            >
                              {tipo === "FACTURA" ? "Factura" : "Boleta"}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ color: "var(--color-text3)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </>
      )}
    </div>
    <NuevaFacturaDrawer
      open={!!emision}
      cotizacionId={emision?.cotizacionId}
      tipoInicial={emision?.tipo}
      onClose={() => setEmision(null)}
      onEmitido={alEmitir}
      showToast={showToast}
    />
    </>
  );
}
