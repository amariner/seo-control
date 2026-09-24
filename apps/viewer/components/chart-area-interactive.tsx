"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import { PERIODS, type DashboardPayload } from "@seo/contracts";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
 * Tarjeta de evolución de dashboard-01 sobre ECharts (D-041). El selector usa
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

  return (
    <Card className="@container/card" aria-busy={pending || undefined}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <CardAction className="hidden @[767px]/card:block">
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-0 sm:px-6">
        <div className="mb-2 flex gap-4 px-2 text-xs text-muted-foreground sm:px-0">
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
      </CardContent>
    </Card>
  );
}
