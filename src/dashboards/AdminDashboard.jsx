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
        <div
          style={{
            background: "#fff",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 4px rgba(0,0,0,.06)",
            overflow: "hidden",
            marginTop: "1.5rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "1rem 1.25rem",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <h3 style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "#111" }}>
              Desempeño por Vendedor
            </h3>
            <button
              onClick={cargarDatos}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem",
                fontSize: "0.8rem",
              }}
            >
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>

          {/* Tabla */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Vendedor", "Meta", "Facturado", "Progreso", "Acciones"].map((h) => (
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
                            width: "120px",
                            fontSize: "0.875rem",
                          }}
                          placeholder="Monto"
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>
                          {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(vendedor.meta)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "0.7rem 1rem" }}>
                      <span style={{ fontWeight: 600, color: "#059669" }}>
                        {new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(vendedor.avance)}
                      </span>
                    </td>
                    <td style={{ padding: "0.7rem 1rem", minWidth: "180px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <div style={{ flex: 1, height: "6px", backgroundColor: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${Math.min(vendedor.porcentaje, 100)}%`,
                              height: "100%",
                              backgroundColor: vendedor.porcentaje >= 100 ? "#10b981" : "#3b82f6",
                              transition: "width 0.3s",
                            }}
                          />
                        </div>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            minWidth: "40px",
                            color: vendedor.porcentaje >= 100 ? "#059669" : "#374151",
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
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.35rem 0.75rem",
                              background: "#059669",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <Save size={13} /> Guardar
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              padding: "0.35rem 0.75rem",
                              background: "#ef4444",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            <X size={13} /> Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicion(vendedor)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            padding: "0.35rem 0.75rem",
                            background: "#f9fafb",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            cursor: "pointer",
                          }}
                        >
                          <Edit2 size={13} /> Editar Meta
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