import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEstadisticasCotizaciones } from '../api/stats';
import { getCotizaciones } from '../api/cotizaciones';
import {
  DollarSign,
  CheckCircle,
  Clock,
  FileText,
  ArrowRight,
} from 'lucide-react';
import styles from './ContableDashboard.module.scss';

export default function ContableDashboard() {
  const navigate = useNavigate();
  const [estadisticas, setEstadisticas] = useState(null);
  const [pendientesFacturar, setPendientesFacturar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [statsRes, cotizacionesRes] = await Promise.all([
        getEstadisticasCotizaciones(),
        getCotizaciones(),
      ]);
      setEstadisticas(statsRes);
      const aprobadas = (cotizacionesRes || []).filter(
        (c) => c.estado === 'APROBADA'
      );
      setPendientesFacturar(aprobadas.slice(0, 8));
    } catch (error) {
      console.error('Error cargando datos contable:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  const formatDate = (dateString) =>
    new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }).format(
      new Date(dateString)
    );

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Contabilidad</h1>
          <p className={styles.pageSubtitle}>Gestión de facturación y estado de cotizaciones</p>
        </div>
        <button
          className={styles.btnPrimary}
          onClick={() => navigate('/cotizador/contable/cotizaciones-ventas')}
        >
          <DollarSign size={20} />
          Ir a Facturar
        </button>
      </div>

      {estadisticas && (
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statCard_green}`}>
            <div className={styles.statIcon}>
              <CheckCircle size={28} color="#10b981" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Aprobadas (pendientes facturar)</p>
              <p className={styles.statValue}>{estadisticas.APROBADA?.count || 0}</p>
              <p className={styles.statChange}>
                {formatCurrency(estadisticas.APROBADA?.total || 0)}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard_purple}`}>
            <div className={styles.statIcon}>
              <DollarSign size={28} color="#8b5cf6" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Facturadas</p>
              <p className={styles.statValue}>{estadisticas.FACTURADA?.count || 0}</p>
              <p className={styles.statChange}>
                {formatCurrency(estadisticas.FACTURADA?.total || 0)}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard_yellow}`}>
            <div className={styles.statIcon}>
              <Clock size={28} color="#f59e0b" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Pendientes respuesta</p>
              <p className={styles.statValue}>{estadisticas.PENDIENTE?.count || 0}</p>
              <p className={styles.statChange}>
                {formatCurrency(estadisticas.PENDIENTE?.total || 0)}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard_blue}`}>
            <div className={styles.statIcon}>
              <FileText size={28} color="#3b82f6" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total cotizaciones</p>
              <p className={styles.statValue}>
                {Object.values(estadisticas).reduce((s, e) => s + e.count, 0)}
              </p>
              <p className={styles.statChange}>
                {formatCurrency(
                  Object.values(estadisticas).reduce((s, e) => s + e.total, 0)
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Cotizaciones aprobadas para facturar</h2>
          <button
            className={styles.btnSecondary}
            onClick={() => navigate('/cotizador/contable/cotizaciones-ventas')}
          >
            Ver todas
            <ArrowRight size={16} />
          </button>
        </div>

        {pendientesFacturar.length === 0 ? (
          <div className={styles.emptyState}>
            <CheckCircle size={40} />
            <p className={styles.emptyTitle}>No hay cotizaciones pendientes de facturar</p>
            <p className={styles.emptySubtitle}>Todas las cotizaciones aprobadas ya han sido procesadas</p>
          </div>
        ) : (
          <div className={styles.tableContainer}>
            <table>
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Cliente</th>
                  <th>Vendedor</th>
                  <th>Fecha aprobación</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {pendientesFacturar.map((c) => (
                  <tr key={c.id}>
                    <td className={styles.numero}>#{c.numero}</td>
                    <td>{c.cliente?.nombreComercial}</td>
                    <td>{c.usuario?.nombre}</td>
                    <td>{formatDate(c.respondidaAt || c.createdAt)}</td>
                    <td className={styles.total}>{formatCurrency(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
