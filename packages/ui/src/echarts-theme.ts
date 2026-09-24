/**
 * Tema ECharts derivado de los tokens de `@seo/ui`.
 *
 * Los valores hexadecimales replican `tokens.css` porque ECharts pinta en canvas
 * y no puede leer variables CSS. Cualquier cambio de token debe reflejarse aquí.
 * Serie actual: cobalto. Comparación/interanual: grafito discontinuo. Banda
 * histórica: cobalto muy claro. Verde/ámbar/rojo solo para su significado.
 */

export const CHART_COLORS = {
  accent: "#3157ff",
  accentSoft: "#e9edff",
  accentBand: "rgba(49, 87, 255, 0.08)",
  graphite: "#7c8683",
  graphiteSoft: "#d9ddda",
  ink: "#101516",
  text: "#46504e",
  muted: "#5f6a67",
  line: "#dcdedb",
  positive: "#176044",
  warning: "#805600",
  danger: "#8b3030",
  canvas: "#ffffff",
} as const;

export const SEO_CHART_THEME_NAME = "seo-intelligence";

/** Paleta ordenada para series categóricas: cobalto primero, luego neutros y semánticos. */
export const SERIES_PALETTE = [CHART_COLORS.accent, CHART_COLORS.graphite, "#8ea0ff", "#b5bcb8", CHART_COLORS.positive, CHART_COLORS.warning, CHART_COLORS.danger];

export const seoChartTheme = {
  color: SERIES_PALETTE,
  backgroundColor: "transparent",
  textStyle: { color: CHART_COLORS.text, fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 12 },
  title: { textStyle: { color: CHART_COLORS.ink, fontWeight: 600, fontSize: 13 }, subtextStyle: { color: CHART_COLORS.muted, fontSize: 12 } },
  legend: { textStyle: { color: CHART_COLORS.text, fontSize: 12 }, itemWidth: 12, itemHeight: 3 },
  tooltip: { backgroundColor: CHART_COLORS.ink, borderWidth: 0, textStyle: { color: "#fff", fontSize: 12 }, padding: [8, 10] },
  categoryAxis: {
    axisLine: { show: true, lineStyle: { color: CHART_COLORS.line } },
    axisTick: { show: false },
    axisLabel: { color: CHART_COLORS.muted, fontSize: 12 },
    splitLine: { show: false },
  },
  valueAxis: {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: CHART_COLORS.muted, fontSize: 12 },
    splitLine: { show: true, lineStyle: { color: CHART_COLORS.line, type: "solid" } },
  },
  line: { symbol: "none", smooth: 0.2, lineStyle: { width: 2 } },
  bar: { itemStyle: { borderRadius: [2, 2, 0, 0] } },
  markLine: { lineStyle: { color: CHART_COLORS.graphiteSoft, type: "dashed" }, label: { color: CHART_COLORS.muted, fontSize: 11 } },
} as const;

type EchartsLike = { registerTheme: (name: string, theme: object) => void };

let registered = false;

/** Registra el tema una sola vez sobre la instancia de ECharts que se le pase (core o completa). */
export function registerSeoChartTheme(echarts: EchartsLike) {
  if (registered) return SEO_CHART_THEME_NAME;
  echarts.registerTheme(SEO_CHART_THEME_NAME, seoChartTheme);
  registered = true;
  return SEO_CHART_THEME_NAME;
}

/** Estilos de serie reutilizables para mantener la semántica actual / comparación / banda. */
export const SERIES_STYLES = {
  current: { lineStyle: { width: 2.5, color: CHART_COLORS.accent }, areaStyle: { color: CHART_COLORS.accentBand }, itemStyle: { color: CHART_COLORS.accent } },
  comparison: { lineStyle: { width: 1.5, color: CHART_COLORS.graphite, type: "dashed" as const }, itemStyle: { color: CHART_COLORS.graphite } },
  band: { lineStyle: { width: 0 }, areaStyle: { color: CHART_COLORS.accentSoft, opacity: 0.7 } },
  annotation: { lineStyle: { color: CHART_COLORS.graphiteSoft, type: "dashed" as const }, label: { color: CHART_COLORS.muted, fontSize: 11 } },
} as const;
