import React, { useEffect, useState } from 'react';
import { DonutChart, LineChart } from '../coomponents/Charts';
import { 
  getProgresoTodosVendedores, 
  getCotizacionesPorDia,
  setMetaMensual 
} from '../api/stats';
import { Target, TrendingUp, Users, Edit2, Save, X } from 'lucide-react';

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
      
      setDatos(progresosRes.data);
      setCotizacionesPorDia(cotizacionesRes.data);
    } catch (error) {
      console.error('Error al cargar datos:', error);
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
      
      // Recargar datos
      await cargarDatos();
    } catch (error) {
      console.error('Error al guardar meta:', error);
      alert('Error al guardar la meta');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Cargando estadísticas...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          Dashboard Administrativo
        </h1>
        <p style={{ color: '#6b7280' }}>
          Monitorea el desempeño del equipo de ventas
        </p>
      </div>

      {/* KPIs Principales */}
      {datos && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '1.5rem', 
          marginBottom: '2rem' 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              backgroundColor: '#dbeafe', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Target size={24} color="#2563eb" />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Meta Total
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                {new Intl.NumberFormat('es-PE', { 
                  style: 'currency', 
                  currency: 'PEN',
                  notation: 'compact'
                }).format(datos.general.meta)}
              </p>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              backgroundColor: '#d1fae5', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TrendingUp size={24} color="#059669" />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Facturado Total
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#059669' }}>
                {new Intl.NumberFormat('es-PE', { 
                  style: 'currency', 
                  currency: 'PEN',
                  notation: 'compact'
                }).format(datos.general.avance)}
              </p>
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              width: '48px', 
              height: '48px', 
              backgroundColor: '#fef3c7', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={24} color="#d97706" />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Progreso General
              </p>
              <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>
                {datos.general.porcentaje.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos Principales */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '1.5rem', 
        marginBottom: '2rem' 
      }}>
        {datos && (
          <div style={{ 
            backgroundColor: 'white', 
            padding: '1.5rem', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
          }}>
            <DonutChart 
              meta={datos.general.meta} 
              avance={datos.general.avance} 
              titulo="Meta General del Equipo" 
            />
          </div>
        )}

        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <LineChart data={cotizacionesPorDia} />
        </div>
      </div>

      {/* Tabla de Vendedores */}
      {datos && datos.vendedores.length > 0 && (
        <div style={{ 
          backgroundColor: 'white', 
          padding: '1.5rem', 
          borderRadius: '12px', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
        }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem' }}>
            Desempeño por Vendedor
          </h2>
          
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
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem' 
                      }}>
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
                        <span style={{ 
                          fontSize: '0.875rem', 
                          fontWeight: '500',
                          minWidth: '45px'
                        }}>
                          {vendedor.porcentaje.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {editandoMeta === vendedor.vendedorId ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => guardarMeta(vendedor.vendedorId)}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={cancelarEdicion}
                            style={{
                              padding: '0.5rem',
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => iniciarEdicion(vendedor)}
                          style={{
                            padding: '0.5rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}
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