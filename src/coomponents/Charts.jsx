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

// ── Paleta compartida ──────────────────────────────────────────────────────
const PALETTE = [
  '#f97316','#3b82f6','#10b981','#8b5cf6','#ef4444',
  '#06b6d4','#f59e0b','#ec4899','#84cc16','#6366f1',
];

const fmt = (v) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v);

// ── ProveedoresChart: área apilada por proveedor ───────────────────────────
export function ProveedoresChart({ data, anio }) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const isDark        = useIsDark();

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = null;

    const rawDatasets = data?.datasets;
    if (!Array.isArray(rawDatasets) || rawDatasets.length === 0) return;

    const ctx    = chartRef.current.getContext('2d');
    const c      = chartColors(isDark);
    const labels = data.meses.map(m => m.label);

    const datasets = rawDatasets.map((ds, i) => {
      const color = PALETTE[i % PALETTE.length];
      return {
        label:            ds.codigo,
        data:             ds.data,
        borderColor:      color,
        backgroundColor:  color + (isDark ? '30' : '25'),
        borderWidth:      2,
        fill:             true,
        tension:          0.35,
        pointRadius:      ds.data.map(v => v > 0 ? 3 : 0),
        pointHoverRadius: 6,
        pointBackgroundColor: color,
        pointBorderColor:     isDark ? '#1e2535' : '#ffffff',
        pointBorderWidth:     1.5,
        _ubicacion: ds.ubicacion,
        _ciudad:    ds.ciudad,
      };
    });

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 10,
              font: { size: 10.5 },
              color: c.text2,
              boxWidth: 8,
            },
          },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor:  c.text1,
            bodyColor:   c.text2,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => {
                if (item.raw === 0) return null;
                const ds = rawDatasets[item.datasetIndex];
                const loc = ds.ciudad || ds.ubicacion.split(' - ')[0];
                return `${ds.codigo} (${loc}): ${fmt(item.raw)}`;
              },
              footer: (items) => {
                const total = items.reduce((s, i) => s + i.raw, 0);
                return total > 0 ? `Total: ${fmt(total)}` : '';
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.text2, font: { size: 11 } },
          },
          y: {
            stacked:     true,
            beginAtZero: true,
            grid: { color: c.gridLine },
            ticks: {
              color: c.text2,
              callback: (v) => new Intl.NumberFormat('es-PE', {
                style: 'currency', currency: 'PEN', notation: 'compact',
              }).format(v),
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    };
  }, [data, isDark]);

  const sinDatos = !Array.isArray(data?.datasets) || data.datasets.length === 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
          Costo por proveedor — {anio}
        </h3>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--color-text3)' }}>
          cuotas pendientes · clic en leyenda para aislar
        </p>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: '260px', width: '100%' }}>
        <canvas ref={chartRef} style={{ display: sinDatos ? 'none' : 'block' }} />
        {sinDatos && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text3)', fontSize: '0.875rem' }}>
            Sin cuotas pendientes para {anio}
          </div>
        )}
      </div>
    </div>
  );
}

// ── TotalMensualChart: línea simple del gasto total mensual ────────────────
export function TotalMensualChart({ data, anio }) {
  const chartRef      = useRef(null);
  const chartInstance = useRef(null);
  const isDark        = useIsDark();

  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();
    chartInstance.current = null;

    const rawDatasets = data?.datasets;
    if (!Array.isArray(rawDatasets) || rawDatasets.length === 0) return;

    const ctx    = chartRef.current.getContext('2d');
    const c      = chartColors(isDark);
    const labels = data.meses.map(m => m.label);

    const totales = data.meses.map((_, i) =>
      parseFloat(rawDatasets.reduce((sum, ds) => sum + ds.data[i], 0).toFixed(2))
    );

    const maxIdx = totales.indexOf(Math.max(...totales));
    const color  = '#6366f1';

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label:                'Total mensual',
          data:                 totales,
          borderColor:          color,
          backgroundColor:      isDark ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.08)',
          borderWidth:          2.5,
          fill:                 true,
          tension:              0.4,
          pointRadius:          totales.map((v, i) => i === maxIdx ? 6 : v > 0 ? 3.5 : 0),
          pointHoverRadius:     7,
          pointBackgroundColor: totales.map((_, i) => i === maxIdx ? '#ef4444' : color),
          pointBorderColor:     isDark ? '#1e2535' : '#ffffff',
          pointBorderWidth:     2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: c.tooltipBg,
            titleColor:  c.text1,
            bodyColor:   c.text2,
            borderColor: c.tooltipBorder,
            borderWidth: 1,
            callbacks: {
              label: (item) => `Total: ${fmt(item.raw)}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: c.text2, font: { size: 11 } },
          },
          y: {
            beginAtZero: true,
            grid: { color: c.gridLine },
            ticks: {
              color: c.text2,
              callback: (v) => new Intl.NumberFormat('es-PE', {
                style: 'currency', currency: 'PEN', notation: 'compact',
              }).format(v),
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    };
  }, [data, isDark]);

  const sinDatos = !Array.isArray(data?.datasets) || data.datasets.length === 0;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
          Total mensual — {anio}
        </h3>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--color-text3)' }}>
          pico marcado en rojo
        </p>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: '200px', width: '100%' }}>
        <canvas ref={chartRef} style={{ display: sinDatos ? 'none' : 'block' }} />
        {sinDatos && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text3)', fontSize: '0.875rem' }}>
            Sin datos para {anio}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ProveedoresKPI: panel de totales anuales por proveedor ─────────────────
export function ProveedoresKPI({ data, anio }) {
  if (!data?.resumen || data.resumen.length === 0) return null;

  const { resumen, totalPendiente, totalCancelado } = data;
  const totalAnual = totalPendiente + totalCancelado;

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
      {/* Encabezado */}
      <div style={{ marginBottom: '0.875rem' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: 'var(--color-text1)' }}>
          Resumen anual — {anio}
        </h3>
        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: 'var(--color-text3)' }}>
          cuotas del año por proveedor
        </p>
      </div>

      {/* KPIs globales */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
        <div style={{ background: 'var(--badge-red-bg)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--badge-red-text)', opacity: 0.8 }}>Pendiente</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--badge-red-text)', fontVariantNumeric: 'tabular-nums' }}>
            {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact' }).format(totalPendiente)}
          </p>
        </div>
        <div style={{ background: 'var(--badge-green-bg)', borderRadius: '8px', padding: '0.6rem 0.75rem' }}>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--badge-green-text)', opacity: 0.8 }}>Pagado</p>
          <p style={{ margin: '0.15rem 0 0', fontSize: '1rem', fontWeight: 700, color: 'var(--badge-green-text)', fontVariantNumeric: 'tabular-nums' }}>
            {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN', notation: 'compact' }).format(totalCancelado)}
          </p>
        </div>
      </div>

      {/* Lista por proveedor */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {resumen.map(r => {
          const total    = r.pendiente + r.cancelado;
          const pctPagado = total > 0 ? (r.cancelado / total) * 100 : 0;
          const cuotasTotal = r.cuotasPendiente + r.cuotasCancelado;
          return (
            <div key={r.id} style={{ padding: '0.6rem 0.75rem', background: 'var(--color-surface2)', borderRadius: '8px', border: '1px solid var(--color-border2)' }}>
              {/* Fila superior */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-text3)', fontVariantNumeric: 'tabular-nums' }}>{r.codigo}</span>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-text1)', lineHeight: 1.2 }}>
                    {r.ciudad ? `${r.ciudad}` : r.ubicacion.split(' - ')[0]}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#dc2626', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(r.pendiente)}
                  </p>
                  {r.cancelado > 0 && (
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.68rem', color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                      +{new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(r.cancelado)} pagado
                    </p>
                  )}
                </div>
              </div>
              {/* Barra progreso */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--color-border)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ width: `${pctPagado}%`, height: '100%', background: '#10b981', borderRadius: '99px', transition: 'width 0.3s' }} />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text3)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {r.cuotasCancelado}/{cuotasTotal} cuotas
                </span>
              </div>
            </div>
          );
        })}
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
