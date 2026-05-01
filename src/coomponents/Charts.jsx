// src/components/Charts.jsx
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
    const porcentaje = meta > 0 ? ((avance / meta) * 100) : 0;
    
    // Semaforización
    let colorAprobado = '#ef4444'; // Red para < 70%
    if (porcentaje >= 100) {
      colorAprobado = '#10b981'; // Green para >= 100%
    } else if (porcentaje >= 70) {
      colorAprobado = '#f59e0b'; // Yellow para 70-99%
    }

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aprobado', 'Pendiente'],
        datasets: [{
          data: [avance, restante],
          backgroundColor: [colorAprobado, '#f1f5f9'],
          borderWidth: 0,
          cutout: '75%',
          borderRadius: 4,
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
          ctx.fillStyle = '#0f172a';
          ctx.fillText(`${porcentaje.toFixed(1)}%`, width / 2, height / 2 - 10);
          
          ctx.font = '12px sans-serif';
          ctx.fillStyle = '#64748b';
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
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', minWidth: 0 }}>
      <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
        {titulo}
      </h3>
      <canvas ref={chartRef}></canvas>
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Meta: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(meta)}
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          Aprobado: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(avance)}
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
            borderColor: '#6366f1', // Indigo
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#6366f1',
          },
          {
            label: 'Cotizaciones Aprobadas',
            data: aprobadas,
            borderColor: '#14b8a6', // Teal
            backgroundColor: 'rgba(20, 184, 166, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#14b8a6',
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600' }}>
        Cotizaciones del Mes
      </h3>
      <div style={{ position: 'relative', flex: 1, minHeight: '250px', width: '100%' }}>
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}