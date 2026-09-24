import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, ChartFrame, MetricStrip, Notice } from "@seo/ui";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";
import { MODE_LABEL } from "@/components/dashboard";
import {
  PROJECT_CHAPTERS,
  isPilotProject,
  projectSlugSchema,
} from "@seo/contracts";
import { AppShell } from "@/components/app-shell";
import { UnmeasuredBrand } from "@/components/unmeasured-brand";
import { TrendChart } from "@/components/trend-chart";
import { getDashboard, parseFilters } from "@/lib/data";
import {
  BrandReportView,
  REPORT_TABS,
  type ReportTab,
} from "@/components/report/brand-report";
import { getBrandReport, reportFilters } from "@/lib/brand-report";
import { resolveReportTab } from "@/components/report/report-tab";

const chapterCopy = {
  resumen: "Indicadores y evolución del periodo.",
  negocio: "Visitas SEO y conversiones.",
  demanda: "Keywords y presencia en Google.",
  contenido: "Rendimiento de páginas.",
  tecnica: "Incidencias y URLs afectadas.",
  mercados: "Tráfico por mercado.",
  geo: "Presencia en buscadores de IA.",
  cronologia: "Informes y actividad del proyecto.",
} as const;

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug: rawSlug } = await params;
  const slugResult = projectSlugSchema.safeParse(rawSlug);
  if (!slugResult.success) notFound();
  const rawFilters = await searchParams;

  /* Informe ejecutivo (D-037): con un origen de dato real, la ficha de una marca
     medida es el informe para dirección. El sintético no lo ofrece y la ficha
     sigue siendo la de capítulos de validación de P1. */
  if (isPilotProject(slugResult.data)) {
    const report = await getBrandReport(slugResult.data, rawFilters);
    if (report) {
      const tabRaw = Array.isArray(rawFilters.tab)
        ? rawFilters.tab[0]
        : rawFilters.tab;
      const legacy = Array.isArray(rawFilters.chapter)
        ? rawFilters.chapter[0]
        : rawFilters.chapter;
      const tabs = REPORT_TABS.filter(
        (item) => item.key !== "migracion" || report.migration,
      );
      const tab: ReportTab = resolveReportTab(tabRaw, legacy, tabs.map((item) => item.key));
      const { present } = reportFilters(rawFilters);
      const query = new URLSearchParams(
        Object.entries(rawFilters).flatMap(([key, value]) =>
          key === "tab" || key === "chapter" || value === undefined
            ? []
            : [[key, Array.isArray(value) ? value[0]! : value]],
        ),
      ).toString();
      const view = (
        <BrandReportView
          report={report}
          tab={tab}
          present={present}
          baseHref={`/projects/${slugResult.data}`}
          query={query}
        />
      );
      return present ? (
        <div className="report-present-shell">{view}</div>
      ) : (
        <AppShell generatedAt={report.generatedAt} showGlobalFilters={false}>
          {view}
        </AppShell>
      );
    }
  }

  const chapterRaw = Array.isArray(rawFilters.chapter)
    ? rawFilters.chapter[0]
    : rawFilters.chapter;
  const chapter = PROJECT_CHAPTERS.some((item) => item.key === chapterRaw)
    ? (chapterRaw as keyof typeof chapterCopy)
    : "resumen";
  const filters = { ...parseFilters(rawFilters), project: slugResult.data };
  const data = await getDashboard(filters);
  const project = data.projects[0];
  /* El slug ya es válido —las ocho marcas lo son desde D-033—, así que no tener
     ficha analítica no es un 404: es una marca real que aún no se mide. */
  if (!project)
    return (
      <UnmeasuredBrand slug={slugResult.data} generatedAt={data.generatedAt} />
    );
  const query = new URLSearchParams({
    project: slugResult.data,
    market: filters.market,
    period: filters.period,
  });
  return (
    <AppShell generatedAt={data.generatedAt}>
      <nav className="project-tabs" aria-label="Capítulos del proyecto">
        {PROJECT_CHAPTERS.map((item) => (
          <Link
            className={`project-tab ${chapter === item.key ? "project-tab-active" : ""}`}
            aria-current={chapter === item.key ? "page" : undefined}
            key={item.key}
            href={`/projects/${slugResult.data}?${query}&chapter=${item.key}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="page" id="contenido">
        <header className="page-heading">
          <div>
            <p className="eyebrow">{project.domain}</p>
            <h1>{project.name}</h1>
            <p className="lede">{chapterCopy[chapter]}</p>
          </div>
          <div className="date-context">
            Corte {new Date(data.generatedAt).toLocaleDateString("es-ES")}
            <br />
            <strong>{MODE_LABEL[data.mode]}</strong>
          </div>
        </header>
        {data.mode === "synthetic" ? (
          <Notice tone="info">
            Datos sintéticos para validar la interfaz.
          </Notice>
        ) : null}
        {chapter === "resumen" || chapter === "negocio" ? (
          <>
            <MetricStrip metrics={data.metrics} />
            <section className="section">
              <ProjectTrend data={data} />
            </section>
          </>
        ) : null}
        {chapter === "resumen" && data.queryOpportunities.length ? (
          <QueryOpportunitiesSection queries={data.queryOpportunities} />
        ) : null}
        {chapter === "demanda" ? (
          <QueryOpportunitiesSection queries={data.queryOpportunities} />
        ) : null}
        {chapter === "contenido" || chapter === "demanda" ? (
          <section className="section">
            <div className="section-heading">
              <h2>Páginas</h2>
            </div>
            <OpportunitiesTable pages={data.opportunities} />
          </section>
        ) : null}
        {chapter === "tecnica" ? (
          <section className="section">
            <div className="section-heading">
              <h2>Incidencias técnicas</h2>
            </div>
            <IssuesTable issues={data.technicalIssues} />
          </section>
        ) : null}
        {chapter === "mercados" ? (
          <section className="section">
            <div className="section-heading">
              <h2>Datos por mercado</h2>
            </div>
            <MarketsTable markets={data.markets} />
          </section>
        ) : null}
        {chapter === "cronologia" ? (
          <section className="section">
            <div className="section-heading">
              <h2>Informes</h2>
              <Link href={`/cronologia?${query}`} className="section-link">
                Ver cronología →
              </Link>
            </div>
            <ReportsTable reports={data.reports} />
          </section>
        ) : null}
        {chapter === "geo" ? (
          <Notice tone="info">
            La medición GEO no está disponible en este corte.
          </Notice>
        ) : null}
        <footer className="section">
          <Link className="section-link" href={`/data?${query}`}>
            Fuentes y cobertura →
          </Link>
        </footer>
      </main>
    </AppShell>
  );
}

function ProjectTrend({
  data,
}: {
  data: Awaited<ReturnType<typeof getDashboard>>;
}) {
  const sessions = data.metrics.find(
    (metric) => metric.key === "organic_sessions",
  );
  const points = data.series.organic_sessions ?? [];
  return (
    <ChartFrame
      title="Visitas SEO"
      level={2}
      value={sessions?.value ?? null}
      unit={sessions?.unit ?? "number"}
      previous={sessions?.previous ?? null}
      previousYear={sessions?.previousYear ?? null}
      coverage={sessions?.coverage ?? null}
      legend={
        <>
          <span>
            <i className="legend-dot" />
            Actual
          </span>
          <span>
            <i className="legend-dot legend-dot-dash" />
            Interanual
          </span>
        </>
      }
      table={{
        caption: "Visitas SEO por fecha",
        columns: ["Fecha", "Actual", "Interanual"],
        rows: points.map((point) => ({
          key: point.date,
          cells: [point.date, point.value, point.previousYear],
        })),
      }}
    >
      <TrendChart points={points} annotations={data.annotations} />
    </ChartFrame>
  );
}

type Dashboard = Awaited<ReturnType<typeof getDashboard>>;
const n = (value: number) =>
  value.toLocaleString("es-ES", {
    useGrouping: "always" as unknown as boolean,
    maximumFractionDigits: 2,
  });
const row = (
  id: string,
  values: ReportDataRow["values"],
  cells?: ReportDataRow["cells"],
): ReportDataRow => ({
  id,
  values,
  cells,
  searchText: Object.values(values).join(" "),
});

function QueryOpportunitiesSection({
  queries,
}: {
  queries: Dashboard["queryOpportunities"];
}) {
  return (
    <section className="section">
      <div className="section-heading">
        <div>
          <h2>Keywords sin marca</h2>
          <p>Search Console · Consultas con margen de posición.</p>
        </div>
      </div>
      <ReportDataTable
        id="project-keywords"
        caption="Keywords sin marca"
        columns={[
          { key: "query", label: "Keyword" },
          { key: "page", label: "URL" },
          { key: "clicks", label: "Clics", numeric: true },
          { key: "impressions", label: "Impresiones", numeric: true },
          { key: "position", label: "Posición", numeric: true },
          { key: "ctr", label: "CTR", numeric: true },
        ]}
        rows={queries.map((q) =>
          row(
            q.id,
            {
              query: q.query,
              page: q.page,
              clicks: q.clicks,
              impressions: q.impressions,
              position: q.position,
              ctr: q.ctr,
            },
            {
              clicks: n(q.clicks),
              impressions: n(q.impressions),
              position: n(q.position),
              ctr: `${n(q.ctr)} %`,
            },
          ),
        )}
      />
    </section>
  );
}
function IssuesTable({ issues }: { issues: Dashboard["technicalIssues"] }) {
  return (
    <ReportDataTable
      id="project-issues"
      caption="Incidencias técnicas"
      searchPlaceholder="Buscar incidencia o plantilla…"
      columns={[
        { key: "title", label: "Incidencia" },
        { key: "severity", label: "Severidad" },
        { key: "urls", label: "URLs", numeric: true },
        { key: "traffic", label: "Tráfico afectado", numeric: true },
        { key: "runs", label: "Crawls", numeric: true },
      ]}
      rows={issues.map((issue) =>
        row(
          issue.id,
          {
            title: issue.title,
            severity: issue.severity,
            urls: issue.affectedUrls,
            traffic: issue.trafficAtRisk,
            runs: issue.persistenceRuns,
          },
          {
            title: (
              <Link href={`/issues/${issue.id}`}>
                <span className="cell-primary">{issue.title}</span>
                <span className="cell-secondary">
                  {issue.template} · {issue.category}
                </span>
              </Link>
            ),
            severity: (
              <Badge
                tone={
                  issue.severity === "critica"
                    ? "bad"
                    : issue.severity === "alta"
                      ? "warn"
                      : "neutral"
                }
              >
                {issue.severity}
              </Badge>
            ),
            traffic: n(issue.trafficAtRisk),
          },
        ),
      )}
    />
  );
}
function OpportunitiesTable({ pages }: { pages: Dashboard["opportunities"] }) {
  return (
    <ReportDataTable
      id="project-pages"
      caption="Páginas"
      searchPlaceholder="Buscar página o URL…"
      columns={[
        { key: "url", label: "Página" },
        { key: "status", label: "Estado" },
        { key: "clicks", label: "Clics", numeric: true },
        { key: "position", label: "Posición", numeric: true },
        { key: "ctr", label: "CTR", numeric: true },
      ]}
      rows={pages.map((page) => ({
        ...row(
          page.id,
          {
            url: page.url,
            status: page.status,
            clicks: page.clicks,
            position: page.position,
            ctr: page.ctr,
          },
          {
            url: (
              <Link href={`/pages/${page.id}`}>
                <span className="cell-primary">{page.title}</span>
                <span className="cell-secondary">{page.url}</span>
              </Link>
            ),
            clicks: n(page.clicks),
            ctr: `${n(page.ctr)} %`,
          },
        ),
        searchText: `${page.title} ${page.url} ${page.status}`,
      }))}
    />
  );
}
function MarketsTable({ markets }: { markets: Dashboard["markets"] }) {
  return (
    <ReportDataTable
      id="project-markets"
      caption="Mercados"
      searchPlaceholder="Buscar mercado…"
      columns={[
        { key: "name", label: "Mercado" },
        { key: "sessions", label: "Visitas SEO", numeric: true },
        { key: "clicks", label: "Clics", numeric: true },
        { key: "conversions", label: "Conversiones", numeric: true },
        { key: "change", label: "Variación", numeric: true },
      ]}
      rows={markets.map((market) =>
        row(
          market.code,
          {
            name: market.name,
            sessions: market.sessions,
            clicks: market.clicks,
            conversions: market.conversions,
            change: market.change,
          },
          {
            sessions: n(market.sessions),
            clicks: n(market.clicks),
            conversions: n(market.conversions),
            change: `${market.change > 0 ? "+" : ""}${n(market.change)} %`,
          },
        ),
      )}
    />
  );
}
function ReportsTable({ reports }: { reports: Dashboard["reports"] }) {
  return (
    <ReportDataTable
      id="project-reports"
      caption="Informes del proyecto"
      searchPlaceholder="Buscar informe…"
      columns={[
        { key: "title", label: "Informe" },
        { key: "period", label: "Periodo" },
        { key: "version", label: "Versión", numeric: true },
        { key: "status", label: "Estado" },
        { key: "reviewer", label: "Revisión" },
      ]}
      rows={reports.map((report) =>
        row(
          report.id,
          {
            title: report.title,
            period: report.period,
            version: report.version,
            status: report.status,
            reviewer: report.reviewer,
          },
          {
            title: (
              <Link className="section-link" href={`/reports/${report.id}`}>
                {report.title}
              </Link>
            ),
            version: `v${report.version}`,
            reviewer: report.reviewer ?? "Pendiente",
          },
        ),
      )}
    />
  );
}
