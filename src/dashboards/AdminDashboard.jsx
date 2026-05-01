import React, { useEffect, useState } from 'react';
import { DonutChart, LineChart } from '../coomponents/Charts';
import {
  getProgresoTodosVendedores,
  getCotizacionesPorDia,
  setMetaMensual
} from '../api/stats';
import { Target, TrendingUp, Users, Edit2, Save, X, RefreshCw } from 'lucide-react';
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

      {/* Top Section */}
      <div className={styles.topSection}>
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

        <div className={styles.badgesStack}>
          <div className={`${styles.statCard} ${styles.statCard_indigo}`}>
            <div className={styles.statIcon} style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <Target size={26} color="#6366f1" />
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

          <div className={`${styles.statCard} ${styles.statCard_teal}`}>
            <div className={styles.statIcon} style={{ background: 'rgba(20, 184, 166, 0.1)', padding: '10px', borderRadius: '10px' }}>
              <TrendingUp size={26} color="#14b8a6" />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Aprobado Total</p>
              <p className={styles.statValue} style={{color: '#0f766e'}}>
                {new Intl.NumberFormat('es-PE', { 
                  style: 'currency', 
                  currency: 'PEN',
                  notation: 'compact'
                }).format(datos.general.avance)}
              </p>
            </div>
          </div>

          <div className={`${styles.statCard} ${
            datos.general.porcentaje >= 100 ? styles.statCard_emerald : 
            datos.general.porcentaje >= 70 ? styles.statCard_amber : styles.statCard_red
          }`}>
            <div className={styles.statIcon} style={{ 
              background: datos.general.porcentaje >= 100 ? 'rgba(16, 185, 129, 0.1)' : 
                          datos.general.porcentaje >= 70 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              padding: '10px', borderRadius: '10px' 
            }}>
              <Users size={26} color={
                datos.general.porcentaje >= 100 ? '#10b981' : 
                datos.general.porcentaje >= 70 ? '#f59e0b' : '#ef4444'
              } />
            </div>
            <div className={styles.statContent}>
              <p className={styles.statLabel}>Progreso General</p>
              <p className={styles.statValue} style={{
                color: datos.general.porcentaje >= 100 ? '#059669' : 
                       datos.general.porcentaje >= 70 ? '#d97706' : '#dc2626'
              }}>
                {datos.general.porcentaje.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className={styles.bottomSection}>
        <div className={styles.tableCard}>
          {datos && datos.vendedores.length > 0 && (
            <>
              {/* Header Tabla */}
              <div className={styles.tableHeader}>
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#111" }}>
                  Desempeño por Vendedor
                </h3>
                <button onClick={cargarDatos} className={styles.btnRefresh}>
                  <RefreshCw size={14} /> Actualizar
                </button>
              </div>

              {/* Tabla */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Vendedor", "Meta", "Aprobado", "Progreso", "Acciones"].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "0.6rem 1rem",
                            textAlign: "left",
                            fontWeight: 600,
                            fontSize: "0.75rem",
                            color: "#6b7280",
                            textTransform: "uppercase",
                            letterSpacing: "0.04em",
                            borderBottom: "1px solid #e5e7eb",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.vendedores.map((vendedor) => (
                      <tr key={vendedor.vendedorId} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          <div style={{ fontWeight: 500 }}>{vendedor.vendedor}</div>
                          <div style={{ fontSize: "0.78rem", color: "#9ca3af" }}>{vendedor.email}</div>
                        </td>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          {editandoMeta === vendedor.vendedorId ? (
                            <input
                              type="number"
                              value={nuevoMonto}
                              onChange={(e) => setNuevoMonto(e.target.value)}
                              style={{
                                padding: "0.4rem 0.6rem",
                                border: "1px solid #d1d5db",
                                borderRadius: "6px",
                                width: "100px",
                                fontSize: "0.875rem",
                              }}
                              placeholder="Monto"
                            />
                          ) : (
                            <span style={{ fontWeight: 500 }}>
                              {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" }).format(vendedor.meta)}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          <span style={{ fontWeight: 600, color: "#059669" }}>
                            {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" }).format(vendedor.avance)}
                          </span>
                        </td>
                        <td style={{ padding: "0.7rem 1rem", minWidth: "120px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div style={{ flex: 1, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.min(vendedor.porcentaje, 100)}%`,
                                  height: "100%",
                                  backgroundColor: vendedor.porcentaje >= 100 ? "#10b981" : 
                                                   vendedor.porcentaje >= 70 ? "#f59e0b" : "#ef4444",
                                  transition: "width 0.3s",
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                minWidth: "35px",
                                color: vendedor.porcentaje >= 100 ? "#059669" : 
                                       vendedor.porcentaje >= 70 ? "#d97706" : "#dc2626",
                              }}
                            >
                              {vendedor.porcentaje.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "0.7rem 1rem" }}>
                          {editandoMeta === vendedor.vendedorId ? (
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                onClick={() => guardarMeta(vendedor.vendedorId)}
                                className={styles.btnTableSave}
                              >
                                <Save size={13} />
                              </button>
                              <button
                                onClick={cancelarEdicion}
                                className={styles.btnTableCancel}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarEdicion(vendedor)}
                              className={styles.btnTableEdit}
                            >
                              <Edit2 size={13} /> Meta
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className={styles.solicitudesWrapper}>
          <SolicitudesMargenPanel />
        </div>
      </div>
    </div>
  );
}