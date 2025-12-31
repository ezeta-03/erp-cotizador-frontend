import { Link } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { FileText, TrendingUp, Package, DollarSign, Plus, Eye } from 'lucide-react';
import styles from './AdminDashboard.module.scss';


export default function AdminDashboard() {
   const navigate = useNavigate();
  // Estadísticas rápidas
  const stats = [
    { label: 'Cotizaciones', value: '3', icon: FileText, color: 'blue', change: '+12%' },
    { label: 'Aprobadas', value: '1', icon: TrendingUp, color: 'green', change: '+8%' },
    { label: 'En proceso', value: '1', icon: Package, color: 'yellow', change: '+3%' },
    { label: 'Total S/', value: '1,820', icon: DollarSign, color: 'indigo', change: '+15%' },
  ];

  // Cotizaciones recientes
  const recentCotizaciones = [
    { id: 1, numero: 'COT-001', cliente: 'Empresa Demo SAC', proyecto: 'Campaña Digital', total: 1820, estado: 'aprobada', fecha: '2025-12-18' },
    { id: 2, numero: 'COT-002', cliente: 'Empresa Demo SAC', proyecto: 'Branding', total: 6000, estado: 'rechazada', fecha: '2025-12-20' },
    { id: 3, numero: 'COT-003', cliente: 'Empresa Demo SAC', proyecto: 'Evento Lanzamiento', total: 1080, estado: 'enviada', fecha: '2025-12-20' },
  ];

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);

  const getEstadoBadgeClass = (estado) => {
    const clases = {
      aprobada: styles.badgeSuccess,
      enviada: styles.badgeInfo,
      borrador: styles.badgeDefault,
      rechazada: styles.badgeDanger,
    };
    return clases[estado] || styles.badgeDefault;
  };

  return (
    <div className={styles.dashboardPage}>
      {/* HEADER */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Bienvenido al sistema de cotizació de Zaazmago</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => navigate('/cotizaciones/nueva')}>
          <Plus size={20} />
          Nueva Cotización
        </button>
      </div>

      {/* STAT CARDS */}
      <div className={styles.statsGrid}>
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className={`${styles.statCard} ${styles[`statCard_${stat.color}`]}`}>
              <div className={styles.statIcon}><Icon size={24} /></div>
              <div className={styles.statContent}>
                <p className={styles.statLabel}>{stat.label}</p>
                <p className={styles.statValue}>{stat.value}</p>
                <p className={styles.statChange}>{stat.change} este mes</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* MAIN GRID */}
      <div className={styles.dashboardGrid}>

        {/* ACCIONES RÁPIDAS */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Acciones Rápidas</h2>
          </div>

          <div className={styles.quickActions}>
            <button className={styles.quickActionBtn} onClick={() => navigate('/cotizaciones/nueva')}>
              <div className={`${styles.quickActionIcon} ${styles.primary}`}><Plus size={24} /></div>
              <div className={styles.quickActionContent}>
                <h3>Nueva Cotización</h3>
                <p>Crear cotización rápida</p>
              </div>
            </button>

            <button className={styles.quickActionBtn} onClick={() => navigate('/cotizaciones')}>
              <div className={`${styles.quickActionIcon} ${styles.info}`}><Eye size={24} /></div>
              <div className={styles.quickActionContent}>
                <h3>Ver Cotizaciones</h3>
                <p>Revisar todas las cotizaciones</p>
              </div>
            </button>

            <button className={styles.quickActionBtn} onClick={() => navigate('/clientes')}>
              <div className={`${styles.quickActionIcon} ${styles.success}`}><FileText size={24} /></div>
              <div className={styles.quickActionContent}>
                <h3>Gestionar Clientes</h3>
                <p>Ver y editar clientes</p>
              </div>
            </button>
          </div>
        </div>

        {/* COTIZACIONES RECIENTES */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Cotizaciones Recientes</h2>
            <button className={styles.btnGhost} onClick={() => onNavigate('cotizaciones')}>
              Ver todas
            </button>
          </div>

          <div className={styles.recentList}>
            {recentCotizaciones.map((cot) => (
              <div key={cot.id} className={styles.recentItem}>
                <div className={styles.recentItemMain}>
                  <div>
                    <h4 className={styles.recentItemTitle}>{cot.numero}</h4>
                    <p className={styles.recentItemSubtitle}>{cot.proyecto}</p>
                    <p className={styles.recentItemMeta}>{cot.cliente}</p>
                  </div>
                  <div className={styles.recentItemRight}>
                    <p className={styles.recentItemAmount}>{formatCurrency(cot.total)}</p>
                    <span className={getEstadoBadgeClass(cot.estado)}>{cot.estado}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
