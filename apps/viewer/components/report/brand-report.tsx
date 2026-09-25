import { Fragment, type ReactNode } from "react";
import { Database, Info } from "lucide-react";
import { findBrand, type BrandReport, type ReportKpi } from "@seo/contracts";
import { Notice } from "@seo/ui";
import { ReportDataTable, type ReportDataRow } from "./data-table";
import { EvolutionChart } from "./evolution-chart";
import { CompareBars } from "./compare-bars";
import { RangePicker, PresentControls } from "./range-picker";
import { MarketPicker } from "./market-picker";
import { ReportPrint } from "./report-print";
import { RankBar } from "./rank-bar";
import { BingLogo, GoogleLogo } from "./google-logo";
import { InfoHint } from "./info-hint";
import { ExpandableList, ExpandableTable } from "./expandable-table";
import { MoversList } from "./movers-list";
import { FilteredList } from "./filtered-list";
import { KeywordKpis } from "./keyword-kpis";
import { OPPORTUNITY_KINDS } from "./opportunity-kinds";
import {
  ReportPendingZone,
  ReportPendingMeta,
  ReportUpdateStatus,
  ReportMarketLabel,
  ReportMarketButton,
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
/* Tras la tarjeta de buscadores (visitas SEO y clics); conversiones al final (D-045). */
const primaryKeys: ReportKpi["key"][] = ["search_users"];
const labels: Record<ReportKpi["key"], string> = {
  search_sessions: "Visitas SEO",
  search_users: "Usuarios SEO",
  clicks: "Clics en Google",
  search_leads: "Conversiones SEO",
  nonbrand_share: "Clics sin marca",
  impressions: "Impresiones",
  ctr: "CTR en Google",
  web_sessions: "Visitas totales",
};
/** Texto del icono de información de cada tarjeta (D-045). */
const KPI_INFO: Partial<Record<ReportKpi["key"], string>> = {
  search_sessions:
    "Visitas desde todos los buscadores sin pagar (canal Organic Search). Google: clics de Search Console. Bing: visitas de Analytics que llegan desde Bing.",
  search_users:
    "Personas distintas que llegan desde buscadores. Una persona puede hacer varias visitas.",
  web_sessions: "Todas las visitas a la web, vengan del canal que vengan.",
  search_leads:
    "Acciones clave de las visitas desde buscadores: solicitudes de información, muestras, contacto.",
  clicks: "Clics en resultados de Google hacia la web, en la búsqueda web.",
  impressions:
    "Veces que la web aparece en resultados de Google, haya clic o no. Incluye Modo IA y AI Overviews sin desglose.",
  ctr: "De cada 100 apariciones en Google, cuántas acaban en clic.",
  nonbrand_share:
    "Parte de los clics con búsqueda visible que no incluyen la marca.",
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
      {change === null ? "—" : signedPercent(change)}
    </span>
  );
}

/** Variación con signo; desde 1.000 % se abrevia en miles («+1,6k %»). */
function signedPercent(change: number) {
  const sign = change > 0 ? "+" : change < 0 ? "−" : "";
  const size = Math.abs(change);
  return size >= 1000
    ? `${sign}${number(size / 1000, 1)}k %`
    : `${sign}${number(size, 1)} %`;
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
function Kpi({
  item,
  report,
  help = true,
  extra,
  trend,
}: {
  item: ReportKpi;
  report: BrandReport;
  help?: boolean;
  extra?: ReactNode;
  trend?: number[];
}) {
  return (
    <article className="brand-kpi">
      <KpiBody
        item={item}
        report={report}
        help={help}
        extra={extra}
        trend={trend}
      />
    </article>
  );
}

function KpiBody({
  item,
  report,
  source,
  extra,
  help = true,
  trend,
}: {
  item: ReportKpi;
  report: BrandReport;
  /** Oculta «Qué mide» (D-045: Visitas y Usuarios SEO no lo muestran). */
  help?: boolean;
  /** Valores del periodo para la mini gráfica junto a la cifra. */
  trend?: number[];
  /** Sustituye a la fuente bajo el nombre cuando hace falta precisar su alcance. */
  source?: string;
  /** Cifras de apoyo bajo las comparaciones. */
  extra?: ReactNode;
}) {
  const flagged =
    item.key === "search_leads" &&
    report.dataQuality.some((note) => /conversiones/i.test(note.text));
  return (
    <>
      <div className="brand-kpi-label">
        <span className="brand-kpi-title">
          {labels[item.key]}
          <InfoHint
            title={labels[item.key]}
            source={source ?? sourceName(item.source)}
            text={KPI_INFO[item.key] ?? item.help}
          />
        </span>
      </div>
      <ReportPendingZone variant="metric">
        <div className="brand-kpi-figure">
          <strong className="brand-kpi-value">
            {item.unit === "percent" ? percent(item.value) : number(item.value)}
          </strong>
          {trend ? <Sparkline points={trend} /> : null}
        </div>
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
        {extra}
        {flagged ? (
          <a className="brand-kpi-note" href="#calidad">
            <Info size={13} aria-hidden />
            Medición por validar
          </a>
        ) : !help ? null : (
          <details className="brand-metric-help">
            <summary>Qué mide</summary>
            <p>
              {item.key === "search_sessions"
                ? "Sesiones del canal Organic Search en GA4."
                : item.key === "search_users"
                  ? "Usuarios totales del canal Organic Search en GA4. Una persona puede hacer varias visitas."
                  : item.key === "clicks"
                    ? "Clics en los resultados de Google."
                    : item.key === "nonbrand_share"
                      ? "Porcentaje de clics con consulta visible que no incluyen la marca."
                      : item.help}
            </p>
          </details>
        )}
      </ReportPendingZone>
    </>
  );
}

/**
 * Visitas SEO como cifra principal y los clics de Google en pequeño dentro de
 * la misma tarjeta (D-045): son dos medidas del mismo tráfico, no dos KPI.
 */
function SearchTrafficCard({ report }: { report: BrandReport }) {
  const visits = metric(report, "search_sessions");
  const clicks = metric(report, "clicks");
  const bing = report.searchReconciliation?.engines.find(
    (engine) => engine.label === "Bing",
  );
  if (!visits) return null;
  return (
    <article className="brand-kpi">
      <KpiBody
        item={visits}
        report={report}
        help={false}
        trend={seriesValues(report.searchSeries, report.window.end)}
        extra={
          <>
            {clicks ? (
              <p className="brand-kpi-sub">
                <GoogleLogo />
                <strong>{number(clicks.value)} clics</strong>
                <Delta value={clicks.value} base={clicks.previous} />
              </p>
            ) : null}
            {bing ? (
              /* Bing no tiene clics conectados: son visitas GA4 desde Bing. */
              <p className="brand-kpi-sub brand-kpi-sub-tight">
                <BingLogo />
                <strong>{number(bing.sessions)} visitas</strong>
                <Delta value={bing.sessions} base={bing.previous || null} />
              </p>
            ) : null}
          </>
        }
      />
    </article>
  );
}

/**
 * Keywords posicionadas en Google y su reparto por posición media (D-045).
 * La barra se lee con su leyenda; los recuentos son la fuente, no el color.
 */
function KeywordsCard({ report }: { report: BrandReport }) {
  const data = report.keywordRanking;
  /* Cuota de clics, no de búsquedas distintas: unas pocas búsquedas de marca
     concentran casi todo el tráfico (D-045). */
  const nonBrandClicks = metric(report, "nonbrand_share");
  return (
    <article className="brand-kpi brand-kpi-keywords">
      <div className="brand-kpi-label">
        <span className="brand-kpi-title">
          Keywords
          <InfoHint
            title="Keywords"
            source="Search Console"
            text="Búsquedas de Google en las que la web aparece con impresiones en el periodo, repartidas por posición media. Google omite las búsquedas anónimas."
          />
        </span>
      </div>
      <ReportPendingZone variant="metric">
        <div className="brand-kpi-figure">
          <strong className="brand-kpi-value">
            {number(data?.total ?? null)}
            {data?.limitReached ? "+" : ""}
          </strong>
        </div>
        {data ? (
          <>
            <RankBar
              total={data.total}
              segments={[
                { key: "top3", label: "Top 3", count: data.top3 },
                { key: "top20", label: "Posición 4–20", count: data.top20 },
                { key: "rest", label: "Más de 20", count: data.rest },
              ]}
            />
            <div className="brand-kpi-comparisons">
              <span>
                <Delta value={data.total} base={data.previousTotal} />
                <small>vs. {report.window.previousLabel}</small>
              </span>
            </div>
            {nonBrandClicks?.value !== null &&
            nonBrandClicks?.value !== undefined ? (
              <MiniRing
                value={nonBrandClicks.value}
                label="de clics sin marca"
                detail={ppChange(nonBrandClicks.value, nonBrandClicks.previous)}
              />
            ) : null}
          </>
        ) : null}
      </ReportPendingZone>
    </article>
  );
}

/**
 * Visitas desde asistentes de IA y Modo IA de Google (D-046). Las visitas son
 * GA4; el Modo IA no tiene cifra propia porque Search Console no lo separa de
 * la búsqueda web (comprobado por API el 2026-09-24), y se dice así.
 */
function AiCard({ report }: { report: BrandReport }) {
  const data = report.aiTraffic;
  return (
    <article className="brand-kpi brand-kpi-ai">
      <div className="brand-kpi-label">
        <span className="brand-kpi-title">
          Visitas desde IA
          <InfoHint
            title="Visitas desde IA"
            source="GA4"
            text="Visitas que llegan desde un asistente de IA (ChatGPT, Gemini…), de cualquier canal. El Modo IA de Google no se publica por separado."
          />
        </span>
      </div>
      <ReportPendingZone variant="metric">
        <ExpandableTable
          caption="Visitas por asistente de IA"
          head={
            <tr className="brand-ai-total">
              <th scope="row">Total</th>
              <td>{number(data?.total ?? null)}</td>
              <td>
                {data ? (
                  <Delta value={data.total} base={data.previousTotal} />
                ) : null}
              </td>
            </tr>
          }
          rows={(data?.assistants ?? []).map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.label}</th>
              <td>{number(item.sessions)}</td>
              <td>
                <Delta value={item.sessions} base={item.previous} />
              </td>
            </tr>
          ))}
        />
      </ReportPendingZone>
    </article>
  );
}

/**
 * Anillo pequeño con un porcentaje y su texto al lado (D-045). El texto es la
 * fuente del dato; el anillo solo lo hace visible de un vistazo.
 */
function MiniRing({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="brand-mini-ring">
      <svg viewBox="0 0 36 36" aria-hidden className="brand-mini-ring-svg">
        <circle className="brand-mini-ring-track" cx="18" cy="18" r="15.9155" />
        <circle
          className="brand-mini-ring-value"
          cx="18"
          cy="18"
          r="15.9155"
          strokeDasharray={`${clamped} ${100 - clamped}`}
        />
      </svg>
      <span>
        <strong>{number(value, value < 100 && value % 1 ? 1 : 0)} %</strong>{" "}
        {label}
        {detail ? <small>{detail}</small> : null}
      </span>
    </div>
  );
}

/**
 * Mini gráfica de la evolución del periodo (D-045): una línea sin ejes para
 * ver la tendencia de un vistazo. La cifra y sus comparaciones siguen siendo
 * la fuente; el gráfico completo está en «Evolución del tráfico».
 */
function Sparkline({
  points,
  width = 72,
  height = 26,
}: {
  points: number[];
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (index: number) => (index / (points.length - 1)) * width;
  const y = (value: number) => 2 + (1 - (value - min) / span) * (height - 4);
  const line = points
    .map((value, index) => `${x(index).toFixed(1)},${y(value).toFixed(1)}`)
    .join(" ");
  const first = points[0]!;
  const last = points.at(-1)!;
  return (
    <svg
      className="brand-sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Evolución del periodo, media diaria: de ${number(first)} a ${number(last)}`}
    >
      <polyline
        points={`0,${height} ${line} ${width},${height}`}
        className="brand-sparkline-area"
      />
      <polyline points={line} className="brand-sparkline-line" />
      <circle
        cx={x(points.length - 1)}
        cy={y(last)}
        r="2"
        className="brand-sparkline-dot"
      />
    </svg>
  );
}

/** CTR por tramo a partir de clics e impresiones del mismo tramo. */
const ctrValues = (report: BrandReport) =>
  report.clickSeries.flatMap((point, index) => {
    const impressions = report.impressionsSeries[index]?.current;
    return point.current === null || !impressions
      ? []
      : [(point.current / impressions) * 100];
  });

/** Serie de la mini gráfica de cada indicador, cuando existe. */
const trendOf = (report: BrandReport, key: ReportKpi["key"]) =>
  key === "search_sessions"
    ? seriesValues(report.searchSeries, report.window.end)
    : key === "search_users"
      ? seriesValues(report.usersSeries, report.window.end)
      : key === "clicks"
        ? seriesValues(report.clickSeries, report.window.end)
        : key === "impressions"
          ? seriesValues(report.impressionsSeries, report.window.end)
          : key === "ctr"
            ? ctrValues(report)
            : undefined;

/**
 * Valores de una serie como media diaria de cada tramo (D-045). El último
 * tramo suele estar incompleto (90 días son 12 semanas y 6 días): su suma
 * caería en picado sin que el tráfico cayera.
 */
const seriesValues = (series: BrandReport["searchSeries"], end: string) =>
  series.flatMap((point, index) => {
    if (point.current === null) return [];
    const start = Date.parse(`${point.bucket}T00:00:00Z`);
    const next = series[index + 1]?.bucket;
    const stop = next
      ? Date.parse(`${next}T00:00:00Z`)
      : Date.parse(`${end}T00:00:00Z`) + 86_400_000;
    const days = Math.max(1, Math.round((stop - start) / 86_400_000));
    return [point.current / days];
  });

/** Variación en puntos porcentuales, con signo tipográfico. */
const ppChange = (value: number | null, previous: number | null) => {
  if (value === null || previous === null) return undefined;
  const change = value - previous;
  return `${change > 0 ? "+" : change < 0 ? "−" : ""}${number(Math.abs(change), 1)} pp vs. anterior`;
};

/** Nuevos frente a recurrentes dentro de Usuarios SEO (D-045). */
function UserMix({ report }: { report: BrandReport }) {
  const mix = report.userMix;
  if (!mix) return null;
  const total = mix.newUsers + mix.returningUsers;
  const share = total ? (mix.newUsers / total) * 100 : 0;
  return (
    <MiniRing
      value={share}
      label="nuevos"
      detail={ppChange(share, mix.previousNewShare)}
    />
  );
}

/** Variación de una fila: % en cifras, puntos en porcentajes (D-045). */
function ChangeCell({
  value,
  base,
  unit,
}: {
  value: number | null;
  base: number | null;
  unit: ReportKpi["unit"];
}) {
  if (value === null || base === null || (unit === "number" && base === 0))
    return <span className="brand-change is-empty">—</span>;
  const change =
    unit === "percent" ? value - base : ((value - base) / Math.abs(base)) * 100;
  const tone = Math.abs(change) < 0.05 ? "flat" : change > 0 ? "up" : "down";
  return (
    <span className={`brand-change is-${tone}`}>
      {unit === "percent"
        ? `${change > 0 ? "+" : change < 0 ? "−" : ""}${number(Math.abs(change), 1)} pp`
        : signedPercent(change)}
    </span>
  );
}

type MetricRow = {
  key: string;
  label: string;
  info: { source: string; text: string };
  unit: ReportKpi["unit"];
  value: number | null;
  previous: number | null;
  previousYear: number | null;
  trend?: number[];
};

/**
 * Todas las cifras del periodo con sus comparaciones (D-045): agrupadas por
 * fuente, con variación frente al periodo anterior y al año pasado y la
 * tendencia del periodo cuando hay serie. La fuente va en el icono de cada
 * indicador, no en una columna.
 */
function AllMetricsTable({ report }: { report: BrandReport }) {
  const kpi = (key: ReportKpi["key"]): MetricRow | null => {
    const item = metric(report, key);
    return item
      ? {
          key,
          label: labels[key],
          info: {
            source: sourceName(item.source),
            text: KPI_INFO[key] ?? item.help,
          },
          unit: item.unit,
          value: item.value,
          previous: item.previous,
          previousYear: item.previousYear,
          trend: trendOf(report, key),
        }
      : null;
  };
  const keywords = report.keywordRanking;
  const ai = report.aiTraffic;
  const groups: Array<{ title: string; rows: Array<MetricRow | null> }> = [
    {
      title: "Buscadores · Analytics",
      rows: [
        kpi("search_sessions"),
        kpi("search_users"),
        kpi("search_leads"),
        ai
          ? {
              key: "ai",
              label: "Visitas desde IA",
              info: {
                source: "GA4",
                text: "Visitas desde asistentes de IA (ChatGPT, Gemini…), de cualquier canal.",
              },
              unit: "number",
              value: ai.total,
              previous: ai.previousTotal,
              previousYear: null,
            }
          : null,
        kpi("web_sessions"),
      ],
    },
    {
      title: "Google · Search Console",
      rows: [
        kpi("clicks"),
        kpi("impressions"),
        kpi("ctr"),
        kpi("nonbrand_share"),
        keywords
          ? {
              key: "keywords",
              label: "Keywords posicionadas",
              info: {
                source: "Search Console",
                text: "Búsquedas de Google con impresiones en el periodo.",
              },
              unit: "number",
              value: keywords.total,
              previous: keywords.previousTotal,
              previousYear: null,
            }
          : null,
      ],
    },
  ];
  const format = (row: MetricRow, value: number | null) =>
    row.unit === "percent" ? percent(value) : number(value);
  return (
    <table className="brand-metrics-table">
      <caption className="ds-sr-only">
        Indicadores del periodo y valores de comparación
      </caption>
      <thead>
        <tr>
          <th scope="col">Indicador</th>
          <th scope="col" className="is-trend">
            <span className="ds-sr-only">Tendencia del periodo</span>
          </th>
          <th scope="col" className="is-num">
            Actual
          </th>
          <th scope="col" className="is-num">
            {previousName(report)}
          </th>
          <th scope="col" className="is-num">
            Variación
          </th>
          <th scope="col" className="is-num">
            Año pasado
          </th>
          <th scope="col" className="is-num">
            Interanual
          </th>
        </tr>
      </thead>
      {groups.map((group) => (
        <tbody key={group.title}>
          <tr className="brand-metrics-group">
            <th scope="colgroup" colSpan={7}>
              {group.title}
            </th>
          </tr>
          {group.rows.flatMap((row) =>
            row
              ? [
                  <tr key={row.key}>
                    <th scope="row">
                      <span className="brand-kpi-title">
                        {row.label}
                        <InfoHint
                          title={row.label}
                          source={row.info.source}
                          text={row.info.text}
                        />
                      </span>
                    </th>
                    <td className="is-trend">
                      {row.trend ? (
                        <Sparkline points={row.trend} width={64} height={20} />
                      ) : null}
                    </td>
                    <td className="is-num brand-metrics-current">
                      {format(row, row.value)}
                    </td>
                    <td className="is-num">{format(row, row.previous)}</td>
                    <td className="is-num">
                      <ChangeCell
                        value={row.value}
                        base={row.previous}
                        unit={row.unit}
                      />
                    </td>
                    <td className="is-num">{format(row, row.previousYear)}</td>
                    <td className="is-num">
                      <ChangeCell
                        value={row.value}
                        base={row.previousYear}
                        unit={row.unit}
                      />
                    </td>
                  </tr>,
                ]
              : [],
          )}
        </tbody>
      ))}
    </table>
  );
}

/** Conversiones SEO en la barra inferior, al final (D-045). */
function LeadsInline({ report }: { report: BrandReport }) {
  const item = metric(report, "search_leads");
  if (!item) return null;
  const flagged = report.dataQuality.some((note) =>
    /conversiones/i.test(note.text),
  );
  return (
    <span>
      {labels.search_leads}
      <strong>{number(item.value)}</strong>
      <span title={`vs. ${report.window.previousLabel}`}>
        <Delta value={item.value} base={item.previous} neutral={flagged} />
        <span className="ds-sr-only"> vs. {report.window.previousLabel}</span>
      </span>
      {flagged ? (
        <a
          className="brand-kpi-note"
          href="#calidad"
          title="Medición por validar"
        >
          <Info size={13} aria-hidden />
          <span className="ds-sr-only">Medición por validar</span>
        </a>
      ) : null}
    </span>
  );
}

/**
 * Periodo y mercado del informe. En la vista normal viven en la barra superior
 * (D-044); en el modo presentación, sin shell, vuelven al propio informe. En
 * ambos casos deben estar dentro del mismo `ReportNavigationProvider` que la
 * vista, porque comparten la carga por zonas de D-042.
 */
export function BrandReportControls({
  report,
  variant = "bar",
}: {
  report: BrandReport;
  variant?: "bar" | "header";
}) {
  const search = metric(report, "search_sessions");
  return (
    <RangePicker
      compact
      variant={variant}
      applied={report.window}
      cutoff={report.cutoff}
      gscFloor={report.gscFloor}
      marketSlot={
        <MarketPicker
          compact
          variant={variant}
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
  );
}

/** Logotipos oficiales facilitados por cada marca (`public/brands`). Sin logo, el título es el nombre. */
const BRAND_LOGOS: Partial<Record<string, string>> = {
  xtone: "/brands/xtone.svg",
};

/** Vista compartida de datos por marca. Los diagnósticos automáticos se conservan en el contrato, pero no se publican aquí. */
export function BrandReportView({
  report,
  tab,
  present,
  baseHref,
  query,
  controlsInHeader = false,
}: {
  report: BrandReport;
  tab: ReportTab;
  present: boolean;
  baseHref: string;
  query: string;
  /** La página ya pinta periodo y mercado en la cabecera del shell. */
  controlsInHeader?: boolean;
}) {
  const brand = findBrand(report.brand)!;
  const href = (key: ReportTab) =>
    `${baseHref}?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams(query)), tab: key })}`;
  const selectedMarket = report.markets.find(
    (item) => item.code === report.market,
  );
  return (
    <>
      <main
        className={`page report brand-report ${present ? "report-present" : ""}`}
        id="contenido"
      >
        <ReportPrint />
        <header className="brand-header">
          <div>
            <div className="brand-title">
              <h1>
                {BRAND_LOGOS[brand.slug] ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- SVG estático de marca; next/image no aporta nada aquí. */
                  <img
                    className="brand-logo"
                    src={BRAND_LOGOS[brand.slug]}
                    alt={brand.name}
                  />
                ) : (
                  brand.name
                )}
              </h1>
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
        {/* Con los controles en la cabecera, el corte ya se lee en el rango
            del periodo, que termina en él. */}
        {controlsInHeader ? null : <BrandReportControls report={report} />}
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
    </>
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
          <SearchTrafficCard report={report} />
          {primaryKeys.map((key) => {
            const item = metric(report, key);
            return item ? (
              <Kpi
                key={key}
                item={item}
                report={report}
                help={false}
                extra={
                  key === "search_users" ? <UserMix report={report} /> : null
                }
                trend={
                  key === "search_users"
                    ? seriesValues(report.usersSeries, report.window.end)
                    : undefined
                }
              />
            ) : null;
          })}
          <KeywordsCard report={report} />
          <AiCard report={report} />
        </div>
        <ReportPendingZone variant="rows">
          <div
            className="brand-secondary-metrics"
            role="region"
            aria-label="Otras cifras del periodo"
            tabIndex={0}
          >
            {(["impressions", "ctr"] as const).map((key) => {
              const item = metric(report, key);
              return item ? (
                <Fragment key={key}>
                  <span>
                    {labels[key]}
                    <strong>
                      {item.unit === "percent"
                        ? percent(item.value)
                        : number(item.value)}
                    </strong>
                    {trendOf(report, key) ? (
                      <Sparkline
                        points={trendOf(report, key)!}
                        width={44}
                        height={16}
                      />
                    ) : null}
                    <span title={`vs. ${report.window.previousLabel}`}>
                      <Delta value={item.value} base={item.previous} />
                      <span className="ds-sr-only">
                        {" "}
                        vs. {report.window.previousLabel}
                      </span>
                    </span>
                  </span>
                  {key === "impressions" ? (
                    /* Search Console no separa el Modo IA de la búsqueda web (D-045). */
                    <span title="Impresiones en el Modo IA de Google">
                      <GoogleLogo size={12} />
                      Modo IA
                      <strong>—</strong>
                      <small>sin desglose</small>
                    </span>
                  ) : null}
                </Fragment>
              ) : null;
            })}
            <LeadsInline report={report} />
          </div>
        </ReportPendingZone>
        <details className="brand-disclosure brand-all-metrics">
          <summary>Ver cifras y comparaciones completas</summary>
          <ReportPendingZone variant="table">
            <div
              className="brand-metrics-scroll"
              role="region"
              aria-label="Todos los indicadores"
              tabIndex={0}
            >
              <AllMetricsTable report={report} />
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
          clickSeries={report.clickSeries}
          impressionsSeries={report.impressionsSeries}
          webSeries={report.webSeries}
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
          >
            <div className="brand-list-head brand-channel-row" aria-hidden>
              <span>Canal</span>
              <span />
              <span>Visitas</span>
              <span>Variación</span>
            </div>
            <ExpandableList
              className="brand-list"
              rows={report.channels.map((item) => (
                <div
                  className="brand-list-row brand-channel-row"
                  key={item.key}
                >
                  <div>
                    <div className="brand-channel-name">
                      <span
                        className={
                          item.key === "Organic Search" ? "brand-emphasis" : ""
                        }
                      >
                        {item.label}
                      </span>
                      <small title="Cuota de las visitas de la web">
                        {percent(item.share)}
                      </small>
                    </div>
                    <div className="brand-mini-track" aria-hidden>
                      <i style={{ width: `${Math.min(100, item.share)}%` }} />
                    </div>
                  </div>
                  <span className="brand-list-trend">
                    {item.trend.length > 1 ? (
                      <Sparkline points={item.trend} width={56} height={18} />
                    ) : null}
                  </span>
                  <strong>{number(item.sessions)}</strong>
                  <span title={`vs. ${report.window.previousLabel}`}>
                    <Delta value={item.sessions} base={item.previous || null} />
                  </span>
                </div>
              ))}
            />
          </Section>
          <Section
            id="mercados-resumen"
            scope="period"
            skeleton="rows"
            title="Mercados principales"
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
            <div className="brand-list-head brand-market-row" aria-hidden>
              <span>Mercado</span>
              <span>Visitas SEO</span>
              <span>Variación</span>
            </div>
            <ExpandableList
              className="brand-list"
              rows={[...report.markets]
                // Con un mercado elegido en el selector, la tabla solo muestra ese.
                .filter(
                  (item) =>
                    report.market === "all" || item.code === report.market,
                )
                .sort(
                  (a, b) =>
                    Number(b.tier1) - Number(a.tier1) ||
                    b.sessions - a.sessions,
                )
                .map((item) => (
                  <ReportMarketButton
                    className="brand-list-row brand-market-row brand-market-button"
                    key={item.code}
                    active={item.code === report.market}
                    market={{
                      code: item.code,
                      name: item.name,
                      definition: item.definition,
                    }}
                  >
                    <span>{item.name}</span>
                    <strong>{number(item.sessions)}</strong>
                    <Delta value={item.sessions} base={item.previous} />
                  </ReportMarketButton>
                ))}
            />
          </Section>
        </div>
      ) : (
        <p className="brand-coverage">
          Canales y mercados no disponibles: GA4 no ha respondido.
        </p>
      )}
      <div className="brand-summary-grid">
        <Section
          id="keywords-tendencia"
          skeleton="rows"
          action={
            <ReportTabLink
              className="brand-link"
              href={href("busquedas")}
              tab="busquedas"
              label="Ver keywords"
              active={false}
            />
          }
          title="Tendencia de keywords"
        >
          <MoversList
            head={<MoversHead label="Keyword" report={report} />}
            up={report.keywordsUp.map((item) => (
              <MoverRow key={item.query} label={item.query} item={item} />
            ))}
            down={report.keywordsDown.map((item) => (
              <MoverRow key={item.query} label={item.query} item={item} />
            ))}
            empty={moversEmpty(report)}
          />
        </Section>
        <Section
          id="urls-tendencia"
          skeleton="rows"
          action={
            <ReportTabLink
              className="brand-link"
              href={href("paginas")}
              tab="paginas"
              label="Ver páginas"
              active={false}
            />
          }
          title="Tendencia de URLs"
        >
          <MoversList
            head={<MoversHead label="URL" report={report} />}
            up={report.contentUp.map((item) => (
              <MoverRow
                key={item.page}
                label={<Url value={item.page} />}
                item={item}
              />
            ))}
            down={report.contentDown.map((item) => (
              <MoverRow
                key={item.page}
                label={<Url value={item.page} />}
                item={item}
              />
            ))}
            empty={moversEmpty(report)}
          />
        </Section>
      </div>
    </>
  );
}
/** Sin fuente o sin periodo anterior no hay subidas ni bajadas que enseñar. */
function moversEmpty(report: BrandReport) {
  return report.sources.find((item) => item.source === "gsc")?.ok
    ? "Sin cambios de al menos 10 clics frente al periodo anterior."
    : "Search Console no ha respondido para este periodo.";
}
function MoversHead({ label, report }: { label: string; report: BrandReport }) {
  return (
    <div className="brand-list-head brand-mover-row" aria-hidden>
      <span>{label}</span>
      <span>{previousName(report)}</span>
      <span>Clics</span>
      <span>Posición</span>
      <span>Variación</span>
    </div>
  );
}
function MoverRow({
  label,
  item,
}: {
  label: ReactNode;
  item: {
    before: number;
    now: number;
    change: number | null;
    position: number | null;
    previousPosition: number | null;
  };
}) {
  const gained = item.now - item.before;
  return (
    <div className="brand-list-row brand-mover-row">
      <span className="brand-mover-label">{label}</span>
      <span className="brand-mover-before">{number(item.before)}</span>
      <strong>{number(item.now)}</strong>
      <span
        className="brand-mover-position"
        title={`Posición media en el periodo anterior: ${number(item.previousPosition, 1)}`}
      >
        {number(item.position, 1)}
      </span>
      <span
        className={`brand-delta ${gained >= 0 ? "delta-good" : "delta-bad"}`}
        title={`${gained >= 0 ? "+" : "−"}${number(Math.abs(gained))} clics`}
      >
        {item.change === null ? "Nueva" : signedPercent(item.change)}
      </span>
    </div>
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
/** Situación de la keyword objetivo, en corto para la lista. */
const TARGET_SITUATIONS: Array<{
  key: BrandReport["editorial"][number]["situation"];
  label: string;
}> = [
  { key: "ya-top", label: "Top 3" },
  { key: "cerca", label: "1.ª página" },
  { key: "lejos", label: "Lejos" },
  { key: "sin-presencia", label: "Sin presencia" },
];
const TARGET_SITUATION = new Map(
  TARGET_SITUATIONS.map((item) => [item.key, item.label]),
);
function TargetKeywords({ report }: { report: BrandReport }) {
  const targets = report.editorial
    .filter((item) => item.keyword)
    .sort(
      (a, b) =>
        Number(b.measured) - Number(a.measured) ||
        (a.position ?? 999) - (b.position ?? 999),
    );
  return (
    <Section
      id="keywords-objetivo"
      skeleton="rows"
      title="Keywords objetivo"
    >
      {targets.length ? (
        <>
          <FilteredList
            label="Situación de la keyword"
            options={TARGET_SITUATIONS}
            head={
              <div className="brand-list-head brand-target-row" aria-hidden>
                <span>Keyword</span>
                <span>Posición</span>
                <span>Clics</span>
              </div>
            }
            rows={targets.map((item) => ({
              id: item.id,
              kind: item.measured ? item.situation : "sin-presencia",
              node: (
              <div
                className="brand-list-row brand-target-row"
                title={item.advice}
              >
                <span className="brand-opportunity-query">
                  <strong>{item.keyword}</strong>
                  <small>
                    {item.measured
                      ? TARGET_SITUATION.get(item.situation)
                      : "Sin comprobar"}
                    {" · "}
                    {item.title}
                  </small>
                </span>
                <span>{number(item.position, 1)}</span>
                <strong>{item.measured ? number(item.clicks) : "—"}</strong>
              </div>
              ),
            }))}
          />
          <p className="brand-list-foot">
            Keywords de las piezas del plan editorial, medidas en Search
            Console en los últimos meses.
          </p>
        </>
      ) : (
        <p className="brand-coverage">
          <Info size={15} aria-hidden />
          El plan editorial de esta marca no tiene keywords objetivo.
        </p>
      )}
    </Section>
  );
}
function Opportunities({ report }: { report: BrandReport }) {
  const kindLabel = new Map(
    OPPORTUNITY_KINDS.map((item) => [item.key, item.name]),
  );
  return (
    <Section id="oportunidades" skeleton="rows" title="Oportunidades">
      {report.opportunities.length ? (
        <FilteredList
          label="Tipo de oportunidad"
          options={OPPORTUNITY_KINDS}
          head={
            <div className="brand-list-head brand-target-row" aria-hidden>
              <span>Keyword</span>
              <span>Posición</span>
              <span>Por ganar</span>
            </div>
          }
          rows={report.opportunities.map((item) => ({
            id: `${item.query}:${item.page ?? ""}`,
            kind: item.kind,
            node: (
              <div
                className="brand-list-row brand-target-row"
                title={`${kindLabel.get(item.kind)}: ${item.action} CTR ${percent(item.ctr)} (esperado ${percent(item.expectedCtr)}), ${number(item.impressions)} impresiones.`}
              >
                <span className="brand-opportunity-query">
                  <strong>{item.query}</strong>
                  <Url value={item.page} />
                </span>
                <span>{number(item.position, 1)}</span>
                <strong>+{number(item.potentialClicks)}</strong>
              </div>
            ),
          }))}
        />
      ) : (
        <p className="brand-coverage">
          <Info size={15} aria-hidden />
          Sin oportunidades con impresiones suficientes en este periodo.
        </p>
      )}
    </Section>
  );
}
function Keywords({ report }: { report: BrandReport }) {
  return (
    <>
      <KeywordKpis
        ranking={report.keywordRanking}
        totals={report.searchTotals}
        window={report.window}
      />
      <div className="brand-summary-grid">
        <TargetKeywords report={report} />
        <Opportunities report={report} />
      </div>
      <KeywordsTable report={report} />
    </>
  );
}
function KeywordsTable({ report }: { report: BrandReport }) {
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
