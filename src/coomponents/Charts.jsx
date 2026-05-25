import React, { useEffect, useRef, useState } from 'react';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

function useIsDark() {
  const [isDark, setIsDark] = useState(
    () => document.documentElement.getAttribute('data-theme') === 'dark'
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function chartColors(isDark) {
  return {
    text1:        isDark ? '#e2e8f0' : '#0f172a',
    text2:        isDark ? '#94a3b8' : '#64748b',
    gridLine:     isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
    pendiente:    isDark ? '#333a58' : '#e2e8f0',
    tooltipBg:    isDark ? '#21263d' : '#ffffff',
    tooltipBorder:isDark ? '#3b4568' : '#e2e8f0',
  };
}

// ── DonutChart ─────────────────────────────────────────────────────────────
export function DonutChart({ meta, avance, titulo = 'Meta Mensual' }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const isDark = useIsDark();

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const restante = Math.max(meta - avance, 0);
    const porcentaje = meta > 0 ? (avance / meta) * 100 : 0;
    const c = chartColors(isDark);

    let colorAprobado = '#ef4444';
    if (porcentaje >= 100) colorAprobado = '#10b981';
    else if (porcentaje >= 70) colorAprobado = '#f59e0b';

    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Aprobado', 'Pendiente'],
        datasets: [{
          data: [avance, restante],
          backgroundColor: [colorAprobado, c.pendiente],
          borderWidth: 0,
          cutout: '75%',
          borderRadius: 4,
        }],
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
              color: c.text2,
            },
          },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.text1,
            bodyColor: c.text2,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = new Intl.NumberFormat('es-PE', {
                  style: 'currency', currency: 'PEN',
                }).format(context.raw);
                return `${label}: ${value}`;
              },
            },
          },
        },
      },
      plugins: [{
        id: 'centerText',
        beforeDraw: (chart) => {
          const { width, height, ctx: c2 } = chart;
          c2.restore();
          c2.font = 'bold 24px sans-serif';
          c2.textAlign = 'center';
          c2.textBaseline = 'middle';
          c2.fillStyle = c.text1;
          c2.fillText(`${porcentaje.toFixed(1)}%`, width / 2, height / 2 - 10);
          c2.font = '12px sans-serif';
          c2.fillStyle = c.text2;
          c2.fillText('Completado', width / 2, height / 2 + 15);
          c2.save();
        },
      }],
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [meta, avance, isDark]);

  return (
    <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', minWidth: 0 }}>
      <h3 style={{ textAlign: 'center', marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
        {titulo}
      </h3>
      <canvas ref={chartRef} />
      <div style={{ marginTop: '1rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text2)', margin: '0.25rem 0' }}>
          Meta: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(meta)}
        </p>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text2)', margin: '0.25rem 0' }}>
          Aprobado: {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(avance)}
        </p>
      </div>
    </div>
  );
}

// ── BarChart (pagos proveedores por mes) ───────────────────────────────────
export function BarChart({ data, anio }) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const isDark        = useIsDark();

  useEffect(() => {
    if (!chartRef.current || !data) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx    = chartRef.current.getContext('2d');
    const c      = chartColors(isDark);
    const labels = data.map(d => d.label);
    const totals = data.map(d => d.total);

    const barColor = isDark ? 'rgba(251,146,60,0.85)' : 'rgba(234,88,12,0.80)';
    const barHover = isDark ? 'rgba(251,146,60,1)'    : 'rgba(234,88,12,1)';

    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Total a pagar',
          data: totals,
          backgroundColor: barColor,
          hoverBackgroundColor: barHover,
          borderRadius: 5,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.text1,
            bodyColor: c.text2,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (ctx) => {
                const row = data[ctx.dataIndex];
                const fmt = new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(ctx.raw);
                return [`Total: ${fmt}`, `Cuotas: ${row.cuotas}`];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: c.gridLine },
            ticks: {
              color: c.text2,
              callback: (v) =>
                new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact' }).format(v),
            },
          },
          x: {
            grid: { display: false },
            ticks: { color: c.text2 },
          },
        },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data, isDark]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
        Costo mensual proveedores — {anio}
        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text3)', marginLeft: '0.5rem' }}>
          (cuotas pendientes)
        </span>
      </h3>
      <div style={{ position: 'relative', flex: 1, minHeight: '220px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}

// ── LineChart ───────────────────────────────────────────────────────────────
export function LineChart({ data }) {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const isDark = useIsDark();

  useEffect(() => {
    if (!chartRef.current || !data) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const ctx = chartRef.current.getContext('2d');
    const c = chartColors(isDark);

    const labels   = data.map(d => `Día ${d.dia}`);
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
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99,102,241,0.1)',
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
            borderColor: '#14b8a6',
            backgroundColor: 'rgba(20,184,166,0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 6,
            pointBackgroundColor: '#14b8a6',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              color: c.text2,
            },
          },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor: c.text1,
            bodyColor: c.text2,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = new Intl.NumberFormat('es-PE', {
                  style: 'currency', currency: 'PEN',
                }).format(context.raw);
                return `${label}: ${value}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: c.gridLine },
            ticks: {
              color: c.text2,
              callback: (value) =>
                new Intl.NumberFormat('es-PE', {
                  style: 'currency', currency: 'PEN', notation: 'compact',
                }).format(value),
            },
          },
          x: {
            grid: { color: c.gridLine },
            ticks: {
              color: c.text2,
              maxRotation: 45,
              minRotation: 45,
            },
          },
        },
      },
    });

    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [data, isDark]);

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
        Cotizaciones del Mes
      </h3>
      <div style={{ position: 'relative', flex: 1, minHeight: '250px', width: '100%' }}>
        <canvas ref={chartRef} />
      </div>
    </div>
  );
}
