import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMiUltimaCotizacion } from "../api/cotizaciones";
import useAuth from "../auth/useAuth";
import {
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
} from "lucide-react";
import styles from "./ClienteDashboard.module.scss";

const ESTADO_CONFIG = {
  PENDIENTE:     { label: "Pendiente de respuesta", color: styles.badgePendiente,     Icon: Clock },
  APROBADA:      { label: "Aprobada",               color: styles.badgeAprobada,      Icon: CheckCircle },
  RECHAZADA:     { label: "Rechazada",              color: styles.badgeRechazada,     Icon: XCircle },
  FACTURADA:     { label: "Facturada",              color: styles.badgeFacturada,     Icon: DollarSign },
  RENEGOCIACION: { label: "En renegociación",       color: styles.badgeRenegociacion, Icon: Clock },
};

export default function ClienteDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cotizacion, setCotizacion] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    getMiUltimaCotizacion()
      .then(setCotizacion)
      .catch(() => setCotizacion(null))
      .finally(() => setLoading(false));
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(amount);

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(dateString));

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Cargando tu cotización...</p>
      </div>
    );
  }

  const estadoInfo = cotizacion ? ESTADO_CONFIG[cotizacion.estado] || ESTADO_CONFIG.PENDIENTE : null;

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.pageTitle}>Bienvenido, {user?.nombre || "Cliente"}</h1>
          <p className={styles.pageSubtitle}>Consulta el estado de tu cotización más reciente</p>
        </div>
      </div>

      {!cotizacion ? (
        <div className={styles.emptyCard}>
          <FileText size={56} />
          <h2>No tienes cotizaciones aún</h2>
          <p>Cuando tu asesor genere una cotización para ti, aparecerá aquí.</p>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statCard_blue}`}>
              <div className={styles.statIcon}><FileText size={28} color="#3b82f6" /></div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>N° de cotización</p>
                <p className={styles.statValue}>#{cotizacion.numero}</p>
                <p className={styles.statSub}>{formatDate(cotizacion.createdAt)}</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statCard_green}`}>
              <div className={styles.statIcon}><DollarSign size={28} color="#10b981" /></div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Total</p>
                <p className={styles.statValue}>{formatCurrency(cotizacion.total)}</p>
                <p className={styles.statSub}>{cotizacion.items?.length || 0} producto(s)</p>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statCard_yellow}`}>
              <div className={styles.statIcon}>
                {estadoInfo && <estadoInfo.Icon size={28} color="#f59e0b" />}
              </div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>Estado actual</p>
                <span className={`${styles.badge} ${estadoInfo?.color}`}>
                  {estadoInfo?.label}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Detalle de productos</h2>
              <a
                className={styles.btnDownload}
                href={`${import.meta.env.VITE_API_URL}/cotizaciones/${cotizacion.id}/pdf?token=${token}`}
                target="_blank"
                rel="noreferrer"
              >
                <Download size={16} />
                Descargar PDF
              </a>
            </div>

            <div className={styles.tableContainer}>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio unit.</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {cotizacion.items?.map((item) => {
                    const adicionales = item.adicionales
                      ?.filter((a) => a.seleccionado)
                      .map((a) => a.nombre)
                      .join(", ");
                    return (
                      <tr key={item.id}>
                        <td>
                          <span className={styles.productName}>
                            {item.producto?.material || item.descripcion}
                          </span>
                          {adicionales && (
                            <span className={styles.productExtra}>+ {adicionales}</span>
                          )}
                        </td>
                        <td>{item.cantidad}</td>
                        <td>{formatCurrency(item.precio)}</td>
                        <td className={styles.subtotal}>{formatCurrency(item.subtotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className={styles.totalLabel}>Total</td>
                    <td className={styles.totalValue}>{formatCurrency(cotizacion.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {cotizacion.estado === "PENDIENTE" && (
              <div className={styles.actionBanner}>
                <p>Esta cotización está esperando tu respuesta.</p>
                <button
                  className={styles.btnPrimary}
                  onClick={() => navigate("/cotizador/cliente/mia")}
                >
                  Responder cotización
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
