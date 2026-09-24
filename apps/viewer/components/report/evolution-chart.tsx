"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { BrandReport, ReportSeriesPoint } from "@seo/contracts";
import { CHART_COLORS, DataTablePanel, registerSeoChartTheme } from "@seo/ui";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import { GridComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { COMPARE_COLORS } from "./compare-bars";
import "./evolution-chart.css";

echarts.use([LineChart, GridComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);
const themeName = registerSeoChartTheme(echarts);

type SeriesKey = "current" | "previous" | "previousYear";
type Metric = "search" | "clicks";
type EvolutionChartProps = Pick<BrandReport, "searchSeries" | "clickSeries" | "window" | "annotations">;
const seriesKeys: SeriesKey[] = ["current", "previous", "previousYear"];
const numberFormat = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" as unknown as boolean });
const compactFormat = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const shortDateFormat = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", timeZone: "UTC" });
const DAY = 86_400_000;
const parseDate = (date: string) => Date.parse(`${date}T00:00:00Z`);
const formatDate = (date: string) => dateFormat.format(parseDate(date));
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const dateRange = (start: string, end: string) => start === end ? formatDate(start) : `${formatDate(start)} – ${formatDate(end)}`;
const formatValue = (value: number | null) => value === null ? "Sin dato" : numberFormat.format(value);

/**
 * The repository aligns comparisons by day offset inside each current bucket.
 * Monthly buckets can therefore compare partial months, not calendar months.
 * Keep those exact date ranges in the tooltip and accessible table.
 */
function bucketRange(points: ReportSeriesPoint[], index: number, key: SeriesKey, reportWindow: BrandReport["window"]) {
  const start = Math.max(parseDate(points[index]!.bucket), parseDate(reportWindow.start));
  const end = Math.min(points[index + 1] ? parseDate(points[index + 1]!.bucket) - DAY : parseDate(reportWindow.end), parseDate(reportWindow.end));
  const periodStart = key === "previous" ? reportWindow.previousStart : key === "previousYear" ? reportWindow.previousYearStart : reportWindow.start;
  const periodEnd = key === "previous" ? reportWindow.previousEnd : key === "previousYear" ? reportWindow.previousYearEnd : reportWindow.end;
  const offset = parseDate(periodStart) - parseDate(reportWindow.start);
  const alignedStart = start + offset;
  const alignedEnd = Math.min(end + offset, parseDate(periodEnd));
  return alignedStart > alignedEnd ? "Fuera del periodo comparado" : dateRange(iso(alignedStart), iso(alignedEnd));
}

export function EvolutionChart({ searchSeries, clickSeries, window: reportWindow, annotations }: EvolutionChartProps) {
  const [metric, setMetric] = useState<Metric>("search");
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({ current: true, previous: true, previousYear: true });
  const container = useRef<HTMLDivElement>(null);
  const chartId = useId();
  const points = metric === "search" ? searchSeries : clickSeries;
  const metricLabel = metric === "search" ? "Visitas SEO" : "Clics en Google";
  const source = metric === "search" ? "Google Analytics 4" : "Google Search Console";
  const grain = reportWindow.granularity === "day" ? "Datos diarios" : reportWindow.granularity === "week" ? "Totales por semana" : "Totales por mes";
  const names: Record<SeriesKey, string> = {
    current: "Periodo actual",
    previous: reportWindow.compare === "custom" ? "Comparación elegida" : "Periodo anterior",
    previousYear: reportWindow.yearAlign === "semana" ? "Año anterior · mismo día" : "Año anterior",
  };
  const periods: Record<SeriesKey, string> = {
    current: dateRange(reportWindow.start, reportWindow.end),
    previous: dateRange(reportWindow.previousStart, reportWindow.previousEnd),
    previousYear: dateRange(reportWindow.previousYearStart, reportWindow.previousYearEnd),
  };
  const inRangeAnnotations = annotations.filter((note) => note.date >= reportWindow.start && note.date <= reportWindow.end);
  const hasData = points.some((point) => seriesKeys.some((key) => point[key] !== null));

  useEffect(() => {
    if (!container.current || !hasData) return;
    const chart = echarts.init(container.current, themeName, { renderer: "canvas" });
    const namesByKey: Record<SeriesKey, string> = {
      current: "Periodo actual",
      previous: reportWindow.compare === "custom" ? "Comparación elegida" : "Periodo anterior",
      previousYear: reportWindow.yearAlign === "semana" ? "Año anterior · mismo día" : "Año anterior",
    };
    const activeKeys = seriesKeys.filter((key) => visible[key]);
    const notes = annotations.filter((note) => note.date >= reportWindow.start && note.date <= reportWindow.end).flatMap((note) => {
      const point = [...points].reverse().find((item) => item.bucket <= note.date);
      return point ? [{ name: note.type === "migracion" ? "Cambio de URLs" : "Anotación", xAxis: point.bucket }] : [];
    });

    chart.setOption({
      // Zero animation also respects reduced-motion preferences during resizing.
      animation: false,
      grid: { left: 4, right: 16, top: 36, bottom: 12, containLabel: true },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        confine: true,
        axisPointer: { type: "line", lineStyle: { color: CHART_COLORS.graphiteSoft, type: "dashed" } },
        formatter: (raw: unknown) => {
          const params = (Array.isArray(raw) ? raw : [raw]) as Array<{ dataIndex?: number }>;
          const index = params[0]?.dataIndex;
          if (typeof index !== "number" || !points[index]) return "";
          return activeKeys.map((key) => `${namesByKey[key]}: ${formatValue(points[index]![key])}\n${bucketRange(points, index, key, reportWindow)}`).join("\n\n");
        },
        textStyle: { fontSize: 12, lineHeight: 18 },
        padding: [12, 14],
      },
      xAxis: {
        type: "category",
        data: points.map((point) => point.bucket),
        boundaryGap: false,
        axisLabel: {
          hideOverlap: true,
          margin: 14,
          color: CHART_COLORS.text,
          formatter: (value: string, index: number) => points[index]?.label ?? shortDateFormat.format(parseDate(value)),
        },
        axisLine: { lineStyle: { color: CHART_COLORS.line } },
      },
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 1,
        splitNumber: 4,
        axisLabel: { margin: 12, color: CHART_COLORS.text, formatter: (value: number) => compactFormat.format(value) },
        splitLine: { lineStyle: { color: CHART_COLORS.line, type: "dashed", opacity: 0.75 } },
      },
      series: activeKeys.map((key, index) => ({
        id: key,
        name: namesByKey[key],
        type: "line",
        data: points.map((point) => point[key]),
        connectNulls: false,
        smooth: false,
        showSymbol: points.some((point, pointIndex) => point[key] !== null && (points[pointIndex - 1]?.[key] ?? null) === null && (points[pointIndex + 1]?.[key] ?? null) === null),
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: COMPARE_COLORS[key], width: key === "current" ? 2.7 : 1.8, type: key === "current" ? "solid" : "dashed" },
        itemStyle: { color: COMPARE_COLORS[key] },
        ...(key === "current" ? { areaStyle: { color: CHART_COLORS.accentBand }, z: 3 } : { z: 2 }),
        emphasis: { focus: "series" },
        ...(index === 0 && notes.length ? {
          markLine: {
            silent: true,
            symbol: "none",
            label: { formatter: "{b}", color: CHART_COLORS.text, fontSize: 12, rotate: 0, position: "insideEndTop", padding: [3, 4], backgroundColor: CHART_COLORS.canvas },
            lineStyle: { color: CHART_COLORS.graphite, type: "dashed", width: 1 },
            data: notes,
          },
        } : {}),
      })),
    });

    const resize = () => {
      chart.resize();
      chart.setOption({ xAxis: { axisLabel: { interval: Math.max(0, Math.ceil(points.length / (chart.getWidth() < 480 ? 4 : 8)) - 1) } } });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container.current);
    return () => { observer.disconnect(); chart.dispose(); };
  }, [annotations, hasData, points, reportWindow, visible]);

  return (
    <div className="report-evolution">
      <div className="report-evolution-toolbar">
        <div className="report-evolution-metrics" role="group" aria-label="Métrica del gráfico">
          <button type="button" aria-pressed={metric === "search"} aria-controls={chartId} onClick={() => setMetric("search")}>Visitas SEO</button>
          <button type="button" aria-pressed={metric === "clicks"} aria-controls={chartId} onClick={() => setMetric("clicks")}>Clics en Google</button>
        </div>
        <p className="report-evolution-source">{source}<span>{grain}</span></p>
      </div>

      <div className="report-evolution-legend" role="group" aria-label="Series visibles">
        {seriesKeys.map((key) => (
          <button key={key} type="button" className="report-chart-legend-item" aria-pressed={visible[key]} aria-controls={chartId} onClick={() => setVisible((current) => ({ ...current, [key]: !current[key] }))}>
            <span className={`report-chart-swatch report-chart-swatch-${key}`} aria-hidden="true" style={{ borderColor: COMPARE_COLORS[key] }} />
            <span><strong>{names[key]}</strong><small>{periods[key]}</small></span>
          </button>
        ))}
      </div>

      {hasData ? <div id={chartId} ref={container} className="report-evolution-canvas" role="img" aria-label={`${metricLabel}. ${grain}. Fuente: ${source}. Comparación por tramos equivalentes. Los datos completos están en la tabla que sigue.`} /> : <p id={chartId} className="report-evolution-empty" role="status">Sin datos de {source} para este periodo.</p>}

      <div className="report-evolution-footnotes">
        {inRangeAnnotations.map((note) => <p key={note.id}><span className="report-evolution-event" aria-hidden="true" />{formatDate(note.date)} · {note.label}</p>)}
        <p>Comparación por tramos equivalentes. Los huecos indican falta de datos.</p>
      </div>

      <details className="report-evolution-table">
        <summary>Ver datos del gráfico</summary>
        <DataTablePanel label={`Tabla de ${metricLabel.toLowerCase()}`}>
          <table className="data-table">
            <caption>{metricLabel} · {source}. Cada valor incluye las fechas de su tramo.</caption>
            <thead><tr><th scope="col">Tramo actual</th>{seriesKeys.map((key) => <th scope="col" key={key}>{names[key]}</th>)}</tr></thead>
            <tbody>{points.map((point, index) => <tr key={point.bucket}>
              <th scope="row">{bucketRange(points, index, "current", reportWindow)}</th>
              {seriesKeys.map((key) => <td key={key}><strong>{formatValue(point[key])}</strong>{key !== "current" ? <small>{bucketRange(points, index, key, reportWindow)}</small> : null}</td>)}
            </tr>)}</tbody>
          </table>
        </DataTablePanel>
      </details>
    </div>
  );
}
