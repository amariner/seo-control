import Link from "next/link";
import type { ReactNode } from "react";
import { Database, Info } from "lucide-react";
import { findBrand, type BrandReport, type ReportKpi } from "@seo/contracts";
import { Notice } from "@seo/ui";
import { ReportDataTable, type ReportDataRow } from "./data-table";
import { EvolutionChart } from "./evolution-chart";
import { CompareBars } from "./compare-bars";
import { RangePicker, PresentControls } from "./range-picker";
import { MarketPicker } from "./market-picker";
import { ReportPrint } from "./report-print";
import {
  ReportNavigationProvider,
  ReportPendingZone,
  ReportPendingMeta,
  ReportUpdateStatus,
  ReportMarketLabel,
  ReportTabLink,
  ReportRetryButton,
} from "./report-navigation";
import type { ReportPendingScope } from "./report-navigation-model";
import "./brand-report.css";

export const REPORT_TABS = [
  { key: "resumen", label: "Resumen" },
  { key: "busquedas", label: "Keywords" },
  { key: "paginas", label: "Páginas" },
  { key: "mercados", label: "Mercados" },
  { key: "migracion", label: "Migración" },
  { key: "editorial", label: "Plan editorial" },
] as const;
export type ReportTab = (typeof REPORT_TABS)[number]["key"];

const number = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
const date = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const percent = (value: number | null) =>
  value === null ? "—" : `${number(value, 1)} %`;
const delta = (value: number | null, base: number | null) =>
  value === null || base === null || base === 0
    ? null
    : ((value - base) / Math.abs(base)) * 100;
const metric = (report: BrandReport, key: ReportKpi["key"]) =>
  report.kpis.find((item) => item.key === key);
const primaryKeys: ReportKpi["key"][] = [
  "search_sessions",
  "clicks",
  "search_leads",
  "nonbrand_share",
];
const labels: Record<ReportKpi["key"], string> = {
  search_sessions: "Visitas SEO",
  clicks: "Clics en Google",
  search_leads: "Conversiones SEO",
  nonbrand_share: "Clics sin marca",
  impressions: "Impresiones",
  ctr: "CTR en Google",
  web_sessions: "Visitas totales",
};
const sourceName = (source: string) =>
  source === "ga4" ? "GA4" : "Search Console";
const row = (
  id: string,
  values: ReportDataRow["values"],
  cells: ReportDataRow["cells"] = {},
): ReportDataRow => ({
  id,
  values,
  cells,
  searchText: Object.values(values)
    .filter((value) => value !== null)
    .join(" "),
});
const previousName = (report: BrandReport) =>
  report.window.compare === "custom" ? "Comparación" : "Anterior";
function Delta({
  value,
  base,
  neutral = false,
}: {
  value: number | null;
  base: number | null;
  neutral?: boolean;
}) {
  const change = delta(value, base);
  return (
    <span
      className={`brand-delta ${change === null || neutral ? "" : change >= 0 ? "delta-good" : "delta-bad"}`}
    >
      {change === null
        ? "—"
        : `${change > 0 ? "+" : change < 0 ? "−" : ""}${number(Math.abs(change), 1)} %`}
    </span>
  );
}
function Url({ value }: { value: string | null }) {
  if (!value) return <span className="muted">—</span>;
  let label = value;
  try {
    const parsed = new URL(value);
    label = decodeURI(parsed.pathname) + parsed.search;
  } catch {
    /* La fuente también devuelve rutas relativas. */
  }
  return (
    <span className="brand-url" title={value}>
      {label}
    </span>
  );
}
function Section({
  id,
  title,
  subtitle,
  action,
  children,
  scope = "selection",
  skeleton = "table",
}: {
  id: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  scope?: ReportPendingScope;
  skeleton?: "metric" | "chart" | "table" | "rows";
}) {
  return (
    <section className="brand-section" aria-labelledby={id}>
      <header className="brand-section-head">
        <div>
          <h2 id={id}>{title}</h2>
          {subtitle && (
            <p>
              <ReportPendingMeta scope={scope}>{subtitle}</ReportPendingMeta>
            </p>
          )}
        </div>
        {action}
      </header>
      <ReportPendingZone scope={scope} variant={skeleton}>
        {children}
      </ReportPendingZone>
    </section>
  );
}
function qualityNote(report: BrandReport, text: string) {
  if (/tráfico directo/i.test(text)) {
    const direct = report.channels.find((item) => item.key === "Direct");
    return direct
      ? `Tráfico directo: ${number(direct.sessions)} visitas frente a ${number(direct.previous)}. Medición pendiente de validar.`
      : text;
  }
  if (/sin clasificar/i.test(text)) {
    const unassigned = report.channels.find(
      (item) => item.key === "Unassigned",
    );
    return unassigned
      ? `Visitas sin canal identificado: ${percent(unassigned.share)}.`
      : text;
  }
  if (/conversiones/i.test(text)) {
    const leads = metric(report, "search_leads");
    return `Conversiones SEO: ${number(leads?.value ?? null)} frente a ${number(leads?.previous ?? null)}. Definición del evento ${report.funnel.leadEvent ?? "clave"} pendiente de validar.`;
  }
  return text;
}
function Kpi({ item, report }: { item: ReportKpi; report: BrandReport }) {
  const flagged =
    item.key === "search_leads" &&
    report.dataQuality.some((note) => /conversiones/i.test(note.text));
  return (
    <article className="brand-kpi">
      <div className="brand-kpi-label">
        <span>{labels[item.key]}</span>
        <span className="brand-source">{sourceName(item.source)}</span>
      </div>
      <ReportPendingZone variant="metric">
        <strong className="brand-kpi-value">
          {item.unit === "percent" ? percent(item.value) : number(item.value)}
        </strong>
        <div className="brand-kpi-comparisons">
          <span>
            <Delta value={item.value} base={item.previous} neutral={flagged} />
            <small>vs. {report.window.previousLabel}</small>
          </span>
          <span>
            <Delta
              value={item.value}
              base={item.previousYear}
              neutral={flagged}
            />
            <small>vs. {report.window.previousYearLabel}</small>
          </span>
        </div>
        {flagged ? (
          <a className="brand-kpi-note" href="#calidad">
            <Info size={13} aria-hidden />
            Medición por validar
          </a>
        ) : (
          <details className="brand-metric-help">
            <summary>Qué mide</summary>
            <p>
              {item.key === "search_sessions"
                ? "Sesiones del canal Organic Search en GA4."
                : item.key === "clicks"
                  ? "Clics en los resultados de Google."
                  : item.key === "nonbrand_share"
                    ? "Porcentaje de clics con consulta visible que no incluyen la marca."
                    : item.help}
            </p>
          </details>
        )}
      </ReportPendingZone>
    </article>
  );
}

/** Vista compartida de datos por marca. Los diagnósticos automáticos se conservan en el contrato, pero no se publican aquí. */
export function BrandReportView({
  report,
  tab,
  present,
  baseHref,
  query,
}: {
  report: BrandReport;
  tab: ReportTab;
  present: boolean;
  baseHref: string;
  query: string;
}) {
  const brand = findBrand(report.brand)!;
  const href = (key: ReportTab) =>
    `${baseHref}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), tab: key })}`;
  const search = metric(report, "search_sessions");
  const selectedMarket = report.markets.find(
    (item) => item.code === report.market,
  );
  return (
    <ReportNavigationProvider>
      <main
        className={`page report brand-report ${present ? "report-present" : ""}`}
        id="contenido"
      >
        <ReportPrint />
        <header className="brand-header">
          <div>
            <nav
              className="brand-breadcrumb no-print"
              aria-label="Ruta del proyecto"
            >
              <Link href="/projects">Proyectos</Link>
              <span aria-hidden>/</span>
              <span>{brand.name}</span>
            </nav>
            <div className="brand-title">
              <h1>{brand.name}</h1>
              <span>Rendimiento orgánico</span>
            </div>
            <p className="brand-domain">
              {brand.domain}
              <span aria-hidden>·</span>
              <ReportMarketLabel>
                {selectedMarket?.name ?? "Todos los mercados"}
              </ReportMarketLabel>
            </p>
          </div>
          <PresentControls present={present} />
        </header>
        <RangePicker
          compact
          applied={report.window}
          cutoff={report.cutoff}
          gscFloor={report.gscFloor}
          marketSlot={
            <MarketPicker
              compact
              markets={report.markets}
              selected={report.market}
              totalSessions={
                report.market === "all" ? (search?.value ?? null) : null
              }
              totalPrevious={
                report.market === "all" ? (search?.previous ?? null) : null
              }
              comparisonLabel={report.window.previousLabel}
            />
          }
        />
        <ReportUpdateStatus />
        <p className="brand-print-context">
          {date(report.window.start)} – {date(report.window.end)} ·{" "}
          {selectedMarket?.name ?? "Todos los mercados"}. Comparación:{" "}
          {date(report.window.previousStart)} –{" "}
          {date(report.window.previousEnd)}. Año pasado:{" "}
          {date(report.window.previousYearStart)} –{" "}
          {date(report.window.previousYearEnd)}.
        </p>
        <nav
          className="brand-tabs no-print"
          aria-label={`Secciones de ${brand?.name ?? report.brand}`}
        >
          {REPORT_TABS.filter(
            (item) => item.key !== "migracion" || report.migration,
          ).map((item) => (
            <ReportTabLink
              href={href(item.key)}
              key={item.key}
              tab={item.key}
              label={item.label}
              active={tab === item.key}
            />
          ))}
        </nav>
        {report.sources.some((item) => !item.ok) && (
          <Notice tone="danger">
            {report.sources
              .filter((item) => !item.ok)
              .map(
                (item) =>
                  `${sourceName(item.source)} no disponible. ${item.note}`,
              )
              .join(" ")}
            <ReportRetryButton />
          </Notice>
        )}
        <div
          key={`${tab}:${report.window.start}:${report.window.end}:${report.window.previousStart}:${report.window.previousEnd}:${report.window.previousYearStart}:${report.window.previousYearEnd}:${report.market}`}
        >
          {tab === "resumen" && <Summary report={report} href={href} />}
          {tab === "busquedas" && <Keywords report={report} />}
          {tab === "paginas" && <Pages report={report} />}
          {tab === "mercados" && <Markets report={report} />}
          {tab === "migracion" && <Migration report={report} />}
          {tab === "editorial" && <Editorial report={report} />}
        </div>
        <Quality report={report} />
        <footer className="brand-footer">
          <span>
            <Database size={14} aria-hidden />
            Datos reales · GA4 y Search Console
          </span>
          <span>
            <ReportPendingMeta>
              Última lectura:{" "}
              {new Date(report.generatedAt).toLocaleString("es-ES", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "Europe/Madrid",
              })}
            </ReportPendingMeta>
          </span>
        </footer>
      </main>
    </ReportNavigationProvider>
  );
}

function Summary({
  report,
  href,
}: {
  report: BrandReport;
  href: (key: ReportTab) => string;
}) {
  const ga4Ready = report.sources.some(
    (source) => source.source === "ga4" && source.ok,
  );
  return (
    <>
      <section
        className="brand-overview"
        aria-label="Indicadores SEO del periodo"
      >
        <div className="brand-kpis">
          {primaryKeys.map((key) => {
            const item = metric(report, key);
            return item ? <Kpi key={key} item={item} report={report} /> : null;
          })}
        </div>
        <ReportPendingZone variant="rows">
          <div className="brand-secondary-metrics">
            {(["impressions", "ctr"] as const).map((key) => {
              const item = metric(report, key);
              return item ? (
                <span key={key}>
                  {labels[key]}
                  <strong>
                    {item.unit === "percent"
                      ? percent(item.value)
                      : number(item.value)}
                  </strong>
                  <Delta value={item.value} base={item.previous} />
                  <small>vs. {report.window.previousLabel}</small>
                </span>
              ) : null;
            })}
          </div>
        </ReportPendingZone>
        <details className="brand-disclosure brand-all-metrics">
          <summary>Ver cifras y comparaciones completas</summary>
          <ReportPendingZone variant="table">
            <div
              className="report-data-scroll"
              role="region"
              aria-label="Todos los indicadores"
              tabIndex={0}
            >
              <table className="report-data-table">
                <caption className="ds-sr-only">
                  Indicadores del periodo y valores de comparación
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Indicador</th>
                    <th scope="col">Actual</th>
                    <th scope="col">{previousName(report)}</th>
                    <th scope="col">Año pasado</th>
                    <th scope="col">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {report.kpis.map((item) => {
                    const format = item.unit === "percent" ? percent : number;
                    return (
                      <tr key={item.key}>
                        <th scope="row">{labels[item.key]}</th>
                        <td className="report-data-numeric">
                          {format(item.value)}
                        </td>
                        <td className="report-data-numeric">
                          {format(item.previous)}
                        </td>
                        <td className="report-data-numeric">
                          {format(item.previousYear)}
                        </td>
                        <td>{sourceName(item.source)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="brand-caption">
              Tráfico total y conversiones sujetos a los avisos de medición.
              Fechas de comparación en «Fuentes y calidad del dato».
            </p>
          </ReportPendingZone>
        </details>
      </section>
      <Section
        id="evolucion"
        skeleton="chart"
        title="Evolución del tráfico"
        subtitle={`${report.window.granularity === "day" ? "Datos diarios" : report.window.granularity === "week" ? "Datos semanales" : "Datos mensuales"} · ${date(report.window.start)} – ${date(report.window.end)}`}
      >
        <EvolutionChart
          searchSeries={report.searchSeries}
          clickSeries={report.clickSeries}
          window={report.window}
          annotations={report.annotations}
        />
      </Section>
      {ga4Ready ? (
        <div className="brand-summary-grid">
          <Section
            id="canales"
            skeleton="rows"
            title="Canales de tráfico"
            subtitle="Visitas de toda la web · GA4"
          >
            <div className="brand-list">
              {report.channels.slice(0, 5).map((item) => (
                <div className="brand-list-row" key={item.key}>
                  <div>
                    <span
                      className={
                        item.key === "Organic Search" ? "brand-emphasis" : ""
                      }
                    >
                      {item.label}
                    </span>
                    <div className="brand-mini-track" aria-hidden>
                      <i style={{ width: `${Math.min(100, item.share)}%` }} />
                    </div>
                  </div>
                  <strong>{number(item.sessions)}</strong>
                  <span>{percent(item.share)}</span>
                </div>
              ))}
            </div>
            <details className="brand-disclosure">
              <summary>
                Ver los {report.channels.length} canales y comparativas
              </summary>
              <Channels report={report} />
            </details>
          </Section>
          <Section
            id="mercados-resumen"
            scope="period"
            skeleton="rows"
            title="Mercados principales"
            subtitle="Visitas SEO · Todos los mercados · GA4"
            action={
              <ReportTabLink
                className="brand-link"
                href={href("mercados")}
                tab="mercados"
                label="Ver mercados"
                active={false}
              />
            }
          >
            <div className="brand-list">
              {[...report.markets]
                .filter((item) => item.tier1)
                .sort((a, b) => b.sessions - a.sessions)
                .map((item) => (
                  <div className="brand-list-row" key={item.code}>
                    <span>{item.name}</span>
                    <strong>{number(item.sessions)}</strong>
                    <Delta value={item.sessions} base={item.previous} />
                  </div>
                ))}
            </div>
            <p className="brand-caption">
              Variación frente al {report.window.previousLabel}. Los mercados se
              definen por sección y país.
            </p>
          </Section>
        </div>
      ) : (
        <p className="brand-coverage">
          Canales y mercados no disponibles: GA4 no ha respondido.
        </p>
      )}
      <details className="brand-disclosure brand-history">
        <summary>Histórico mensual · últimos 12 meses cerrados</summary>
        <ReportPendingZone scope="market" variant="chart">
          <p className="brand-caption">
            Visitas SEO por mes frente al mismo mes del año anterior · GA4.
          </p>
          <CompareBars
            label="Visitas SEO por mes frente al año anterior"
            categories={report.months.map((item) => item.label)}
            series={[
              {
                key: "current",
                name: "Actual",
                values: report.months.map((item) => item.searchSessions),
              },
              {
                key: "previousYear",
                name: "Año anterior",
                values: report.months.map(
                  (item) => item.searchSessionsPreviousYear,
                ),
              },
            ]}
          />
          <ReportDataTable
            id="monthly"
            caption="Histórico mensual"
            columns={[
              { key: "month", label: "Mes" },
              { key: "sessions", label: "Visitas SEO", numeric: true },
              { key: "previous", label: "Año anterior", numeric: true },
            ]}
            rows={report.months.map((item) =>
              row(
                item.month,
                {
                  month: item.month,
                  sessions: item.searchSessions,
                  previous: item.searchSessionsPreviousYear,
                },
                {
                  month: item.label,
                  sessions: number(item.searchSessions),
                  previous: number(item.searchSessionsPreviousYear),
                },
              ),
            )}
          />
        </ReportPendingZone>
      </details>
    </>
  );
}
function Channels({ report }: { report: BrandReport }) {
  return (
    <ReportDataTable
      id="channels"
      caption="Canales de tráfico"
      searchPlaceholder="Buscar canal…"
      columns={[
        { key: "channel", label: "Canal" },
        { key: "sessions", label: "Visitas", numeric: true },
        { key: "share", label: "Cuota", numeric: true },
        {
          key: "change",
          label: `vs. ${previousName(report).toLowerCase()}`,
          numeric: true,
        },
        { key: "year", label: "vs. año pasado", numeric: true },
        { key: "leads", label: "Conversiones", numeric: true },
      ]}
      rows={report.channels.map((item) =>
        row(
          item.key,
          {
            channel: item.label,
            sessions: item.sessions,
            share: item.share,
            change: delta(item.sessions, item.previous),
            year: delta(item.sessions, item.previousYear),
            leads: item.leads,
          },
          {
            sessions: number(item.sessions),
            share: percent(item.share),
            change: <Delta value={item.sessions} base={item.previous} />,
            year: <Delta value={item.sessions} base={item.previousYear} />,
            leads: number(item.leads),
          },
        ),
      )}
      note="GA4 · Todas las visitas. Las anomalías de medición se detallan al pie de la página."
    />
  );
}
function Coverage({
  report,
  kind,
}: {
  report: BrandReport;
  kind: "searchQueries" | "pages";
}) {
  const coverage = report.explorerCoverage[kind];
  return (
    <p className="brand-coverage">
      <Info size={15} aria-hidden />
      {coverage.available
        ? `Muestra de Search Console: ${number(coverage.rowsReturned)} ${kind === "searchQueries" ? "combinaciones de keyword y URL sin marca" : "URLs"}. ${coverage.limitReached ? `Límite de ${number(coverage.rowLimit)} filas alcanzado; puede haber más resultados.` : "No representa todo el inventario del sitio."}`
        : "Muestra no disponible para este periodo. No equivale a cero resultados."}
    </p>
  );
}
function Keywords({ report }: { report: BrandReport }) {
  return (
    <Section
      id="keywords"
      title="Keywords sin marca"
      subtitle="Búsquedas genéricas y la URL que aparece en Google."
    >
      <Coverage report={report} kind="searchQueries" />
      {report.explorerCoverage.searchQueries.available && (
        <ReportDataTable
          id="keywords"
          caption="Keywords sin marca"
          searchPlaceholder="Buscar keyword o URL…"
          columns={[
            { key: "query", label: "Keyword" },
            { key: "page", label: "URL" },
            { key: "clicks", label: "Clics", numeric: true },
            { key: "impressions", label: "Impresiones", numeric: true },
            { key: "ctr", label: "CTR", numeric: true },
            { key: "position", label: "Posición", numeric: true },
          ]}
          rows={report.searchQueries.map((item) =>
            row(`${item.query}:${item.page}`, item, {
              page: <Url value={item.page} />,
              clicks: number(item.clicks),
              impressions: number(item.impressions),
              ctr: percent(item.ctr),
              position: number(item.position, 1),
            }),
          )}
          note="CTR = clics / impresiones. Posición media en Google; un valor menor indica una posición más alta. Las consultas anónimas de Google no se incluyen."
        />
      )}
    </Section>
  );
}
function Pages({ report }: { report: BrandReport }) {
  return (
    <>
      <Section
        id="paginas"
        title="Páginas en Google"
        subtitle="Tráfico y visibilidad por URL · Search Console."
      >
        <Coverage report={report} kind="pages" />
        {report.explorerCoverage.pages.available && (
          <ReportDataTable
            id="pages"
            caption="Páginas en Google"
            searchPlaceholder="Buscar URL…"
            columns={[
              { key: "page", label: "URL" },
              { key: "clicks", label: "Clics", numeric: true },
              {
                key: "previousClicks",
                label: "Clics anteriores",
                numeric: true,
              },
              { key: "change", label: "Variación", numeric: true },
              { key: "impressions", label: "Impresiones", numeric: true },
              { key: "ctr", label: "CTR", numeric: true },
              { key: "position", label: "Posición", numeric: true },
            ]}
            rows={report.pages.map((item) =>
              row(
                item.page,
                { ...item, change: delta(item.clicks, item.previousClicks) },
                {
                  page: <Url value={item.page} />,
                  clicks: number(item.clicks),
                  previousClicks: number(item.previousClicks),
                  change: (
                    <Delta value={item.clicks} base={item.previousClicks} />
                  ),
                  impressions: number(item.impressions),
                  ctr: percent(item.ctr),
                  position: number(item.position, 1),
                },
              ),
            )}
            note={`Anterior: ${date(report.window.previousStart)} – ${date(report.window.previousEnd)}. «—» indica que no hay dato comparable en la muestra, no cero clics.`}
          />
        )}
      </Section>
      <Section
        id="conversiones"
        title="Páginas con conversiones"
        subtitle="Las ocho páginas con más conversiones SEO · GA4."
      >
        <ReportDataTable
          id="conversions"
          caption="Páginas con conversiones SEO"
          searchPlaceholder="Buscar URL o keyword…"
          columns={[
            { key: "page", label: "Página de entrada" },
            { key: "sessions", label: "Visitas SEO", numeric: true },
            { key: "leads", label: "Conversiones", numeric: true },
            { key: "rate", label: "Por 100 visitas", numeric: true },
            { key: "queries", label: "Keywords" },
          ]}
          rows={report.convertingPages.map((item) =>
            row(
              item.page,
              { ...item, queries: item.queries.join(" · ") },
              {
                page: <Url value={item.page} />,
                sessions: number(item.sessions),
                leads: number(item.leads),
                rate: number(item.rate, 1),
              },
            ),
          )}
          note="Conversiones = eventos clave de GA4. Un usuario puede generar más de un evento. Keywords visibles de Search Console."
        />
      </Section>
    </>
  );
}
function Markets({ report }: { report: BrandReport }) {
  if (!report.sources.some((source) => source.source === "ga4" && source.ok))
    return (
      <Section id="mercados" title="Rendimiento por mercado" scope="period">
        <p>Datos por mercado no disponibles: GA4 no ha respondido.</p>
      </Section>
    );
  const sorted = [...report.markets].sort((a, b) => b.sessions - a.sessions);
  return (
    <Section
      id="mercados"
      scope="period"
      title="Rendimiento por mercado"
      subtitle="Visitas SEO y conversiones. Cada mercado indica qué parte de la web incluye."
    >
      <div className="brand-chart-panel">
        <CompareBars
          horizontal
          height={Math.max(320, sorted.length * 48)}
          label="Visitas SEO por mercado"
          categories={sorted.map((item) => item.name)}
          series={[
            {
              key: "current",
              name: "Actual",
              values: sorted.map((item) => item.sessions),
            },
            {
              key: "previous",
              name: previousName(report),
              values: sorted.map((item) => item.previous),
            },
            {
              key: "previousYear",
              name: "Año pasado",
              values: sorted.map((item) => item.previousYear),
            },
          ]}
        />
      </div>
      <ReportDataTable
        id="markets"
        caption="Mercados"
        searchPlaceholder="Buscar mercado o sección…"
        columns={[
          { key: "name", label: "Mercado" },
          { key: "sessions", label: "Visitas SEO", numeric: true },
          {
            key: "change",
            label: `vs. ${previousName(report).toLowerCase()}`,
            numeric: true,
          },
          { key: "year", label: "vs. año pasado", numeric: true },
          { key: "clicks", label: "Clics Google", numeric: true },
          { key: "leads", label: "Conversiones", numeric: true },
        ]}
        rows={sorted.map((item) =>
          row(
            item.code,
            {
              name: item.name,
              definition: item.definition,
              sessions: item.sessions,
              change: delta(item.sessions, item.previous),
              year: delta(item.sessions, item.previousYear),
              clicks: item.clicks,
              leads: item.leads,
            },
            {
              name: (
                <span className="brand-cell-label">
                  {item.name}
                  <small>{item.definition}</small>
                </span>
              ),
              sessions: number(item.sessions),
              change: (
                <span className="brand-cell-comparison">
                  <Delta value={item.sessions} base={item.previous} />
                  <small>Antes: {number(item.previous)}</small>
                </span>
              ),
              year: (
                <span className="brand-cell-comparison">
                  <Delta value={item.sessions} base={item.previousYear} />
                  <small>Año pasado: {number(item.previousYear)}</small>
                </span>
              ),
              clicks: number(item.clicks),
              leads: number(item.leads),
            },
          ),
        )}
        note="Comparativa de todos los mercados, aunque el filtro superior seleccione uno. GA4: visitas y conversiones. Search Console: clics. Las secciones no asignadas pueden hacer que la suma difiera del total."
      />
    </Section>
  );
}
function Migration({ report }: { report: BrandReport }) {
  const migration = report.migration;
  if (!migration)
    return (
      <Section id="migracion" title="Migración" scope="fixed">
        <p>No hay datos de migración disponibles.</p>
      </Section>
    );
  return (
    <Section
      id="migracion"
      scope="fixed"
      title="Migración de URLs"
      subtitle={`Cambio de estructura: ${date(migration.date)}. Comparativa fija de toda la web.`}
    >
      <p className="brand-coverage">
        <Info size={15} aria-hidden />
        Este bloque usa sus propias fechas y todos los mercados; no cambia con
        los filtros superiores.
      </p>
      <div className="brand-migration-stats">
        <div>
          <span>Clics antes</span>
          <strong>{number(migration.siteClicksBefore)}</strong>
          <small>
            {date(migration.beforeStart)} – {date(migration.beforeEnd)}
          </small>
        </div>
        <div>
          <span>Clics después</span>
          <strong>{number(migration.siteClicksAfter)}</strong>
          <small>
            {date(migration.afterStart)} – {date(migration.afterEnd)}
          </small>
        </div>
        <div>
          <span>Variación</span>
          <strong>
            <Delta
              value={migration.siteClicksAfter}
              base={migration.siteClicksBefore}
            />
          </strong>
          <small>
            {number(migration.lostUrls)} URLs antiguas pierden más del 80 %
          </small>
        </div>
      </div>
      <ReportDataTable
        id="migration"
        caption="Redirecciones de URLs antiguas"
        searchPlaceholder="Buscar URL antigua o destino…"
        columns={[
          { key: "oldUrl", label: "URL antigua" },
          { key: "clicksBefore", label: "Clics antes", numeric: true },
          { key: "redirectsTo", label: "Destino" },
          { key: "httpStatus", label: "HTTP", numeric: true },
          { key: "finalStatus", label: "HTTP final", numeric: true },
          { key: "targetClicks", label: "Clics destino", numeric: true },
          { key: "recovery", label: "Recuperación", numeric: true },
        ]}
        rows={migration.urls.map((item) =>
          row(
            item.oldUrl,
            {
              oldUrl: item.oldUrl,
              clicksBefore: item.clicksBefore,
              redirectsTo: item.redirectsTo,
              httpStatus: item.httpStatus,
              finalStatus: item.finalStatus,
              targetClicks: item.targetClicks,
              recovery: item.recovery,
            },
            {
              oldUrl: <Url value={item.oldUrl} />,
              clicksBefore: number(item.clicksBefore),
              redirectsTo: <Url value={item.redirectsTo} />,
              targetClicks: number(item.targetClicks),
              recovery: percent(
                item.recovery === null ? null : item.recovery * 100,
              ),
            },
          ),
        )}
        note={`Muestra de ${migration.checked} URLs comprobadas. Recuperación = (clics de la antigua + su destino después) / clics de la antigua antes. Un destino compartido puede contar para varias URLs; las filas no se deben sumar.`}
      />
    </Section>
  );
}
function Editorial({ report }: { report: BrandReport }) {
  return (
    <Section
      id="editorial"
      title="Plan editorial"
      subtitle="Piezas previstas y datos de su keyword objetivo."
    >
      <ReportDataTable
        id="editorial"
        caption={`Plan editorial de ${findBrand(report.brand)?.name ?? report.brand}`}
        searchPlaceholder="Buscar pieza, keyword o URL…"
        columns={[
          { key: "title", label: "Pieza" },
          { key: "month", label: "Mes" },
          { key: "keyword", label: "Keyword" },
          { key: "status", label: "Estado" },
          { key: "position", label: "Posición", numeric: true },
          { key: "clicks", label: "Clics", numeric: true },
          { key: "impressions", label: "Impresiones", numeric: true },
        ]}
        rows={report.editorial.map((item) =>
          row(
            item.id,
            {
              month: item.month,
              title: item.title,
              keyword: item.keyword,
              status: item.status,
              page: item.page,
              position: item.measured ? item.position : null,
              clicks: item.measured ? item.clicks : null,
              impressions: item.measured ? item.impressions : null,
            },
            {
              month: item.month
                ? new Date(`${item.month}-01T00:00:00Z`).toLocaleDateString(
                    "es-ES",
                    { month: "short", year: "numeric", timeZone: "UTC" },
                  )
                : "Sin fecha",
              title: (
                <span className="brand-cell-label">
                  {item.title}
                  <small>{item.type}</small>
                </span>
              ),
              position: number(item.measured ? item.position : null, 1),
              clicks: number(item.measured ? item.clicks : null),
              impressions: number(item.measured ? item.impressions : null),
            },
          ),
        )}
        note={`Hasta 20 piezas desde el mes anterior al corte. Datos de Google: últimos 90 días hasta ${date(report.cutoff)}, independientemente del periodo superior. «—» indica una consulta no disponible; 0 es una consulta realizada sin clics.`}
      />
    </Section>
  );
}
function Quality({ report }: { report: BrandReport }) {
  const warnings = report.dataQuality.filter((item) => item.tone === "warn");
  return (
    <details className="brand-quality" id="fuentes">
      <summary>
        <Info size={16} aria-hidden />
        <span>Fuentes y calidad del dato</span>
        {warnings.length > 0 && (
          <span className="brand-quality-count">
            <ReportPendingMeta>
              {warnings.length} avisos de medición
            </ReportPendingMeta>
          </span>
        )}
      </summary>
      <ReportPendingZone variant="rows">
        <div className="brand-quality-body" id="calidad">
          <dl>
            <div>
              <dt>Corte del dato</dt>
              <dd>{date(report.cutoff)}</dd>
            </div>
            <div>
              <dt>Periodo</dt>
              <dd>
                {date(report.window.start)} – {date(report.window.end)}
              </dd>
            </div>
            <div>
              <dt>Comparación</dt>
              <dd>
                {date(report.window.previousStart)} –{" "}
                {date(report.window.previousEnd)}
              </dd>
            </div>
            <div>
              <dt>Año pasado</dt>
              <dd>
                {date(report.window.previousYearStart)} –{" "}
                {date(report.window.previousYearEnd)}
              </dd>
            </div>
            <div>
              <dt>Fuentes</dt>
              <dd>
                {report.sources
                  .map(
                    (item) =>
                      `${sourceName(item.source)}: ${item.ok ? "disponible" : "no disponible"}`,
                  )
                  .join(" · ")}
              </dd>
            </div>
          </dl>
          <p>
            Visitas SEO: canal Organic Search de GA4. Los clics proceden de
            Google Search Console. Son métricas distintas y no forman un embudo
            de usuarios.
          </p>
          <p>
            Clics sin marca: porcentaje de clics con consulta visible. Las
            búsquedas anónimas quedan fuera. «—» significa dato no disponible.
          </p>
          {report.dataQuality.length > 0 && (
            <ul>
              {report.dataQuality.map((item) => (
                <li key={item.text}>{qualityNote(report, item.text)}</li>
              ))}
            </ul>
          )}
        </div>
      </ReportPendingZone>
    </details>
  );
}
