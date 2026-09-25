"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { PERIODS, type DashboardPayload } from "@seo/contracts";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TrendChart } from "./trend-chart";

const SHORT_PERIOD: Record<string, string> = {
  "28d": "28 días",
  "90d": "90 días",
  "180d": "180 días",
  "12m": "12 meses",
  "24m": "24 meses",
};

/**
 * Evolución sobre ECharts (D-041) con el patrón de sección de la ficha (D-049). El selector usa
 * el mismo parámetro `period` que el filtro global de la cabecera, así que
 * ambos controles siempre muestran el mismo valor.
 */
export function ChartAreaInteractive({
  title,
  description,
  points,
  annotations,
  children,
}: {
  title: string;
  description: string;
  points: DashboardPayload["series"][string];
  annotations: DashboardPayload["annotations"];
  /** Alternativa tabular accesible, debajo del gráfico. */
  children?: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const period = params.get("period") ?? "28d";

  function setPeriod(value: string) {
    if (!value) return;
    const next = new URLSearchParams(params.toString());
    next.set("period", value);
    startTransition(() =>
      router.replace(`${pathname}?${next.toString()}`, { scroll: false }),
    );
  }

  /* Patrón de la ficha de marca (D-049): título y selector fuera, gráfico en un
     panel con filete fino. */
  return (
    <div aria-busy={pending || undefined}>
      <div className="section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <ToggleGroup
          type="single"
          value={period}
          onValueChange={setPeriod}
          variant="outline"
          aria-label="Periodo del gráfico"
          disabled={pending}
          className="*:data-[slot=toggle-group-item]:h-9 *:data-[slot=toggle-group-item]:px-3"
        >
          {PERIODS.map((item) => (
            <ToggleGroupItem
              key={item.key}
              value={item.key}
              aria-label={item.label}
              className="data-[state=on]:bg-accent-band data-[state=on]:text-primary"
            >
              {SHORT_PERIOD[item.key] ?? item.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="overview-chart-panel">
        <div className="mb-2 flex gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden className="inline-block h-0.75 w-2.5 bg-chart-1" />
            Periodo actual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i aria-hidden className="inline-block h-0.75 w-2.5 bg-chart-2" />
            Interanual
          </span>
        </div>
        <p className="sr-only" role="status" aria-live="polite">
          {pending ? "Actualizando el periodo del gráfico…" : ""}
        </p>
        <div
          className="transition-opacity duration-200 data-[pending]:opacity-40 motion-reduce:transition-none"
          data-pending={pending || undefined}
        >
          <TrendChart points={points} annotations={annotations} area />
        </div>
        {children}
      </div>
    </div>
  );
}
