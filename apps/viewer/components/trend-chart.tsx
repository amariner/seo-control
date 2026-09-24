"use client";

import { useEffect, useRef } from "react";
import type { DashboardPayload } from "@seo/contracts";
import { CHART_COLORS, SERIES_STYLES, registerSeoChartTheme } from "@seo/ui";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  LineChart,
  GridComponent,
  MarkLineComponent,
  TooltipComponent,
  CanvasRenderer,
]);
const themeName = registerSeoChartTheme(echarts);

/** `area` pinta la banda en degradado cobalto de la tarjeta de evolución (D-044). */
export function TrendChart({
  points,
  annotations,
  area = false,
}: {
  points: DashboardPayload["series"][string];
  annotations: DashboardPayload["annotations"];
  area?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const chart = echarts.init(container.current, themeName, {
      renderer: "canvas",
    });
    chart.setOption({
      animation: false,
      grid: { left: 10, right: 10, top: 24, bottom: 18, containLabel: true },
      tooltip: { trigger: "axis" },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: points.map((point) => point.date.slice(5)),
        axisLabel: { interval: 5 },
      },
      yAxis: { type: "value", scale: true, splitNumber: 4 },
      series: [
        {
          name: "Periodo actual",
          type: "line",
          data: points.map((point) => point.value),
          showSymbol: false,
          smooth: 0.25,
          ...SERIES_STYLES.current,
          ...(area
            ? {
                areaStyle: {
                  color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                    { offset: 0, color: `${CHART_COLORS.accent}40` },
                    { offset: 1, color: `${CHART_COLORS.accent}03` },
                  ]),
                },
              }
            : {}),
          markLine: {
            silent: true,
            symbol: "none",
            label: { formatter: "{b}", ...SERIES_STYLES.annotation.label },
            lineStyle: SERIES_STYLES.annotation.lineStyle,
            data: annotations.map((item) => ({
              name: item.label,
              xAxis: item.date.slice(5),
            })),
          },
        },
        {
          name: "Interanual",
          type: "line",
          data: points.map((point) => point.previousYear),
          showSymbol: false,
          smooth: 0.25,
          ...SERIES_STYLES.comparison,
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [annotations, points, area]);

  return (
    <div
      ref={container}
      className="chart"
      role="img"
      aria-label={`Evolución diaria: serie actual en cobalto (${CHART_COLORS.accent}) e interanual en grafito discontinuo. La alternativa tabular está en «Ver los datos como tabla», justo debajo del gráfico.`}
    />
  );
}
