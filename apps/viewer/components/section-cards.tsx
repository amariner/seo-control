import type { DashboardPayload } from "@seo/contracts";
import { Delta, formatValue } from "@seo/ui";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Metric = DashboardPayload["metrics"][number];

/**
 * KPIs de la portada como tarjetas de dashboard-01. El contrato de MetricStrip
 * se mantiene: valor, periodo anterior, interanual, objetivo y cobertura
 * siempre visibles, y la rejilla se ajusta al número real de métricas.
 */
export function SectionCards({ metrics }: { metrics: Metric[] }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 @xl/main:grid-cols-2",
        metrics.length >= 4 && "@5xl/main:grid-cols-4",
        metrics.length === 3 && "@5xl/main:grid-cols-3",
        metrics.length > 4 && "@7xl/main:grid-cols-6",
        "*:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs",
      )}
    >
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}

function MetricCard({ metric }: { metric: Metric }) {
  const complete = metric.coverage.quality === "completa";
  return (
    <Card className="@container/card gap-4">
      <CardHeader>
        <CardDescription className="text-[13px]">
          {metric.label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tracking-tight tabular-nums @[250px]/card:text-3xl">
          {formatValue(metric.value, metric.unit)}
        </CardTitle>
        <CardAction>
          <Badge
            variant="outline"
            title={`Cobertura ${metric.coverage.label}`}
            className={cn(
              "border-transparent",
              complete
                ? "bg-positive-soft text-positive"
                : "bg-warning-soft text-warning",
            )}
          >
            <span className="sr-only">Cobertura </span>
            {Math.round(metric.coverage.ratio * 100)}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="mt-auto flex-col items-stretch gap-1.5 text-[13px] text-muted-foreground">
        <span className="flex items-center justify-between gap-2">
          <span>vs. periodo anterior</span>
          <Delta
            current={metric.value}
            comparison={metric.previous}
            goodDirection={metric.goodDirection}
          />
        </span>
        <span className="flex items-center justify-between gap-2">
          <span>Interanual</span>
          <Delta
            current={metric.value}
            comparison={metric.previousYear}
            goodDirection={metric.goodDirection}
          />
        </span>
        {metric.target !== null ? (
          <span className="mt-2 grid gap-1.5">
            <span
              className="h-1 overflow-hidden rounded-full bg-muted"
              role="presentation"
            >
              <span
                className="block h-full rounded-full bg-primary"
                style={{
                  width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
                }}
              />
            </span>
            <span className="text-xs">
              Objetivo {formatValue(metric.target, metric.unit)}
            </span>
          </span>
        ) : null}
      </CardFooter>
    </Card>
  );
}
