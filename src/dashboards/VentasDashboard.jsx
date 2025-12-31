// src/dashboards/VentasDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DonutChart, LineChart } from '../coomponents/Charts';
import { getProgresoMeta, getCotizacionesPorDia, getEstadisticasCotizaciones } from '../api/stats';
import { getCotizaciones } from '../api/cotizaciones';
import { 
  FileText, 
  CheckCircle, 
  Clock,
  Plus,
  Eye,
  DollarSign,
  Target,
  Calendar
} from 'lucide-react';
import styles from './VentasDashboard.module.scss';

export default function VentasDashboard() {
  const navigate = useNavigate();
  const [progreso, setProgreso] = useState(null);
  const [cotizacionesPorDia, setCotizacionesPorDia] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [cotizacionesRecientes, setCotizacionesRecientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [progresoRes, cotizacionesRes, statsRes, cotizacionesListRes] = await Promise.all([
        getProgresoMeta(),
        getCotizacionesPorDia(),
        getEstadisticasCotizaciones(),
        getCotizaciones()
      ]);
      
      setProgreso(progresoRes.data);
      setCotizacionesPorDia(cotizacionesRes.data);
      setEstadisticas(statsRes.data);
      setCotizacionesRecientes(cotizacionesListRes.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  };

  const getEstadoBadge = (estado) => {
    const badges = {
      PENDIENTE: { class: styles.badgePendiente, text: 'Pendiente' },
      APROBADA: { class: styles.badgeAprobada, text: 'Aprobada' },
      RECHAZADA: { class: styles.badgeRechazada, text: 'Rechazada' },
      FACTURADA: { class: styles.badgeFacturada, text: 'Facturada' },
    };
    const badge = badges[estado] || badges.PENDIENTE;
    
    return <span className={badge.class}>{badge.text}</span>;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard de Ventas</h1>
          <p className={styles.pageSubtitle}>Monitorea tu desempeño y progreso hacia la meta mensual</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => navigate('/cotizaciones/nueva')}>
          <Plus size={20} />
          Nueva Cotización
        </button>
      </div>

      {/* KPIs Grid */}
      {estadisticas && (
        <div className={styles.statsGrid}>
          <div className={`${styles.statCard} ${styles.statCard_blue}`}>
            <div className={styles.statIcon}>
              <FileText size={24} color="#3b82f6" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Total Cotizaciones</p>
              <p className={styles.statValue}>
                {Object.values(estadisticas).reduce((sum, s) => sum + s.count, 0)}
              </p>
              <p className={styles.statChange}>
                {formatCurrency(Object.values(estadisticas).reduce((sum, s) => sum + s.total, 0))}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard_green}`}>
            <div className={styles.statIcon}>
              <CheckCircle size={24} color="#10b981" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Aprobadas</p>
              <p className={styles.statValue}>{estadisticas.APROBADA?.count || 0}</p>
              <p className={styles.statChange}>
                {formatCurrency(estadisticas.APROBADA?.total || 0)}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${styles.statCard_purple}`}>
            <div className={styles.statIcon}>
              <DollarSign size={24} color="#8b5cf6" />
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
              <Clock size={24} color="#f59e0b" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Pendientes</p>
              <p className={styles.statValue}>{estadisticas.PENDIENTE?.count || 0}</p>
              <p className={styles.statChange}>
                {formatCurrency(estadisticas.PENDIENTE?.total || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Charts Grid */}
      <div className={styles.dashboardGrid}>
        {/* Meta del Mes */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Meta Mensual</h2>
          </div>
          {progreso && (
            <>
              <DonutChart 
                meta={progreso.meta} 
                avance={progreso.avance} 
                titulo="" 
              />
              <div className={styles.metaInfo}>
                <div className={styles.metaInfoLabel}>
                  <Target size={18} />
                  <span>Falta para meta</span>
                </div>
                <span className={styles.metaInfoValue}>
                  {formatCurrency(Math.max(progreso.meta - progreso.avance, 0))}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Cotizaciones Recientes */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Cotizaciones Recientes</h2>
            <button className={styles.btnSecondary} onClick={() => navigate('/cotizaciones')}>
              <Eye size={16} />
              Ver todas
            </button>
          </div>

          {cotizacionesRecientes.length === 0 ? (
            <div className={styles.emptyState}>
              <FileText size={40} />
              <p className={styles.emptyTitle}>No hay cotizaciones aún</p>
              <p className={styles.emptySubtitle}>Crea tu primera cotización para comenzar</p>
            </div>
          ) : (
            <div className={styles.recentList}>
              {cotizacionesRecientes.map((cot) => (
                <div 
                  key={cot.id} 
                  className={styles.recentItem}
                  onClick={() => navigate(`/cotizaciones/${cot.id}`)}
                >
                  <div className={styles.recentItemMain}>
                    <div className={styles.recentItemLeft}>
                      <h4 className={styles.recentItemTitle}>{cot.numero}</h4>
                      <p className={styles.recentItemSubtitle}>
                        {cot.cliente?.nombre || 'Sin cliente'}
                      </p>
                    </div>
                    <div className={styles.recentItemRight}>
                      <p className={styles.recentItemAmount}>{formatCurrency(cot.total)}</p>
                      <div className={styles.recentItemDate}>
                        <Calendar size={12} />
                        <span>{formatDate(cot.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.5rem' }}>
                    {getEstadoBadge(cot.estado)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Gráfico de Líneas - Full Width */}
      <div className={styles.card}>
        <LineChart data={cotizacionesPorDia} />
      </div>
    </div>
  );
}