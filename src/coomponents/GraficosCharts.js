import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

// 📊 GRÁFICO DE DONUT - Meta vs Avance
export function DonutChart({ meta, avance, titulo = "Meta Mensual" }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Destruir gráfico previo
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    const restante = Math.max(meta - avance, 0);
    const porcentaje = meta > 0 ? ((avance / meta) * 100).toFixed(1) : 0;

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Facturado', 'Pendiente'],
        datasets: [{
          data: [avance, restante],
          backgroundColor: ['#10b981', '#e5e7eb'],
          borderWidth: 0,
          cutout: '70%',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              padding: 15,
              font: { size: 12 },
              usePointStyle: true,
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN'
                }).format(context.raw);
                return `${label}: ${value}`;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: (chart) => {
          const { width, height, ctx } = chart;
          ctx.restore();
          ctx.font = 'bold 24px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#111827';
          ctx.fillText(`${porcentaje}%`, width / 2, height / 2 - 10);
          
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#6b7280';
          ctx.fillText('Completado', width / 2, height / 2 + 15);
          ctx.save();
        }
      }]
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [meta, avance]);

  return (
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
      <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
        {titulo}
      </h3>
      <canvas ref={chartRef}></canvas>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Meta: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(meta)}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Facturado: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(avance)}
        </p>
      </div>
    </div>
  );
}

// 📈 GRÁFICO DE LÍNEAS - Cotizaciones por día
export function LineChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    
    const labels = data.map(d => `Día ${d.dia}`);
    const enviadas = data.map(d => d.totalEnviadas);
    const aprobadas = data.map(d => d.totalAprobadas);

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cotizaciones Enviadas',
            data: enviadas,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: 'Cotizaciones Aprobadas',
            data: aprobadas,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN'
                }).format(context.raw);
                return `${label}: ${value}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => {
                return new Intl.NumberFormat('es-PE', {
                  style: 'currency',
                  currency: 'PEN',
                  notation: 'compact'
                }).format(value);
              }
            }
          },
          x: {
            ticks: {
              maxRotation: 45,
              minRotation: 45,
            }
          }
        }
      }
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data]);

  return (
    <div style={{ width: '100%' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
        Cotizaciones del Mes
      </h3>
      <canvas ref={chartRef}></canvas>
    </div>
  );
}

// 📊 DEMO - Ejemplo de uso
export default function ChartDemo() {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#f9fafb', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '2rem', textAlign: 'center' }}>
        Gráficos de Cotizaciones
      </h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <DonutChart meta={50000} avance={32000} titulo="Mi Meta Mensual" />
        </div>
        
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <DonutChart meta={150000} avance={98000} titulo="Meta General del Equipo" />
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <LineChart data={generateMockData()} />
      </div>
    </div>
  );
}

// Generar datos de ejemplo
function generateMockData() {
  return Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    enviadas: Math.floor(Math.random() * 5),
    aprobadas: Math.floor(Math.random() * 3),
    totalEnviadas: Math.floor(Math.random() * 15000) + 5000,
    totalAprobadas: Math.floor(Math.random() * 10000) + 2000,
  }));
}