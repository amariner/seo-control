import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import {
  BRANDS,
  MARKETS,
  PILOT_PROJECTS,
  formatPeriodRange,
  type DashboardPayload,
} from "@seo/contracts";
import { Badge, MetricStrip } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { AppShell } from "./app-shell";
import { ChartAreaInteractive } from "./chart-area-interactive";
import "./overview.css";

const projectName = (slug: string) =>
  BRANDS.find((brand) => brand.slug === slug)?.name ?? slug;
const number = (value: number) =>
  value.toLocaleString("es-ES", {
    useGrouping: "always" as unknown as boolean,
    maximumFractionDigits: 0,
  });
const percent = (value: number) =>
  `${value > 0 ? "+" : ""}${value.toLocaleString("es-ES", { maximumFractionDigits: 1 })}%`;

/** Procedencia visible del payload. El origen `live` no es el almacén (D-034). */
export const MODE_LABEL = {
  synthetic: "Datos sintéticos de validación",
  live: "GA4 y Search Console en directo",
  database: "Almacén de datos propio",
} as const;

/**
 * Sección con el patrón de la ficha de marca (D-049): h2 con descripción gris y
 * enlace a la derecha, sin tarjeta alrededor. El contenido se separa por reglas.
 */
function Section({
  id,
  title,
  description,
  href,
  linkLabel,
  meta,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="overview-section">
      <div className="section-heading">
        <div>
          <h2 id={id}>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {href ? (
          <Link className="section-link" href={href}>
            {linkLabel} <ArrowUpRight aria-hidden size={14} />
          </Link>
        ) : meta ? (
          <span className="muted">{meta}</span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function Dashboard({ data }: { data: DashboardPayload }) {
  const points = data.series.organic_sessions ?? [];
  const semrushConnected = data.sources.some(
    (source) =>
      source.source === "semrush" && source.status !== "no_configurado",
  );
  const geoConnected = data.geo.totalPrompts > 0;
  const filterKey = `${data.filters.project}-${data.filters.market}-${data.filters.period}`;
  const selectedProject =
    data.filters.project === "all" ? null : projectName(data.filters.project);
  const selectedMarket =
    data.filters.market === "all"
      ? "Mercados Tier 1"
      : (MARKETS.find((market) => market.code === data.filters.market)?.name ??
        data.filters.market);

  return (
    <AppShell generatedAt={data.generatedAt}>
      <main className="page overview-page @container/main" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">
              {selectedProject ? "Resumen" : "Rendimiento orgánico"}
            </p>
            <h1>{selectedProject ?? "Resumen del grupo"}</h1>
            <p className="lede">
              {selectedProject
                ? (BRANDS.find((brand) => brand.slug === data.filters.project)
                    ?.domain ?? selectedProject)
                : new Intl.ListFormat("es", { type: "conjunction" }).format(
                    PILOT_PROJECTS.map((brand) => brand.name),
                  )}{" "}
              · {selectedMarket}.
            </p>
          </div>
          <div className="date-context overview-context">
            <strong>
              {formatPeriodRange(data.window.start, data.window.end)}
            </strong>
            <Badge tone={data.mode === "synthetic" ? "warn" : "info"}>
              {MODE_LABEL[data.mode]}
            </Badge>
            <details className="overview-periods">
              <summary>Comparativas · {data.window.days} días</summary>
              <p>
                Anterior:{" "}
                {formatPeriodRange(
                  data.window.previousStart,
                  data.window.previousEnd,
                )}
              </p>
              <p>
                Interanual:{" "}
                {formatPeriodRange(
                  data.window.previousYearStart,
                  data.window.previousYearEnd,
                )}
              </p>
            </details>
          </div>
        </header>

        <section aria-labelledby="kpis">
          <h2 id="kpis" className="ds-sr-only">
            Indicadores
          </h2>
          <MetricStrip metrics={data.metrics} />
          <p className="overview-kpi-foot">
            <Link className="section-link" href="/data">
              Fuentes y cobertura <ArrowUpRight aria-hidden size={14} />
            </Link>
          </p>
        </section>

        <section aria-label="Evolución" className="overview-section">
          <ChartAreaInteractive
            title="Evolución"
            description="Sesiones orgánicas diarias · GA4"
            points={points}
            annotations={data.annotations}
          >
            <details className="overview-details">
              <summary>Ver datos diarios</summary>
              <ReportDataTable
                key={filterKey}
                id="home-daily"
                caption="Sesiones orgánicas diarias"
                searchPlaceholder="Buscar fecha…"
                columns={[
                  { key: "date", label: "Fecha" },
                  { key: "value", label: "Sesiones", numeric: true },
                  { key: "previousYear", label: "Interanual", numeric: true },
                ]}
                rows={points.map((point) => ({
                  id: point.date,
                  searchText: point.date,
                  values: {
                    date: point.date,
                    value: point.value,
                    previousYear: point.previousYear,
                  },
                  cells: {
                    value: point.value === null ? "—" : number(point.value),
                    previousYear:
                      point.previousYear === null
                        ? "—"
                        : number(point.previousYear),
                  },
                }))}
              />
            </details>
          </ChartAreaInteractive>
        </section>

        <div className="overview-split">
          <Section
            id="mercados"
            title="Mercados"
            description="Variación de sesiones frente al periodo anterior."
          >
            <ReportDataTable
              key={filterKey}
              id="home-markets"
              caption="Resultados por mercado"
              searchPlaceholder="Buscar mercado…"
              columns={[
                { key: "name", label: "Mercado" },
                { key: "sessions", label: "Sesiones", numeric: true },
                { key: "change", label: "Variación", numeric: true },
                { key: "clicks", label: "Clics", numeric: true },
                { key: "conversions", label: "Eventos clave", numeric: true },
                ...(semrushConnected
                  ? [{ key: "visibility", label: "Visibilidad", numeric: true }]
                  : []),
              ]}
              rows={data.markets.map((market) => ({
                id: market.code,
                searchText: `${market.name} ${market.code}`,
                values: {
                  name: market.name,
                  sessions: market.sessions,
                  change: market.change,
                  clicks: market.clicks,
                  conversions: market.conversions,
                  visibility: semrushConnected ? market.visibility : null,
                },
                cells: {
                  name: (
                    <>
                      <span className="cell-primary">{market.name}</span>
                      <span className="cell-secondary">{market.code}</span>
                    </>
                  ),
                  sessions: number(market.sessions),
                  clicks: number(market.clicks),
                  conversions: number(market.conversions),
                  change: (
                    <span
                      className={
                        market.change >= 0 ? "delta-good" : "delta-bad"
                      }
                    >
                      {percent(market.change)}
                    </span>
                  ),
                  visibility: `${market.visibility.toLocaleString("es-ES")}%`,
                },
              }))}
            />
          </Section>

          <Section
            id="proyectos"
            title="Proyectos"
            href="/projects"
            linkLabel="Ver todos"
          >
            <ul className="overview-list">
              {data.projects.map((project) => (
                <li key={project.slug}>
                  <Link href={`/projects/${project.slug}`}>
                    <span className="overview-list-name">
                      <strong>{project.name}</strong>
                      <span>{project.domain}</span>
                    </span>
                    {project.score !== null ? (
                      <span className="overview-list-value">
                        <strong>{number(project.score)}/100</strong>
                        {project.delta > 0 ? "+" : ""}
                        {project.delta} pts
                      </span>
                    ) : (
                      <ArrowUpRight aria-hidden size={16} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {data.actions.length > 0 && (
          <Section
            id="acciones"
            title="Acciones"
            href="/actions"
            linkLabel="Ver plan"
          >
            <ReportDataTable
              key={filterKey}
              id="home-actions"
              caption="Acciones del periodo"
              searchPlaceholder="Buscar acción, proyecto o responsable…"
              columns={[
                { key: "title", label: "Acción" },
                { key: "project", label: "Proyecto" },
                { key: "owner", label: "Responsable" },
                { key: "status", label: "Estado" },
                { key: "due", label: "Fecha límite" },
              ]}
              rows={data.actions.map((action) => ({
                id: action.id,
                searchText: `${action.title} ${projectName(action.project)} ${action.owner}`,
                values: {
                  title: action.title,
                  project: projectName(action.project),
                  owner: action.owner,
                  status: action.status.replaceAll("_", " "),
                  due: action.dueDate,
                },
                cells: {
                  title: (
                    <Link href={`/actions#${action.id}`}>{action.title}</Link>
                  ),
                  status: (
                    <Badge
                      tone={action.status === "en_curso" ? "info" : "neutral"}
                    >
                      {action.status.replaceAll("_", " ")}
                    </Badge>
                  ),
                },
              }))}
            />
          </Section>
        )}

        {geoConnected && (
          <Section
            id="asistentes"
            title="Presencia en asistentes"
            meta={`${number(data.geo.totalPrompts)} ejecuciones`}
          >
            <dl className="overview-stats">
              <div>
                <dt>Cuota de citación</dt>
                <dd>{data.geo.citationShare.toLocaleString("es-ES")}%</dd>
                <small>
                  {data.geo.citationShare - data.geo.previousCitationShare > 0
                    ? "+"
                    : ""}
                  {(
                    data.geo.citationShare - data.geo.previousCitationShare
                  ).toLocaleString("es-ES", { maximumFractionDigits: 1 })}{" "}
                  pp
                </small>
              </div>
              <div>
                <dt>Prompts citados</dt>
                <dd>{number(data.geo.citedPrompts)}</dd>
              </div>
              <div>
                <dt>Sesiones IA</dt>
                <dd>{number(data.geo.aiSessions)}</dd>
              </div>
              <div>
                <dt>Conversiones IA</dt>
                <dd>{number(data.geo.aiConversions)}</dd>
              </div>
            </dl>
          </Section>
        )}

        <Section
          id="fuentes"
          title="Fuentes y cobertura"
          href="/data"
          linkLabel="Ver detalle"
        >
          <ReportDataTable
            key={filterKey}
            id="home-sources"
            caption="Estado de las fuentes"
            searchPlaceholder="Buscar fuente…"
            columns={[
              { key: "source", label: "Fuente" },
              { key: "status", label: "Estado" },
              { key: "coverage", label: "Cobertura", numeric: true },
              { key: "cutoff", label: "Corte" },
              { key: "note", label: "Detalle", sortable: false },
            ]}
            rows={data.sources.map((source) => ({
              id: source.source,
              searchText: `${source.label} ${source.source} ${source.note}`,
              values: {
                source: source.label,
                status: source.status.replaceAll("_", " "),
                coverage: source.coverage,
                cutoff: source.cutoff,
                note: source.note,
              },
              cells: {
                status: (
                  <Badge
                    tone={
                      source.status === "correcto"
                        ? "good"
                        : source.status === "parcial" ||
                            source.status === "retrasado"
                          ? "warn"
                          : source.status === "no_configurado"
                            ? "neutral"
                            : "bad"
                    }
                  >
                    {source.status.replaceAll("_", " ")}
                  </Badge>
                ),
                coverage: `${Math.round(source.coverage * 100)}%`,
              },
            }))}
            note={
              data.mode === "live"
                ? "Datos consultados en directo. Pendientes de reconciliación en el almacén propio."
                : MODE_LABEL[data.mode]
            }
          />
        </Section>
      </main>
    </AppShell>
  );
}
