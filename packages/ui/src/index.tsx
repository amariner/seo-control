import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { DashboardPayload } from "@seo/contracts";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export * from "./echarts-theme";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type Tone = "neutral" | "good" | "warn" | "bad" | "info" | "outline";

/* ---------------------------------------------------------------------------
 * Superficies con significado (DESIGN_SYSTEM.md · Component contract)
 * ------------------------------------------------------------------------- */

/** Superficie plana; hereda el fondo mineral. Sin borde ni sombra. */
export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-surface", className)} {...props} />;
}

/** Panel de datos: blanco o mineral, con borde y sin sombra por defecto. */
export function DataPanel({ className, mineral = false, as: Tag = "div", ...props }: HTMLAttributes<HTMLElement> & { mineral?: boolean; as?: "div" | "section" | "article" | "aside" }) {
  return <Tag className={cx("ds-panel", mineral && "ds-panel-mineral", className)} {...props} />;
}

/** Única superficie elevada: diálogos, paneles laterales y el artefacto activo del editor. */
export function Overlay({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-overlay", className)} {...props} />;
}

/** Compatibilidad con la fundación P0: `Card` equivale a `DataPanel`. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("card ds-panel", className)} {...props} />;
}

/* ---------------------------------------------------------------------------
 * Estados, botones y enlaces de evidencia
 * ------------------------------------------------------------------------- */

/** Estado semántico: color más texto; nunca color solo. */
export function StatusBadge({ tone = "neutral", children, title, className }: { tone?: Tone; children: ReactNode; title?: string; className?: string }) {
  return <span className={cx("ds-badge", `ds-badge-${tone}`, className)} title={title}>{children}</span>;
}

/** Alias histórico. */
export const Badge = StatusBadge;

export function Button({ className, variant = "default", compact = false, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "quiet"; compact?: boolean }) {
  return <button className={cx("ds-button", variant === "primary" && "ds-button-primary", variant === "quiet" && "ds-button-quiet", compact && "ds-button-compact", className)} {...props} />;
}

/** Enlace de procedencia compacto marcado en cobalto. */
export function EvidenceLink({ className, children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={cx("ds-evidence", className)} {...props}>{children}</a>;
}

/* ---------------------------------------------------------------------------
 * Cabeceras y estructura editorial
 * ------------------------------------------------------------------------- */

export function SectionHeader({ index, eyebrow, title, description, action, level = 2, id }: { index?: string; eyebrow?: string; title: ReactNode; description?: ReactNode; action?: ReactNode; level?: 2 | 3; id?: string }) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <header className="ds-section-header">
      <div>
        {eyebrow || index ? <p className="ds-eyebrow">{[index, eyebrow].filter(Boolean).join(" · ")}</p> : null}
        <Heading id={id} className={level === 2 ? "ds-h2" : "ds-h3"}>{title}</Heading>
        {description ? <p className="ds-section-description">{description}</p> : null}
      </div>
      {action ? <div className="ds-section-action">{action}</div> : null}
    </header>
  );
}

export function EmptyState({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return <div className="ds-empty" role="status"><strong>{title}</strong>{children ? <p style={{ margin: "6px 0 0" }}>{children}</p> : null}</div>;
}

export function Notice({ tone = "warn", children, className }: { tone?: "warn" | "info" | "danger"; children: ReactNode; className?: string }) {
  return <div className={cx("ds-notice", tone === "info" && "ds-notice-info", tone === "danger" && "ds-notice-danger", className)} role={tone === "danger" ? "alert" : "status"}>{children}</div>;
}

/* ---------------------------------------------------------------------------
 * Métricas
 * ------------------------------------------------------------------------- */

export function formatValue(value: number, unit: DashboardPayload["metrics"][number]["unit"]) {
  if (unit === "percent") return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}%`;
  if (unit === "score") return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}/100`;
  if (unit === "position") return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value);
  if (unit === "seconds") return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} s`;
  return new Intl.NumberFormat("es-ES", { notation: value >= 1_000_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

export function Delta({ current, comparison, goodDirection = "up" }: { current: number; comparison: number | null; goodDirection?: "up" | "down" }) {
  if (comparison === null || comparison === 0) return <span className="delta muted">Sin comparación</span>;
  const change = ((current - comparison) / Math.abs(comparison)) * 100;
  const improving = goodDirection === "up" ? change >= 0 : change <= 0;
  const Icon = Math.abs(change) < 0.05 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return <span className={cx("delta", improving ? "delta-good" : "delta-bad")}><Icon size={14} aria-hidden />{Math.abs(change).toLocaleString("es-ES", { maximumFractionDigits: 1 })}%</span>;
}

/** Un KPI dentro de `MetricStrip`: valor, comparación, interanual, objetivo y cobertura siempre visibles. */
export function MetricCard({ metric }: { metric: DashboardPayload["metrics"][number] }) {
  return (
    <article className="metric-card">
      <div className="metric-heading"><span>{metric.label}</span><StatusBadge tone={metric.coverage.quality === "completa" ? "good" : "warn"} title={`Cobertura ${metric.coverage.label}`}>{Math.round(metric.coverage.ratio * 100)}%</StatusBadge></div>
      <strong className="metric-value">{formatValue(metric.value, metric.unit)}</strong>
      <div className="metric-comparisons">
        <span><Delta current={metric.value} comparison={metric.previous} goodDirection={metric.goodDirection} /> vs. periodo</span>
        <span><Delta current={metric.value} comparison={metric.previousYear} goodDirection={metric.goodDirection} /> interanual</span>
      </div>
      {metric.target !== null ? <div className="target"><span style={{ width: `${Math.min(100, (metric.value / metric.target) * 100)}%` }} /><small>Objetivo {formatValue(metric.target, metric.unit)}</small></div> : null}
    </article>
  );
}

/** Seis KPIs separados por líneas finas, no seis tarjetas flotantes. */
export function MetricStrip({ metrics }: { metrics: DashboardPayload["metrics"] }) {
  return <div className="ds-metric-strip">{metrics.map((metric) => <MetricCard key={metric.key} metric={metric} />)}</div>;
}

export { cx };
