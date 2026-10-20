// Lee los tokens de _theme.scss desde JS, para lo que no acepta var(--x):
// canvas de Chart.js, marcadores de Leaflet, PDFs. Fuente única: _theme.scss.
const FALLBACK = {
  "--color-accent": "#ff6600",
  "--color-text1": "#161a1f",
  "--color-text2": "#4b5360",
  "--color-text3": "#6b7380",
  "--color-surface": "#ffffff",
  "--color-border": "#e4e7ec",
  "--color-success": "#059669",
  "--color-warning": "#d97706",
  "--color-danger": "#dc2626",
  "--color-info": "#2563eb",
  "--color-violet": "#6366f1",
  "--color-teal": "#0d9488",
};

export function token(name) {
  if (typeof document !== "undefined") {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    if (v) return v;
  }
  return FALLBACK[name] ?? "#000000";
}

// Serie categórica para gráficos (orden fijo: el primer color es la marca).
export const SERIE = [
  "--color-accent", "--color-info", "--color-success", "--color-violet", "--color-danger",
  "--color-teal", "--color-warning",
];
export const serieColor = (i) => token(SERIE[i % SERIE.length]);
