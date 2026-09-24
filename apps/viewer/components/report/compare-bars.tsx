"use client";

import { useEffect, useRef, useState } from "react";
import { CHART_COLORS, SERIES_PALETTE, registerSeoChartTheme } from "@seo/ui";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import "./evolution-chart.css";

echarts.use([BarChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);
const themeName = registerSeoChartTheme(echarts);

/**
 * Barras agrupadas: el periodo actual frente a sus comparaciones (D-037).
 *
 * Colores fijos por significado en todo el informe: actual en cobalto, periodo
 * anterior en grafito y año pasado en cobalto claro. Un directivo no debería
 * tener que leer la leyenda dos veces en la misma página.
 */
export const COMPARE_COLORS = { current: CHART_COLORS.accent, previous: CHART_COLORS.graphite, previousYear: SERIES_PALETTE[2]! } as const;

export type CompareSeries = { key: keyof typeof COMPARE_COLORS; name: string; values: Array<number | null> };

export function CompareBars({
  categories,
  series,
  annotations = [],
  horizontal = false,
  height = 280,
  label,
  unit = "",
}: {
  categories: string[];
  series: CompareSeries[];
  /** Categoría en la que se dibuja una línea vertical con su texto. */
  annotations?: Array<{ category: string; label: string }>;
  horizontal?: boolean;
  height?: number;
  label: string;
  unit?: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);

  useEffect(() => {
    if (!container.current) return;
    const chart = echarts.init(container.current, themeName, { renderer: "canvas" });
    const format = (value: number) => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}${unit}`;
    const category = { type: "category" as const, data: categories, axisLabel: { interval: horizontal ? 0 : "auto" as const, hideOverlap: true, color: CHART_COLORS.text, ...(horizontal ? { width: 100, overflow: "truncate" as const } : {}) } };
    const value = { type: "value" as const, splitNumber: 4, axisLabel: { formatter: (raw: number) => new Intl.NumberFormat("es-ES", { notation: "compact" }).format(raw) } };
    chart.setOption({
      animation: false,
      grid: { left: 0, right: 12, top: annotations.length ? 34 : 14, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", confine: true, renderMode: "richText", axisPointer: { type: "shadow" }, valueFormatter: (raw: unknown) => (typeof raw === "number" ? format(raw) : "sin dato") },
      xAxis: horizontal ? value : category,
      yAxis: horizontal ? { ...category, inverse: true } : value,
      series: series.filter((item) => !hiddenSeries.includes(item.key)).map((item, index) => ({
        name: item.name,
        type: "bar",
        data: item.values,
        barMaxWidth: horizontal ? 14 : 22,
        barGap: "12%",
        itemStyle: { color: COMPARE_COLORS[item.key], borderRadius: horizontal ? [0, 2, 2, 0] : [2, 2, 0, 0] },
        ...(index === 0 && annotations.length
          ? { markLine: { silent: true, symbol: "none", label: { formatter: "{b}", color: CHART_COLORS.danger, fontSize: 11, fontWeight: 600, position: "end" }, lineStyle: { color: CHART_COLORS.danger, type: "dashed", width: 1.5 }, data: annotations.map((note) => ({ name: note.label, [horizontal ? "yAxis" : "xAxis"]: note.category })) } }
          : {}),
      })),
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [annotations, categories, hiddenSeries, horizontal, series, unit]);

  return <div className="report-compare-chart">
    <div className="report-compare-legend" role="group" aria-label={`Series de ${label.toLowerCase()}`}>
      {series.map((item) => <button key={item.key} type="button" className="report-chart-legend-item" aria-pressed={!hiddenSeries.includes(item.key)} onClick={() => setHiddenSeries((hidden) => hidden.includes(item.key) ? hidden.filter((key) => key !== item.key) : [...hidden, item.key])}>
        <span className="report-chart-swatch" aria-hidden="true" style={{ borderColor: COMPARE_COLORS[item.key] }} />
        <span>{item.name}</span>
      </button>)}
    </div>
    <div ref={container} className="report-chart" style={{ height }} role="img" aria-label={`${label}. Los mismos datos están disponibles en la tabla de esta sección.`} />
  </div>;
}
