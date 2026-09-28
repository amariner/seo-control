import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { analysePages } from "./page-analysis";

/**
 * Informe del proyecto (D-073): recopilación simplificada de las pestañas del
 * proyecto, una diapositiva por apartado con sus cifras clave y una aclaración
 * breve. Las aclaraciones se redactan con plantillas a partir de las cifras,
 * nunca con IA ni con conclusiones que el dato no sostenga. La misma estructura
 * sirve al modo presentación (pantalla) y al PDF (impresión A4, como la V1).
 */

export type DeckMetric = {
  label: string;
  value: string;
  /** Variación ya formateada frente al periodo anterior y su sentido. */
  change?: { text: string; tone: "good" | "bad" | "neutral"; against: string };
  /** Segunda comparación, frente al año pasado. */
  year?: { text: string; tone: "good" | "bad" | "neutral"; against: string };
};
export type DeckList = {
  title: string;
  head: string[];
  rows: string[][];
};
export type DeckSlide = {
  id: string;
  title: string;
  source: string;
  note: string;
  metrics: DeckMetric[];
  lists: DeckList[];
  /** Serie diaria/semanal de clics para la mini gráfica del resumen. */
  series?: Array<{
    label: string;
    current: number | null;
    previous: number | null;
  }>;
};

const nf = (value: number | null, digits = 0) =>
  value === null
    ? "—"
    : new Intl.NumberFormat("es-ES", {
        maximumFractionDigits: digits,
        useGrouping: "always" as unknown as boolean,
      }).format(value);
const pct = (value: number | null, digits = 1) =>
  value === null ? "—" : `${nf(value, digits)} %`;
const change = (value: number | null, base: number | null) =>
  value === null || base === null || base === 0
    ? null
    : ((value - base) / Math.abs(base)) * 100;
const signed = (value: number, digits = 1, unit = " %") =>
  `${value > 0 ? "+" : value < 0 ? "−" : ""}${nf(Math.abs(value), digits)}${unit}`;

function delta(
  value: number | null,
  base: number | null,
  against: string,
  kind: "percent" | "points" | "position" = "percent",
): DeckMetric["change"] {
  if (value === null || base === null) return undefined;
  const diff = kind === "percent" ? change(value, base) : value - base;
  if (diff === null) return undefined;
  const good = kind === "position" ? diff <= 0 : diff >= 0;
  return {
    text: signed(
      diff,
      1,
      kind === "percent" ? " %" : kind === "points" ? " pp" : "",
    ),
    tone: diff === 0 ? "neutral" : good ? "good" : "bad",
    against,
  };
}
/** Para sujetos en plural: «suben un 12 %», «bajan un 3 %» o «se mantienen». */
const verb = (diff: number | null) =>
  diff === null
    ? "no tienen comparación disponible"
    : Math.abs(diff) < 0.5
      ? "se mantienen"
      : `${diff > 0 ? "suben" : "bajan"} un ${nf(Math.abs(diff), 1)} %`;

export type ProjectReportInput = {
  report: BrandReport;
  pieces: EditorialPlanRow[];
  audit: SiteAuditSummary | null;
  /** Nombre de la raíz del dominio en el reparto por carpeta. */
  rootLabel?: string;
  /** Día de referencia para «próximas publicaciones» (YYYY-MM-DD). */
  today: string;
};

export function buildProjectReport({
  report,
  pieces,
  audit,
  rootLabel,
  today,
}: ProjectReportInput): DeckSlide[] {
  const w = report.window;
  const prev = w.previousLabel;
  const year = w.previousYearLabel;
  const kpi = (key: BrandReport["kpis"][number]["key"]) =>
    report.kpis.find((item) => item.key === key);
  const ga4 = report.sources.some(
    (source) => source.source === "ga4" && source.ok,
  );
  const slides: DeckSlide[] = [];

  // 1. Resumen
  const sessions = kpi("search_sessions");
  const clicks = kpi("clicks");
  const impressions = kpi("impressions");
  const leads = kpi("search_leads");
  const metricOf = (
    item: ReturnType<typeof kpi>,
    label: string,
  ): DeckMetric => ({
    label,
    value: item?.unit === "percent" ? pct(item.value) : nf(item?.value ?? null),
    change: delta(item?.value ?? null, item?.previous ?? null, prev),
    year: delta(item?.value ?? null, item?.previousYear ?? null, year),
  });
  const sessionsChange = change(
    sessions?.value ?? null,
    sessions?.previous ?? null,
  );
  const sessionsYear = change(
    sessions?.value ?? null,
    sessions?.previousYear ?? null,
  );
  const clicksChange = change(clicks?.value ?? null, clicks?.previous ?? null);
  slides.push({
    id: "resumen",
    title: "Resumen del periodo",
    source: ga4 ? "GA4 y Search Console" : "Search Console",
    note: ga4
      ? `Las visitas desde buscadores ${verb(sessionsChange)} frente al ${prev} y ${verb(sessionsYear)} frente al ${year}. Los clics en Google ${verb(clicksChange)}.`
      : `Los clics en Google ${verb(clicksChange)} frente al ${prev}. GA4 no ha respondido: faltan visitas y conversiones.`,
    metrics: [
      ...(ga4 ? [metricOf(sessions, "Visitas SEO")] : []),
      metricOf(clicks, "Clics en Google"),
      metricOf(impressions, "Impresiones"),
      ...(ga4 ? [metricOf(leads, "Conversiones SEO")] : []),
    ],
    lists: [],
    series: report.clickSeries.map((point) => ({
      label: point.label,
      current: point.current,
      previous: point.previous,
    })),
  });

  // 2. Keywords
  const ranking = report.keywordRanking?.segments.all ?? null;
  const totals = report.searchTotals;
  const brandClicks = totals?.brand.clicks.value ?? null;
  const nonBrandClicks = totals?.nonBrand.clicks.value ?? null;
  const known =
    brandClicks !== null && nonBrandClicks !== null
      ? brandClicks + nonBrandClicks
      : 0;
  const nonBrandShare = known ? ((nonBrandClicks ?? 0) / known) * 100 : null;
  const byQuery = new Map<
    string,
    { clicks: number; impressions: number; weighted: number }
  >();
  for (const row of report.searchQueries) {
    const entry = byQuery.get(row.query) ?? {
      clicks: 0,
      impressions: 0,
      weighted: 0,
    };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weighted += row.position * row.impressions;
    byQuery.set(row.query, entry);
  }
  const topQueries = [...byQuery]
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 6)
    .map(([query, entry]) => [
      query,
      nf(entry.clicks),
      nf(entry.impressions ? entry.weighted / entry.impressions : null, 1),
    ]);
  slides.push({
    id: "keywords",
    title: "Keywords",
    source: "Search Console",
    note: ranking
      ? `La web aparece en ${nf(ranking.total)} búsquedas; ${nf(ranking.top3)} en el top 3. ${nonBrandShare === null ? "" : `El ${pct(nonBrandShare)} de los clics con búsqueda visible llega por búsquedas sin marca, que es donde se gana tráfico nuevo.`}`.trim()
      : "Sin ranking de keywords disponible para este periodo.",
    metrics: [
      {
        label: "Keywords con impresiones",
        value: `${nf(ranking?.total ?? null)}${report.keywordRanking?.limitReached ? "+" : ""}`,
        change: delta(
          ranking?.total ?? null,
          ranking?.previousTotal ?? null,
          prev,
        ),
      },
      {
        label: "En top 3",
        value: nf(ranking?.top3 ?? null),
        change: delta(
          ranking?.top3 ?? null,
          ranking?.previousTop3 ?? null,
          prev,
        ),
      },
      {
        label: "CTR",
        value: pct(totals?.all.ctr.value ?? null),
        change: delta(
          totals?.all.ctr.value ?? null,
          totals?.all.ctr.previous ?? null,
          prev,
          "points",
        ),
      },
      {
        label: "Posición media",
        value: nf(totals?.all.position.value ?? null, 1),
        change: delta(
          totals?.all.position.value ?? null,
          totals?.all.position.previous ?? null,
          prev,
          "position",
        ),
      },
    ],
    lists: topQueries.length
      ? [
          {
            title: "Búsquedas sin marca con más clics",
            head: ["Keyword", "Clics", "Posición"],
            rows: topQueries,
          },
        ]
      : [],
  });

  // 3. Páginas
  const pages = analysePages(report, rootLabel);
  if (pages.available) {
    slides.push({
      id: "paginas",
      title: "Páginas",
      source: "Search Console",
      note: `${nf(pages.visible)} URLs aparecen en Google y ${nf(pages.withClicks)} reciben clics; las 10 primeras concentran el ${pct(pages.top10Share)} de los clics.${pages.variantGroups ? ` ${nf(pages.variantGroups)} rutas se muestran en varias URLs y se reparten ${nf(pages.variantClicks)} clics.` : ""}`,
      metrics: [
        {
          label: "Páginas en Google",
          value: nf(pages.visible),
          change: delta(pages.visible, pages.previousVisible, prev),
        },
        { label: "Páginas con clics", value: nf(pages.withClicks) },
        {
          label: "Ganan / pierden clics",
          value: `${nf(pages.gaining)} / ${nf(pages.losing)}`,
        },
        { label: "URLs duplicadas", value: nf(pages.variantGroups) },
      ],
      lists: [
        {
          title: "Por tipo de página",
          head: ["Tipo", "Páginas", "Clics", "Cuota"],
          rows: pages.kinds
            .slice(0, 5)
            .map((item) => [
              item.label,
              nf(item.pages),
              nf(item.clicks),
              pct(item.share),
            ]),
        },
        {
          title: "Por carpeta de idioma",
          head: ["Carpeta", "Páginas", "Clics", "Cuota"],
          rows: pages.locales
            .slice(0, 5)
            .map((item) => [
              item.label,
              nf(item.pages),
              nf(item.clicks),
              pct(item.share),
            ]),
        },
      ],
    });
  }

  // 4. Mercados
  if (ga4 && report.markets.length) {
    const markets = [...report.markets].sort((a, b) => b.sessions - a.sessions);
    const total = markets.reduce((sum, item) => sum + item.sessions, 0);
    const moves = markets
      .filter((item) => item.previous >= 50)
      .map((item) => ({
        name: item.name,
        diff: change(item.sessions, item.previous)!,
      }));
    const best = [...moves].sort((a, b) => b.diff - a.diff)[0];
    const worst = [...moves].sort((a, b) => a.diff - b.diff)[0];
    slides.push({
      id: "mercados",
      title: "Mercados",
      source: "GA4 y Search Console",
      note: `${markets[0]!.name} aporta el ${pct(total ? (markets[0]!.sessions / total) * 100 : null)} de las visitas SEO.${best && best.diff > 0 ? ` Mayor subida: ${best.name} (${signed(best.diff)}).` : ""}${worst && worst.diff < 0 ? ` Mayor caída: ${worst.name} (${signed(worst.diff)}).` : ""}`,
      metrics: [],
      lists: [
        {
          title: "Visitas SEO por mercado",
          head: [
            "Mercado",
            "Visitas SEO",
            `vs. ${prev}`,
            "Clics Google",
            "Conversiones",
          ],
          rows: markets.slice(0, 8).map((item) => {
            const diff = change(item.sessions, item.previous);
            return [
              item.name,
              nf(item.sessions),
              diff === null ? "—" : signed(diff),
              nf(item.clicks),
              nf(item.leads),
            ];
          }),
        },
      ],
    });
  }

  // 5. Migración
  const migration = report.migration;
  if (migration) {
    const siteChange = change(
      migration.siteClicksAfter,
      migration.siteClicksBefore,
    );
    slides.push({
      id: "migracion",
      title: "Migración",
      source: "Search Console",
      note: `${migration.label}: con ventanas iguales antes y después, los clics del sitio ${verb(siteChange)}. ${nf(migration.lostUrls)} URLs antiguas pierden más del 80 % de sus clics: ${nf(migration.lostClicks)} clics menos.`,
      metrics: [
        { label: "Clics antes", value: nf(migration.siteClicksBefore) },
        {
          label: "Clics después",
          value: nf(migration.siteClicksAfter),
          change: delta(
            migration.siteClicksAfter,
            migration.siteClicksBefore,
            "antes",
          ),
        },
        { label: "URLs antiguas que pierden", value: nf(migration.lostUrls) },
        { label: "Clics perdidos", value: nf(migration.lostClicks) },
      ],
      lists: [],
    });
  }

  // 6. Plan editorial
  if (pieces.length) {
    const count = (keys: string[]) =>
      pieces.filter((piece) => keys.includes(piece.statusKey)).length;
    const published = count(["publicado"]);
    const doing = count(["aceptado", "redactando", "revision", "programado"]);
    const pending = count(["backlog", "desconocido"]);
    const next = pieces
      .filter(
        (piece) =>
          piece.publicationDate &&
          piece.publicationDate >= today &&
          piece.statusKey !== "publicado" &&
          piece.statusKey !== "descartado",
      )
      .sort((a, b) => a.publicationDate!.localeCompare(b.publicationDate!))
      .slice(0, 6);
    slides.push({
      id: "editorial",
      title: "Plan editorial",
      source: "Plan editorial del equipo",
      note: `${nf(pieces.length)} piezas en el plan: ${nf(published)} publicadas, ${nf(doing)} en marcha y ${nf(pending)} por empezar.${next.length ? ` Próxima publicación: ${next[0]!.publicationDate!.split("-").reverse().join("/")}.` : ""}`,
      metrics: [
        { label: "Piezas en el plan", value: nf(pieces.length) },
        { label: "Publicadas", value: nf(published) },
        { label: "En marcha", value: nf(doing) },
        { label: "Por empezar", value: nf(pending) },
      ],
      lists: next.length
        ? [
            {
              title: "Próximas publicaciones",
              head: ["Fecha", "Pieza", "Keyword", "Estado"],
              rows: next.map((piece) => [
                piece.publicationDate!.split("-").reverse().join("/"),
                piece.title ?? "Sin título",
                piece.keyword ?? "—",
                piece.status,
              ]),
            },
          ]
        : [],
    });
  }

  // 7. Estado del sitio
  if (audit) {
    const t = audit.totals;
    const severe = audit.issues
      .filter(
        (issue) =>
          issue.affected > 0 &&
          (issue.severity === "critica" || issue.severity === "alta"),
      )
      .sort((a, b) => b.affected - a.affected)
      .slice(0, 5);
    const crawled = new Date(audit.completedAt).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Madrid",
    });
    slides.push({
      id: "estado",
      title: "Estado del sitio",
      source: `Crawl del ${crawled}`,
      note: `Rastreo de ${nf(t.crawled)} URLs principales: ${nf(t.indexable)} indexables, ${nf(t.clientErrors + t.serverErrors)} con error y ${nf(t.pagesWithSevere)} con alguna incidencia grave. Es una muestra, no el sitio entero.`,
      metrics: [
        { label: "URLs rastreadas", value: nf(t.crawled) },
        { label: "Indexables", value: nf(t.indexable) },
        {
          label: "Con error 4xx/5xx",
          value: nf(t.clientErrors + t.serverErrors),
        },
        { label: "Con incidencia grave", value: nf(t.pagesWithSevere) },
      ],
      lists: severe.length
        ? [
            {
              title: "Incidencias graves más extendidas",
              head: ["Incidencia", "URLs"],
              rows: severe.map((issue) => [issue.label, nf(issue.affected)]),
            },
          ]
        : [],
    });
  }

  return slides;
}
