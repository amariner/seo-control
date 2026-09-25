import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  HTMLAttributes,
  ReactNode,
} from "react";
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
export function Surface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-surface", className)} {...props} />;
}

/** Panel de datos: blanco o mineral, con borde y sin sombra por defecto. */
export function DataPanel({
  className,
  mineral = false,
  as: Tag = "div",
  ...props
}: HTMLAttributes<HTMLElement> & {
  mineral?: boolean;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={cx("ds-panel", mineral && "ds-panel-mineral", className)}
      {...props}
    />
  );
}

/** Única superficie elevada: diálogos, paneles laterales y el artefacto activo del editor. */
export function Overlay({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
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
export function StatusBadge({
  tone = "neutral",
  children,
  title,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span
      className={cx("ds-badge", `ds-badge-${tone}`, className)}
      title={title}
    >
      {children}
    </span>
  );
}

/** Alias histórico. */
export const Badge = StatusBadge;

export function Button({
  className,
  variant = "default",
  compact = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary" | "quiet";
  compact?: boolean;
}) {
  return (
    <button
      className={cx(
        "ds-button",
        variant === "primary" && "ds-button-primary",
        variant === "quiet" && "ds-button-quiet",
        compact && "ds-button-compact",
        className,
      )}
      {...props}
    />
  );
}

/** Enlace de procedencia compacto marcado en cobalto. */
export function EvidenceLink({
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={cx("ds-evidence", className)} {...props}>
      {children}
    </a>
  );
}

/* ---------------------------------------------------------------------------
 * Cabeceras y estructura editorial
 * ------------------------------------------------------------------------- */

export function SectionHeader({
  index,
  eyebrow,
  title,
  description,
  action,
  level = 2,
  id,
}: {
  index?: string;
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  level?: 2 | 3;
  id?: string;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <header className="ds-section-header">
      <div>
        {eyebrow || index ? (
          <p className="ds-eyebrow">
            {[index, eyebrow].filter(Boolean).join(" · ")}
          </p>
        ) : null}
        <Heading id={id} className={level === 2 ? "ds-h2" : "ds-h3"}>
          {title}
        </Heading>
        {description ? (
          <p className="ds-section-description">{description}</p>
        ) : null}
      </div>
      {action ? <div className="ds-section-action">{action}</div> : null}
    </header>
  );
}

export function EmptyState({
  title,
  children,
}: {
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="ds-empty" role="status">
      <strong>{title}</strong>
      {children ? <p style={{ margin: "6px 0 0" }}>{children}</p> : null}
    </div>
  );
}

export function Notice({
  tone = "warn",
  children,
  className,
}: {
  tone?: "warn" | "info" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "ds-notice",
        tone === "info" && "ds-notice-info",
        tone === "danger" && "ds-notice-danger",
        className,
      )}
      role={tone === "danger" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Métricas
 * ------------------------------------------------------------------------- */

export function formatValue(
  value: number,
  unit: DashboardPayload["metrics"][number]["unit"],
) {
  if (unit === "percent")
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}%`;
  if (unit === "score")
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(value)}/100`;
  if (unit === "position")
    return new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 }).format(
      value,
    );
  if (unit === "seconds")
    return `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(value)} s`;
  return new Intl.NumberFormat("es-ES", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    useGrouping: "always" as unknown as boolean,
    maximumFractionDigits: 1,
  }).format(value);
}

export function Delta({
  current,
  comparison,
  goodDirection = "up",
}: {
  current: number;
  comparison: number | null;
  goodDirection?: "up" | "down";
}) {
  if (comparison === null || comparison === 0)
    return <span className="delta muted">Sin comparación</span>;
  const change = ((current - comparison) / Math.abs(comparison)) * 100;
  const improving = goodDirection === "up" ? change >= 0 : change <= 0;
  const Icon =
    Math.abs(change) < 0.05
      ? Minus
      : change > 0
        ? ArrowUpRight
        : ArrowDownRight;
  return (
    <span className={cx("delta", improving ? "delta-good" : "delta-bad")}>
      <Icon size={14} aria-hidden />
      {Math.abs(change) < 0.05 ? "" : change > 0 ? "+" : "−"}
      {Math.abs(change).toLocaleString("es-ES", { maximumFractionDigits: 1 })}%
    </span>
  );
}

/** Un KPI dentro de `MetricStrip`: valor, comparación, interanual, objetivo y cobertura siempre visibles. */
export function MetricCard({
  metric,
}: {
  metric: DashboardPayload["metrics"][number];
}) {
  return (
    <article className="metric-card">
      <span className="metric-heading">{metric.label}</span>
      <strong className="metric-value">
        {formatValue(metric.value, metric.unit)}
      </strong>
      <div className="metric-comparisons">
        <span>
          <Delta
            current={metric.value}
            comparison={metric.previous}
            goodDirection={metric.goodDirection}
          />{" "}
          vs. periodo anterior
        </span>
        <span>
          <Delta
            current={metric.value}
            comparison={metric.previousYear}
            goodDirection={metric.goodDirection}
          />{" "}
          vs. año anterior
        </span>
      </div>
      {metric.target !== null ? (
        <div className="target">
          <span
            style={{
              width: `${Math.min(100, (metric.value / metric.target) * 100)}%`,
            }}
          />
          <small>Objetivo {formatValue(metric.target, metric.unit)}</small>
        </div>
      ) : null}
      {/* La cobertura sigue visible, pero como pie discreto: solo destaca si es parcial. */}
      <small
        className="metric-coverage"
        data-quality={metric.coverage.quality === "completa" ? "complete" : "partial"}
        title={`Cobertura ${metric.coverage.label}`}
      >
        Cobertura {Math.round(metric.coverage.ratio * 100)}&nbsp;%
      </small>
    </article>
  );
}

/** KPIs en columnas separadas por líneas finas, no tarjetas flotantes (D-049). */
export function MetricStrip({
  metrics,
}: {
  metrics: DashboardPayload["metrics"];
}) {
  return (
    <div className="ds-metric-strip" data-count={metrics.length}>
      {metrics.map((metric) => (
        <MetricCard key={metric.key} metric={metric} />
      ))}
    </div>
  );
}

export { cx };

/**
 * Panel de tabla densa: la superficie desplaza en horizontal cuando la tabla no
 * cabe, así que es una región con nombre y alcanzable con teclado (`tabIndex`).
 * Sin eso, quien navega con teclado no puede desplazar la tabla y Axe lo marca
 * como `scrollable-region-focusable`.
 */
export function DataTablePanel({
  label,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return (
    <div
      className={cx("card ds-panel matrix", className)}
      role="region"
      aria-label={label}
      tabIndex={0}
      {...props}
    >
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Sistema de decisiones (DESIGN_SYSTEM.md · Component contract)
 * ------------------------------------------------------------------------- */

export type DecisionThreadStep = {
  id: string;
  label: ReactNode;
  /** Procedencia o contexto breve: fuente, corte, responsable. */
  meta?: ReactNode;
  href: string;
  state?: "done" | "current" | "pending";
};

/**
 * Hilo de decisión: raíl de procedencia y navegación pegajoso en vertical, que
 * pasa a horizontal y desplazable en móvil (nunca se oculta, porque es la única
 * forma de saber de dónde viene una conclusión).
 *
 * Es un `nav` real con lista ordenada: el orden de los pasos es información, no
 * decoración, y se recorre entero con teclado.
 */
export function DecisionThread({
  steps,
  label = "Hilo de decisión",
  className,
}: {
  steps: DecisionThreadStep[];
  label?: string;
  className?: string;
}) {
  if (!steps.length) return null;
  return (
    <nav className={cx("ds-thread", className)} aria-label={label}>
      <p className="ds-eyebrow ds-thread-title">{label}</p>
      <ol className="ds-thread-list">
        {steps.map((step, index) => {
          const state = step.state ?? "pending";
          return (
            <li
              key={step.id}
              className={cx("ds-thread-step", `ds-thread-${state}`)}
            >
              <a
                href={step.href}
                aria-current={state === "current" ? "step" : undefined}
              >
                <span className="ds-thread-index" aria-hidden>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="ds-thread-body">
                  <strong>{step.label}</strong>
                  {step.meta ? <small>{step.meta}</small> : null}
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export type InsightStackItem = {
  id: string;
  title: ReactNode;
  summary?: ReactNode;
  /** Categoría, confianza y cualquier otro estado semántico ya construido. */
  badges?: ReactNode;
  evidence?: Array<{ id: string; label: ReactNode; href?: string }>;
  /** Decisión propuesta y quién la asume; el criterio de éxito va en `meta`. */
  action?: { label: ReactNode; owner?: ReactNode };
  meta?: ReactNode;
  href?: string;
};

/**
 * Pila de conclusiones: lista numerada y editorial, con evidencia, confianza y
 * acción visibles sin abrir nada. El número es el orden de lectura decidido por
 * una persona, no un ranking automático.
 *
 * El título es el enlace (cuando hay `href`), así que en móvil no hace falta
 * ocultar ningún control para que quepa.
 */
export function InsightStack({
  items,
  startIndex = 1,
  className,
}: {
  items: InsightStackItem[];
  startIndex?: number;
  className?: string;
}) {
  if (!items.length)
    return (
      <EmptyState title="Sin conclusiones para este periodo">
        Ninguna señal ha superado el umbral de impacto y confianza.
      </EmptyState>
    );
  return (
    <ol className={cx("ds-insight-stack", className)} start={startIndex}>
      {items.map((item, index) => (
        <li key={item.id} id={item.id} className="ds-insight-item">
          <span className="ds-insight-index" aria-hidden>
            {String(startIndex + index).padStart(2, "0")}
          </span>
          <div className="ds-insight-body">
            <div className="ds-insight-head">
              <h3 className="ds-h3">
                {item.href ? <a href={item.href}>{item.title}</a> : item.title}
              </h3>
              {item.badges ? (
                <div className="ds-insight-badges">{item.badges}</div>
              ) : null}
            </div>
            {item.summary ? (
              <p className="ds-insight-summary">{item.summary}</p>
            ) : null}
            {item.action ? (
              <p className="ds-insight-action">
                <span>Decisión propuesta</span>
                <strong>{item.action.label}</strong>
                {item.action.owner ? <small>{item.action.owner}</small> : null}
              </p>
            ) : null}
            {item.evidence?.length ? (
              <div className="ds-insight-evidence">
                {item.evidence.map((evidence) =>
                  evidence.href ? (
                    <EvidenceLink key={evidence.id} href={evidence.href}>
                      {evidence.label}
                    </EvidenceLink>
                  ) : (
                    <span
                      key={evidence.id}
                      className="ds-evidence ds-evidence-flat"
                    >
                      {evidence.label}
                    </span>
                  ),
                )}
              </div>
            ) : null}
            {item.meta ? <p className="ds-insight-meta">{item.meta}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

export type ChartFrameUnit = DashboardPayload["metrics"][number]["unit"];

export type ChartFrameTable = {
  caption: string;
  columns: string[];
  rows: Array<{ key: string; cells: Array<string | number | null> }>;
  /** Filas visibles antes de recortar la tabla; el resto sigue en la API. */
  limit?: number;
};

/**
 * Marco de gráfico: valor actual, periodo anterior, interanual, objetivo y
 * cobertura junto al gráfico, más la alternativa tabular obligatoria.
 *
 * La tabla vive en un `details` dentro del propio marco y no en otra página:
 * el contrato de accesibilidad pide que sea alcanzable con teclado desde el
 * mismo sitio donde está el gráfico.
 */
export function ChartFrame({
  eyebrow,
  title,
  description,
  value = null,
  unit = "number",
  previous = null,
  previousYear = null,
  target = null,
  coverage = null,
  goodDirection = "up",
  legend,
  table,
  footnote,
  children,
  className,
  level = 3,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  value?: number | null;
  unit?: ChartFrameUnit;
  previous?: number | null;
  previousYear?: number | null;
  target?: number | null;
  coverage?: { ratio: number; label: string; quality?: string } | null;
  goodDirection?: "up" | "down";
  legend?: ReactNode;
  table?: ChartFrameTable;
  footnote?: ReactNode;
  children: ReactNode;
  className?: string;
  /** El marco es h3 dentro de una sección con h2; sube a h2 cuando encabeza la sección. */
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  const rows = table
    ? table.limit
      ? table.rows.slice(0, table.limit)
      : table.rows
    : [];
  const hidden = table ? table.rows.length - rows.length : 0;
  return (
    <figure className={cx("ds-chart-frame", className)}>
      <div className="ds-chart-head">
        <div>
          {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
          <Heading className="ds-h3">{title}</Heading>
          {description ? (
            <p className="ds-chart-description">{description}</p>
          ) : null}
        </div>
        {legend ? <div className="ds-chart-legend">{legend}</div> : null}
      </div>
      <dl className="ds-chart-readout">
        <div>
          <dt>Valor actual</dt>
          <dd>{value === null ? "Pendiente" : formatValue(value, unit)}</dd>
        </div>
        <div>
          <dt>Periodo anterior</dt>
          <dd>
            {previous === null ? (
              "Sin comparación"
            ) : (
              <>
                {formatValue(previous, unit)}{" "}
                {value !== null ? (
                  <Delta
                    current={value}
                    comparison={previous}
                    goodDirection={goodDirection}
                  />
                ) : null}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Interanual</dt>
          <dd>
            {previousYear === null ? (
              "Sin interanual"
            ) : (
              <>
                {formatValue(previousYear, unit)}{" "}
                {value !== null ? (
                  <Delta
                    current={value}
                    comparison={previousYear}
                    goodDirection={goodDirection}
                  />
                ) : null}
              </>
            )}
          </dd>
        </div>
        <div>
          <dt>Objetivo</dt>
          <dd>
            {target === null
              ? "Sin objetivo definido"
              : formatValue(target, unit)}
          </dd>
        </div>
        <div>
          <dt>Cobertura</dt>
          <dd>
            {coverage ? (
              <>
                {Math.round(coverage.ratio * 100)}%{" "}
                <small>{coverage.label}</small>
              </>
            ) : (
              "Sin declarar"
            )}
          </dd>
        </div>
      </dl>
      <div className="ds-chart-plot">{children}</div>
      {table ? (
        <details className="ds-chart-table">
          <summary>Ver los datos como tabla</summary>
          <div
            className="ds-chart-table-scroll"
            role="region"
            aria-label={table.caption}
            tabIndex={0}
          >
            <table className="ds-table ds-table-dense">
              <caption>{table.caption}</caption>
              <thead>
                <tr>
                  {table.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    {row.cells.map((cell, index) =>
                      index === 0 ? (
                        <th key={index} scope="row">
                          {cell ?? "—"}
                        </th>
                      ) : (
                        <td key={index} className="ds-num">
                          {cell === null
                            ? "—"
                            : typeof cell === "number"
                              ? formatValue(cell, unit)
                              : cell}
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hidden > 0 ? (
            <p className="ds-chart-footnote">
              Se muestran {rows.length} de {table.rows.length} filas; la serie
              completa está en la API.
            </p>
          ) : null}
        </details>
      ) : null}
      {footnote ? (
        <figcaption className="ds-chart-footnote">{footnote}</figcaption>
      ) : null}
    </figure>
  );
}
