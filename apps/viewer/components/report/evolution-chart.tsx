"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChartColumn, ChartLine, Globe2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoogleLogo } from "./google-logo";
import type { BrandReport, ReportSeriesPoint } from "@seo/contracts";
import { CHART_COLORS, DataTablePanel, registerSeoChartTheme } from "@seo/ui";
import * as echarts from "echarts/core";
import { BarChart, LineChart } from "echarts/charts";
import {
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { COMPARE_COLORS } from "./compare-bars";
import "./evolution-chart.css";

echarts.use([
  LineChart,
  BarChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);
const themeName = registerSeoChartTheme(echarts);

type SeriesKey = "current" | "previous" | "previousYear";
type Metric = "clicks" | "impressions" | "web";
type EvolutionChartProps = Pick<
  BrandReport,
  "clickSeries" | "impressionsSeries" | "webSeries" | "window" | "annotations"
>;

/** Colores por métrica: clics en cobalto, impresiones en violeta (D-045). */
const PALETTES: Record<Metric, Record<SeriesKey, string>> = {
  clicks: COMPARE_COLORS,
  impressions: {
    current: CHART_COLORS.violet,
    previous: CHART_COLORS.graphite,
    previousYear: CHART_COLORS.violetSoft,
  },
  web: {
    current: CHART_COLORS.ink,
    previous: CHART_COLORS.graphite,
    previousYear: CHART_COLORS.graphiteLight,
  },
};
const BANDS: Record<Metric, string> = {
  clicks: CHART_COLORS.accentBand,
  impressions: CHART_COLORS.violetBand,
  web: CHART_COLORS.inkBand,
};
const METRIC_LABELS: Record<Metric, string> = {
  clicks: "Clics en Google",
  impressions: "Impresiones en Google",
  web: "Tráfico total",
};
const seriesKeys: SeriesKey[] = ["current", "previous", "previousYear"];
const numberFormat = new Intl.NumberFormat("es-ES", {
  maximumFractionDigits: 0,
  useGrouping: "always" as unknown as boolean,
});
const compactFormat = new Intl.NumberFormat("es-ES", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const shortDateFormat = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const DAY = 86_400_000;
const parseDate = (date: string) => Date.parse(`${date}T00:00:00Z`);
const formatDate = (date: string) => dateFormat.format(parseDate(date));
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const dateRange = (start: string, end: string) =>
  start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
const formatValue = (value: number | null) =>
  value === null ? "Sin dato" : numberFormat.format(value);

/**
 * The repository aligns comparisons by day offset inside each current bucket.
 * Monthly buckets can therefore compare partial months, not calendar months.
 * Keep those exact date ranges in the tooltip and accessible table.
 */
function bucketRange(
  points: ReportSeriesPoint[],
  index: number,
  key: SeriesKey,
  reportWindow: BrandReport["window"],
) {
  const start = Math.max(
    parseDate(points[index]!.bucket),
    parseDate(reportWindow.start),
  );
  const end = Math.min(
    points[index + 1]
      ? parseDate(points[index + 1]!.bucket) - DAY
      : parseDate(reportWindow.end),
    parseDate(reportWindow.end),
  );
  const periodStart =
    key === "previous"
      ? reportWindow.previousStart
      : key === "previousYear"
        ? reportWindow.previousYearStart
        : reportWindow.start;
  const periodEnd =
    key === "previous"
      ? reportWindow.previousEnd
      : key === "previousYear"
        ? reportWindow.previousYearEnd
        : reportWindow.end;
  const offset = parseDate(periodStart) - parseDate(reportWindow.start);
  const alignedStart = start + offset;
  const alignedEnd = Math.min(end + offset, parseDate(periodEnd));
  return alignedStart > alignedEnd
    ? "Fuera del periodo comparado"
    : dateRange(iso(alignedStart), iso(alignedEnd));
}

export function EvolutionChart({
  clickSeries,
  impressionsSeries,
  webSeries,
  window: reportWindow,
  annotations,
}: EvolutionChartProps) {
  const [metric, setMetric] = useState<Metric>("clicks");
  /* Línea o barras sobre el mismo periodo seleccionado (D-045). */
  const [view, setView] = useState<"line" | "bar">("line");
  /* Fechas de cada serie: al pasar el ratón en escritorio; al tocar en
     pantallas táctiles, donde el toque las muestra en lugar de ocultar la serie. */
  const [datesOpen, setDatesOpen] = useState<SeriesKey | null>(null);
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(hover: none)");
    const update = () => setTouch(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    current: true,
    previous: true,
    previousYear: true,
  });
  const container = useRef<HTMLDivElement>(null);
  const chartId = useId();
  const points =
    metric === "clicks"
      ? clickSeries
      : metric === "impressions"
        ? impressionsSeries
        : webSeries;
  const metricLabel = METRIC_LABELS[metric];
  const source =
    metric === "web"
      ? "Google Analytics 4 · todos los canales"
      : "Google Search Console";
  const colors = PALETTES[metric];
  const grain =
    reportWindow.granularity === "day"
      ? "Datos diarios"
      : reportWindow.granularity === "week"
        ? "Totales por semana"
        : "Totales por mes";
  const names: Record<SeriesKey, string> = {
    current: "Periodo actual",
    previous:
      reportWindow.compare === "custom"
        ? "Comparación elegida"
        : "Periodo anterior",
    previousYear:
      reportWindow.yearAlign === "semana"
        ? "Año anterior · mismo día"
        : "Año anterior",
  };
  const periods: Record<SeriesKey, string> = {
    current: dateRange(reportWindow.start, reportWindow.end),
    previous: dateRange(reportWindow.previousStart, reportWindow.previousEnd),
    previousYear: dateRange(
      reportWindow.previousYearStart,
      reportWindow.previousYearEnd,
    ),
  };
  const inRangeAnnotations = annotations.filter(
    (note) => note.date >= reportWindow.start && note.date <= reportWindow.end,
  );
  const hasData = points.some((point) =>
    seriesKeys.some((key) => point[key] !== null),
  );

  useEffect(() => {
    if (!container.current || !hasData) return;
    const chart = echarts.init(container.current, themeName, {
      renderer: "canvas",
    });
    const namesByKey: Record<SeriesKey, string> = {
      current: "Periodo actual",
      previous:
        reportWindow.compare === "custom"
          ? "Comparación elegida"
          : "Periodo anterior",
      previousYear:
        reportWindow.yearAlign === "semana"
          ? "Año anterior · mismo día"
          : "Año anterior",
    };
    const activeKeys = seriesKeys.filter((key) => visible[key]);
    const notes = annotations
      .filter(
        (note) =>
          note.date >= reportWindow.start && note.date <= reportWindow.end,
      )
      .flatMap((note) => {
        const point = [...points]
          .reverse()
          .find((item) => item.bucket <= note.date);
        return point
          ? [
              {
                name:
                  note.type === "migracion" ? "Cambio de URLs" : "Anotación",
                xAxis: point.bucket,
              },
            ]
          : [];
      });

    chart.setOption({
      // Zero animation also respects reduced-motion preferences during resizing.
      animation: false,
      /* Sin margen derecho: el área llega al borde del interruptor (D-045). */
      grid: { left: 4, right: 0, top: 36, bottom: 12, containLabel: true },
      tooltip: {
        trigger: "axis",
        renderMode: "richText",
        confine: true,
        axisPointer: {
          type: "line",
          lineStyle: { color: CHART_COLORS.graphiteSoft, type: "dashed" },
        },
        formatter: (raw: unknown) => {
          const params = (Array.isArray(raw) ? raw : [raw]) as Array<{
            dataIndex?: number;
          }>;
          const index = params[0]?.dataIndex;
          if (typeof index !== "number" || !points[index]) return "";
          return activeKeys
            .map(
              (key) =>
                `${namesByKey[key]}: ${formatValue(points[index]![key])}\n${bucketRange(points, index, key, reportWindow)}`,
            )
            .join("\n\n");
        },
        textStyle: { fontSize: 12, lineHeight: 18 },
        padding: [12, 14],
      },
      xAxis: {
        type: "category",
        data: points.map((point) => point.bucket),
        boundaryGap: view === "bar",
        axisLabel: {
          hideOverlap: true,
          // Primera y última etiqueta hacia dentro: no reservan medio texto fuera del área.
          alignMinLabel: "left",
          alignMaxLabel: "right",
          margin: 14,
          color: CHART_COLORS.text,
          formatter: (value: string, index: number) =>
            points[index]?.label ?? shortDateFormat.format(parseDate(value)),
        },
        axisLine: { lineStyle: { color: CHART_COLORS.line } },
      },
      yAxis: {
        type: "value",
        min: 0,
        minInterval: 1,
        splitNumber: 4,
        axisLabel: {
          margin: 12,
          color: CHART_COLORS.text,
          formatter: (value: number) => compactFormat.format(value),
        },
        splitLine: {
          lineStyle: {
            color: CHART_COLORS.line,
            type: "dashed",
            opacity: 0.75,
          },
        },
      },
      series: activeKeys.map((key, index) => ({
        id: key,
        name: namesByKey[key],
        data: points.map((point) => point[key]),
        ...(view === "bar"
          ? {
              type: "bar",
              barMaxWidth: 16,
              barGap: "15%",
              itemStyle: {
                color: colors[key],
                opacity: key === "current" ? 1 : 0.55,
                borderRadius: [2, 2, 0, 0],
              },
              z: key === "current" ? 3 : 2,
            }
          : {
              type: "line",
              connectNulls: false,
              smooth: false,
              showSymbol: points.some(
                (point, pointIndex) =>
                  point[key] !== null &&
                  (points[pointIndex - 1]?.[key] ?? null) === null &&
                  (points[pointIndex + 1]?.[key] ?? null) === null,
              ),
              symbol: "circle",
              symbolSize: 6,
              lineStyle: {
                color: colors[key],
                width: key === "current" ? 2.7 : 1.8,
                type: key === "current" ? "solid" : "dashed",
              },
              itemStyle: { color: colors[key] },
              ...(key === "current"
                ? { areaStyle: { color: BANDS[metric] }, z: 3 }
                : { z: 2 }),
            }),
        emphasis: { focus: "series" },
        ...(index === 0 && notes.length
          ? {
              markLine: {
                silent: true,
                symbol: "none",
                label: {
                  formatter: "{b}",
                  color: CHART_COLORS.text,
                  fontSize: 12,
                  rotate: 0,
                  position: "insideEndTop",
                  padding: [3, 4],
                  backgroundColor: CHART_COLORS.canvas,
                },
                lineStyle: {
                  color: CHART_COLORS.graphite,
                  type: "dashed",
                  width: 1,
                },
                data: notes,
              },
            }
          : {}),
      })),
    });

    const resize = () => {
      chart.resize();
      chart.setOption({
        xAxis: {
          axisLabel: {
            interval: Math.max(
              0,
              Math.ceil(points.length / (chart.getWidth() < 480 ? 4 : 8)) - 1,
            ),
          },
        },
      });
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [
    annotations,
    colors,
    hasData,
    metric,
    points,
    reportWindow,
    view,
    visible,
  ]);

  return (
    <div className="report-evolution" data-view={view}>
      <div className="report-evolution-toolbar">
        {/* Métrica en un desplegable; el tipo de gráfico, en iconos (D-045). */}
        <Select
          value={metric}
          onValueChange={(value) => setMetric(value as Metric)}
        >
          <SelectTrigger
            aria-label="Métrica del gráfico"
            aria-controls={chartId}
            className="report-evolution-select h-10 min-w-56 bg-background font-medium"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" align="start">
            <SelectItem value="clicks">
              <GoogleLogo size={14} />
              Clics en Google
            </SelectItem>
            <SelectItem value="impressions">
              <GoogleLogo size={14} />
              Impresiones en Google
            </SelectItem>
            <SelectItem value="web">
              <Globe2 className="text-muted-foreground" aria-hidden />
              Tráfico total
            </SelectItem>
          </SelectContent>
        </Select>
        <div
          className="report-evolution-legend"
          role="group"
          aria-label="Series visibles"
        >
          {seriesKeys.map((key) => (
            <button
              key={key}
              type="button"
              className="report-chart-legend-item"
              aria-pressed={touch ? undefined : visible[key]}
              aria-expanded={touch ? datesOpen === key : undefined}
              aria-controls={chartId}
              aria-label={`${names[key]}: ${periods[key]}`}
              data-dates-open={datesOpen === key || undefined}
              onClick={() =>
                touch
                  ? setDatesOpen((current) => (current === key ? null : key))
                  : setVisible((current) => ({
                      ...current,
                      [key]: !current[key],
                    }))
              }
              onBlur={() => setDatesOpen(null)}
            >
              <span
                className={`report-chart-swatch report-chart-swatch-${key}`}
                aria-hidden="true"
                style={{ borderColor: colors[key] }}
              />
              <span>
                <strong>{names[key]}</strong>
                <small>{periods[key]}</small>
              </span>
            </button>
          ))}
        </div>
        <div className="report-evolution-aside">
          <div
            className="report-evolution-view"
            role="group"
            aria-label="Tipo de gráfico"
          >
            <button
              type="button"
              aria-pressed={view === "line"}
              aria-controls={chartId}
              aria-label="Ver en línea"
              title="Ver en línea"
              onClick={() => setView("line")}
            >
              <ChartLine size={16} aria-hidden />
            </button>
            <button
              type="button"
              aria-pressed={view === "bar"}
              aria-controls={chartId}
              aria-label="Ver en barras"
              title="Ver en barras"
              onClick={() => setView("bar")}
            >
              <ChartColumn size={16} aria-hidden />
            </button>
          </div>
        </div>
      </div>

      {hasData ? (
        <div
          id={chartId}
          ref={container}
          className="report-evolution-canvas"
          role="img"
          aria-label={`${metricLabel}. ${grain}. Fuente: ${source}. Comparación por tramos equivalentes. Los datos completos están en la tabla que sigue.`}
        />
      ) : (
        <p id={chartId} className="report-evolution-empty" role="status">
          Sin datos de {source} para este periodo.
        </p>
      )}

      {/* Fuente y granularidad bajo el gráfico, a la derecha (D-045). */}
      <div className="report-evolution-footnotes">
        <div>
          {inRangeAnnotations.map((note) => (
            <p key={note.id}>
              <span className="report-evolution-event" aria-hidden="true" />
              {formatDate(note.date)} · {note.label}
            </p>
          ))}
        </div>
        <p className="report-evolution-source">
          {source}
          <span>{grain}</span>
        </p>
      </div>

      {/* Sin desplegable visible (D-045); la tabla sigue disponible para lectores
          de pantalla como alternativa accesible del gráfico. */}
      <div className="ds-sr-only">
        <DataTablePanel label={`Tabla de ${metricLabel.toLowerCase()}`}>
          <table className="data-table">
            <caption>
              {metricLabel} · {source}. Cada valor incluye las fechas de su
              tramo.
            </caption>
            <thead>
              <tr>
                <th scope="col">Tramo actual</th>
                {seriesKeys.map((key) => (
                  <th scope="col" key={key}>
                    {names[key]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={point.bucket}>
                  <th scope="row">
                    {bucketRange(points, index, "current", reportWindow)}
                  </th>
                  {seriesKeys.map((key) => (
                    <td key={key}>
                      <strong>{formatValue(point[key])}</strong>
                      {key !== "current" ? (
                        <small>
                          {bucketRange(points, index, key, reportWindow)}
                        </small>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </DataTablePanel>
      </div>
    </div>
  );
}
