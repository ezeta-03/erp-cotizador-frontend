import React, { useEffect, useState } from 'react';
import { DonutChart, LineChart } from '../coomponents/Charts';
import {
  getProgresoTodosVendedores,
  getCotizacionesPorDia,
  setMetaMensual
} from '../api/stats';
import { Target, TrendingUp, Users, Edit2, Save, X } from 'lucide-react';
import SolicitudesMargenPanel from '../coomponents/SolicitudesMargenPanel';
import styles from './AdminDashboard.module.scss';

export default function AdminDashboard() {
  const [datos, setDatos] = useState(null);
  const [cotizacionesPorDia, setCotizacionesPorDia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoMeta, setEditandoMeta] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [progresosRes, cotizacionesRes] = await Promise.all([
        getProgresoTodosVendedores(),
        getCotizacionesPorDia()
      ]);
      
      console.log('📊 Datos recibidos de progreso:', progresosRes);
      console.log('📊 Datos recibidos de cotizaciones:', cotizacionesRes);
      
      setDatos(progresosRes);
      setCotizacionesPorDia(cotizacionesRes);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      alert('Error al cargar datos: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const iniciarEdicion = (vendedor) => {
    setEditandoMeta(vendedor.vendedorId);
    setNuevoMonto(vendedor.meta.toString());
  };

  const cancelarEdicion = () => {
    setEditandoMeta(null);
    setNuevoMonto('');
  };

  const guardarMeta = async (vendedorId) => {
    try {
      const monto = parseFloat(nuevoMonto);
      if (isNaN(monto) || monto < 0) {
        alert('Por favor ingresa un monto válido');
        return;
      }

      await setMetaMensual(vendedorId, monto);
      setEditandoMeta(null);
      setNuevoMonto('');
      
      await cargarDatos();
    } catch (error) {
      console.error('Error al guardar meta:', error);
      alert('Error al guardar la meta');
    }
  };

  if (loading) {
    return (
      <div className={styles.dashboardPage}>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <div className={styles.dashboardPage}>
        <p>No se pudieron cargar los datos.</p>
      </div>
    );
  }

  return (
    <div className={styles.dashboardPage}>
      {/* Header */}
      <div className={styles.dashboardHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard Administrativo</h1>
          <p className={styles.pageSubtitle}>Monitorea el desempeño del equipo de ventas</p>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.statsGrid}>
        <div className={`${styles.statCard} ${styles.statCard_blue}`}>
          <div className={styles.statIcon}>
            <Target size={32} color="#3b82f6" />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Meta Total</p>
            <p className={styles.statValue}>
              {new Intl.NumberFormat('es-PE', { 
                style: 'currency', 
                currency: 'PEN',
                notation: 'compact'
              }).format(datos.general.meta)}
            </p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCard_green}`}>
          <div className={styles.statIcon}>
            <TrendingUp size={32} color="#10b981" />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Facturado Total</p>
            <p className={styles.statValue} style={{color: '#059669'}}>
              {new Intl.NumberFormat('es-PE', { 
                style: 'currency', 
                currency: 'PEN',
                notation: 'compact'
              }).format(datos.general.avance)}
            </p>
          </div>
        </div>

        <div className={`${styles.statCard} ${styles.statCard_yellow}`}>
          <div className={styles.statIcon}>
            <Users size={32} color="#d97706" />
          </div>
          <div className={styles.statContent}>
            <p className={styles.statLabel}>Progreso General</p>
            <p className={styles.statValue} style={{color: '#d97706'}}>
              {datos.general.porcentaje.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className={styles.dashboardGrid}>
        <div className={styles.card}>
          <DonutChart 
            meta={datos.general.meta} 
            avance={datos.general.avance} 
            titulo="Meta General del Equipo" 
          />
        </div>

        <div className={styles.card}>
          <LineChart data={cotizacionesPorDia} />
        </div>
      </div>

      {/* Solicitudes de margen reducido */}
      <SolicitudesMargenPanel />

      {/* Tabla de Vendedores */}
      {datos && datos.vendedores.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Desempeño por Vendedor</h2>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                    Vendedor
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                    Meta
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                    Facturado
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                    Progreso
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600', color: '#6b7280' }}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {datos.vendedores.map((vendedor) => (
                  <tr key={vendedor.vendedorId} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '0.75rem' }}>
                      <div>
                        <p style={{ fontWeight: '500' }}>{vendedor.vendedor}</p>
                        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{vendedor.email}</p>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editandoMeta === vendedor.vendedorId ? (
                        <input
                          type="number"
                          value={nuevoMonto}
                          onChange={(e) => setNuevoMonto(e.target.value)}
                          style={{
                            padding: '0.5rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            width: '120px'
                          }}
                          placeholder="Monto"
                        />
                      ) : (
                        <p style={{ fontWeight: '500' }}>
                          {new Intl.NumberFormat('es-PE', { 
                            style: 'currency', 
                            currency: 'PEN' 
                          }).format(vendedor.meta)}
                        </p>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <p style={{ fontWeight: '500', color: '#059669' }}>
                        {new Intl.NumberFormat('es-PE', { 
                          style: 'currency', 
                          currency: 'PEN' 
                        }).format(vendedor.avance)}
                      </p>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          flex: 1,
                          height: '8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '999px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${Math.min(vendedor.porcentaje, 100)}%`,
                            height: '100%',
                            backgroundColor: vendedor.porcentaje >= 100 ? '#10b981' : '#3b82f6',
                            transition: 'width 0.3s'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.875rem', fontWeight: '500', minWidth: '45px' }}>
                          {vendedor.porcentaje.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editandoMeta === vendedor.vendedorId ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => guardarMeta(vendedor.vendedorId)}
                            className={styles.btnApprove}
                            style={{ padding: '0.5rem', fontSize: '0.875rem' }}
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            className={styles.btnReject}
                            style={{ padding: '0.5rem', fontSize: '0.875rem', backgroundColor: '#ef4444' }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicion(vendedor)}
                          className={styles.btnEdit}
                          style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
                        >
                          <Edit2 size={16} />
                          Editar Meta
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}