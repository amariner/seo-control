import Link from "next/link";
import {
  BRANDS,
  MARKETS,
  PILOT_PROJECTS,
  formatPeriodRange,
  type DashboardPayload,
} from "@seo/contracts";
import { Badge, Card, MetricStrip } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { AppShell } from "./app-shell";
import { TrendChart } from "./trend-chart";
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
      <main className="page overview-page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">SEO Intelligence</p>
            <h1>{selectedProject ?? "Resumen del grupo"}</h1>
            <p className="lede">
              {selectedProject
                ? "Resumen"
                : new Intl.ListFormat("es", { type: "conjunction" }).format(
                    PILOT_PROJECTS.map((brand) => brand.name),
                  )}{" "}
              · {selectedMarket}.
            </p>
          </div>
          <div className="date-context">
            <strong>
              {formatPeriodRange(data.window.start, data.window.end)}
            </strong>
            <p>{MODE_LABEL[data.mode]}</p>
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
          <div className="section-heading">
            <h2 id="kpis">Indicadores</h2>
            <Link className="section-link" href="/data">
              Fuentes y cobertura →
            </Link>
          </div>
          <MetricStrip metrics={data.metrics} />
        </section>

        <section className="section" aria-labelledby="evolucion">
          <div className="section-heading">
            <div>
              <h2 id="evolucion">Evolución</h2>
              <p>Sesiones orgánicas · GA4</p>
            </div>
          </div>
          <Card className="overview-chart">
            <div className="overview-legend">
              <span>
                <i className="legend-dot" />
                Periodo actual
              </span>
              <span>
                <i className="legend-dot legend-dot-dash" />
                Interanual
              </span>
            </div>
            <TrendChart points={points} annotations={data.annotations} />
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
          </Card>
        </section>

        <section className="section" aria-labelledby="mercados">
          <div className="section-heading">
            <div>
              <h2 id="mercados">Mercados</h2>
              <p>Variación de sesiones frente al periodo anterior.</p>
            </div>
          </div>
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
                    className={market.change >= 0 ? "delta-good" : "delta-bad"}
                  >
                    {percent(market.change)}
                  </span>
                ),
                visibility: `${market.visibility.toLocaleString("es-ES")}%`,
              },
            }))}
          />
        </section>

        <section className="section" aria-labelledby="proyectos">
          <div className="section-heading">
            <h2 id="proyectos">Proyectos</h2>
            <Link className="section-link" href="/projects">
              Ver todos →
            </Link>
          </div>
          <div className="overview-projects">
            {data.projects.map((project) => (
              <Link
                className="overview-project"
                href={`/projects/${project.slug}`}
                key={project.slug}
              >
                <strong>
                  {project.name}
                  <span aria-hidden="true">↗</span>
                </strong>
                <span>{project.domain}</span>
                {project.score !== null && (
                  <small>
                    Score {number(project.score)}/100 ·{" "}
                    {project.delta > 0 ? "+" : ""}
                    {project.delta} pts
                  </small>
                )}
              </Link>
            ))}
          </div>
        </section>

        {data.actions.length > 0 && (
          <section className="section" aria-labelledby="acciones">
            <div className="section-heading">
              <h2 id="acciones">Acciones</h2>
              <Link className="section-link" href="/actions">
                Ver plan →
              </Link>
            </div>
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
          </section>
        )}

        {geoConnected && (
          <section className="section" aria-labelledby="asistentes">
            <div className="section-heading">
              <h2 id="asistentes">Presencia en asistentes</h2>
              <span className="muted">
                {number(data.geo.totalPrompts)} ejecuciones
              </span>
            </div>
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
          </section>
        )}

        <section className="section" aria-labelledby="fuentes">
          <div className="section-heading">
            <h2 id="fuentes">Fuentes y cobertura</h2>
            <Link className="section-link" href="/data">
              Ver detalle →
            </Link>
          </div>
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
        </section>
      </main>
    </AppShell>
  );
}
