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
import { Badge } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppShell } from "./app-shell";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { SectionCards } from "./section-cards";
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

/** Tarjeta de sección de dashboard-01 con título navegable y enlace opcional. */
function SectionCard({
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
    <Card aria-labelledby={id} className="min-w-0 shadow-xs" role="region">
      <CardHeader>
        <CardTitle>
          <h2 id={id} className="m-0 text-base font-semibold tracking-normal">
            {title}
          </h2>
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {href || meta ? (
          <CardAction>
            {href ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 text-primary"
              >
                <Link href={href}>
                  {linkLabel}
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">{meta}</span>
            )}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
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
      <main
        className="@container/main flex w-full flex-1 flex-col gap-4 py-6 md:gap-6"
        id="contenido"
      >
        <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <div className="min-w-0">
            <p className="eyebrow">SEO Intelligence</p>
            <h1 className="m-0 text-3xl font-semibold tracking-tight">
              {selectedProject ?? "Resumen del grupo"}
            </h1>
            <p className="mt-2 mb-0 text-muted-foreground">
              {selectedProject
                ? "Resumen"
                : new Intl.ListFormat("es", { type: "conjunction" }).format(
                    PILOT_PROJECTS.map((brand) => brand.name),
                  )}{" "}
              · {selectedMarket}.
            </p>
          </div>
          <div className="grid gap-1 text-sm text-muted-foreground sm:text-right">
            <strong className="text-foreground">
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

        <section aria-labelledby="kpis" className="grid gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2
              id="kpis"
              className="m-0 text-base font-semibold tracking-normal"
            >
              Indicadores
            </h2>
            <Link className="section-link" href="/data">
              Fuentes y cobertura →
            </Link>
          </div>
          <SectionCards metrics={data.metrics} />
        </section>

        <section aria-label="Evolución">
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

        <div className="grid gap-4 md:gap-6 @5xl/main:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          <SectionCard
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
          </SectionCard>

          <SectionCard
            id="proyectos"
            title="Proyectos"
            href="/projects"
            linkLabel="Ver todos"
          >
            <ul className="m-0 grid list-none gap-2 p-0">
              {data.projects.map((project) => (
                <li key={project.slug}>
                  <Link
                    className="group flex items-center justify-between gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary hover:bg-accent-band"
                    href={`/projects/${project.slug}`}
                  >
                    <span className="grid min-w-0 gap-0.5">
                      <strong className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                        {project.name}
                      </strong>
                      <span className="truncate text-xs text-muted-foreground">
                        {project.domain}
                      </span>
                    </span>
                    {project.score !== null ? (
                      <span className="grid shrink-0 text-right text-xs text-muted-foreground">
                        <strong className="text-sm text-foreground tabular-nums">
                          {number(project.score)}/100
                        </strong>
                        {project.delta > 0 ? "+" : ""}
                        {project.delta} pts
                      </span>
                    ) : (
                      <ArrowUpRight
                        aria-hidden
                        className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                      />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        {data.actions.length > 0 && (
          <SectionCard
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
          </SectionCard>
        )}

        {geoConnected && (
          <SectionCard
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
          </SectionCard>
        )}

        <SectionCard
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
        </SectionCard>
      </main>
    </AppShell>
  );
}
