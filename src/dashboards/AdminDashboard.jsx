import React, { useEffect, useState } from 'react';
import { DonutChart, LineChart, BarChart } from '../coomponents/Charts';
import {
  getProgresoTodosVendedores,
  getCotizacionesPorDia,
  setMetaMensual,
  getMetaMensualLog,
} from '../api/stats';
import { getResumenPagos } from '../api/proveedores';
import { Target, TrendingUp, Users, Edit2, Save, X, RefreshCw, History } from 'lucide-react';
import Spinner from '../coomponents/Spinner';
import SolicitudesMargenPanel from '../coomponents/SolicitudesMargenPanel';
import styles from './AdminDashboard.module.scss';

export default function AdminDashboard() {
  const anioActual = new Date().getFullYear();

  const [datos, setDatos] = useState(null);
  const [cotizacionesPorDia, setCotizacionesPorDia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editandoMeta, setEditandoMeta] = useState(null);
  const [nuevoMonto, setNuevoMonto] = useState('');
  const [logVendedor, setLogVendedor] = useState(null);
  const [logEntradas, setLogEntradas] = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [resumenPagos, setResumenPagos] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [progresosRes, cotizacionesRes, pagosRes] = await Promise.all([
        getProgresoTodosVendedores(),
        getCotizacionesPorDia(),
        getResumenPagos(anioActual),
      ]);
      
      console.log('📊 Datos recibidos de progreso:', progresosRes);
      console.log('📊 Datos recibidos de cotizaciones:', cotizacionesRes);
      
      setDatos(progresosRes);
      setCotizacionesPorDia(cotizacionesRes);
      setResumenPagos(pagosRes);
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

  const verHistorialMeta = async (vendedor) => {
    setLogVendedor(vendedor);
    setLoadingLog(true);
    try {
      const entradas = await getMetaMensualLog(vendedor.vendedorId);
      setLogEntradas(entradas);
    } catch {
      setLogEntradas([]);
    } finally {
      setLoadingLog(false);
    }
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
      <div className={styles.dashboardPage} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.75rem", minHeight: "40vh", color: "var(--color-text2)" }}>
        <Spinner size={24} /> Cargando estadísticas...
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
                <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-text1)" }}>
                  Desempeño por Vendedor
                </h3>
                <button onClick={cargarDatos} className={styles.btnRefresh}>
                  <RefreshCw size={14} /> Actualizar
                </button>
              </div>

              {/* Tabla */}
              <table className={styles.vendedoresTable}>
                  <thead>
                    <tr>
                      {["Vendedor", "Meta", "Aprobado", "Progreso", "Acciones"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {datos.vendedores.map((vendedor) => (
                      <tr key={vendedor.vendedorId}>
                        <td>
                          <div className={styles.vendedorNombre}>{vendedor.vendedor}</div>
                          <div className={styles.vendedorEmail}>{vendedor.email}</div>
                        </td>
                        <td>
                          {editandoMeta === vendedor.vendedorId ? (
                            <input
                              type="number"
                              value={nuevoMonto}
                              onChange={(e) => setNuevoMonto(e.target.value)}
                              className={styles.metaInput}
                              placeholder="Monto"
                            />
                          ) : (
                            <span style={{ fontWeight: 500 }}>
                              {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" }).format(vendedor.meta)}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className={styles.vendedorAvance}>
                            {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" }).format(vendedor.avance)}
                          </span>
                        </td>
                        <td style={{ minWidth: "120px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <div className={styles.progressTrack}>
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
                        <td>
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
                            <div style={{ display: "flex", gap: "0.4rem" }}>
                              <button
                                onClick={() => iniciarEdicion(vendedor)}
                                className={styles.btnTableEdit}
                              >
                                <Edit2 size={13} /> Meta
                              </button>
                              <button
                                onClick={() => verHistorialMeta(vendedor)}
                                className={styles.btnTableHistory}
                                title="Ver historial de cambios"
                              >
                                <History size={13} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </>
          )}
        </div>

        <div className={styles.solicitudesWrapper}>
          <SolicitudesMargenPanel />
        </div>
      </div>

      {/* Widget pagos proveedores */}
      {resumenPagos && (
        <div className={styles.card} style={{ marginTop: '1.5rem', height: '320px' }}>
          <BarChart data={resumenPagos.meses} anio={resumenPagos.anio} />
        </div>
      )}

      {logVendedor && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)",
          backdropFilter: "blur(3px)", zIndex: 1200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem",
        }}>
          <div style={{
            background: "var(--color-surface)", borderRadius: "12px", width: "100%", maxWidth: "480px",
            boxShadow: "var(--shadow-modal)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "1rem 1.25rem", borderBottom: "1px solid var(--color-border)",
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text1)" }}>
                  Historial de meta — {logVendedor.vendedor}
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text2)" }}>Últimos 20 cambios</p>
              </div>
              <button
                onClick={() => setLogVendedor(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text2)" }}
              >
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "1rem 1.25rem", maxHeight: "400px", overflowY: "auto" }}>
              {loadingLog ? (
                <p style={{ color: "var(--color-text3)", fontSize: "0.875rem" }}>Cargando...</p>
              ) : logEntradas.length === 0 ? (
                <p style={{ color: "var(--color-text3)", fontSize: "0.875rem" }}>Sin cambios registrados aún.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ background: "var(--color-surface2)" }}>
                      {["Anterior", "Nuevo", "Cambiado por", "Fecha"].map((h) => (
                        <th key={h} style={{
                          padding: "0.4rem 0.6rem", textAlign: "left", fontWeight: 600,
                          fontSize: "0.72rem", color: "var(--color-text2)", textTransform: "uppercase",
                          letterSpacing: "0.04em", borderBottom: "1px solid var(--color-border)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {logEntradas.map((e) => {
                      const fmt = (v) => v != null
                        ? new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", notation: "compact" }).format(v)
                        : "—";
                      return (
                        <tr key={e.id} style={{ borderBottom: "1px solid var(--color-border2)" }}>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--color-text2)" }}>{fmt(e.montoAnterior)}</td>
                          <td style={{ padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text1)" }}>{fmt(e.montoNuevo)}</td>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--color-text1)" }}>{e.cambiadoPor?.nombre}</td>
                          <td style={{ padding: "0.5rem 0.6rem", color: "var(--color-text3)", whiteSpace: "nowrap" }}>
                            {new Date(e.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}
                            {" · "}
                            {new Date(e.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}