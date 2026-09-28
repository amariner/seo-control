import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { analysePages } from "./page-analysis";

/**
 * Informe del proyecto (D-073, D-074): recopilación simplificada de las
 * pestañas del proyecto, una diapositiva por apartado con sus cifras clave, una
 * aclaración (qué dicen las cifras) y una lectura SEO (qué significa y qué
 * hacer). Las dos se redactan con reglas a partir de las cifras, nunca con IA:
 * cada frase tiene detrás un umbral explícito de este fichero. La misma
 * estructura sirve al modo presentación y al PDF.
 */

export type DeckTone = "good" | "bad" | "neutral";
export type DeckMetric = {
  label: string;
  value: string;
  /** Variación ya formateada frente al periodo anterior y su sentido. */
  change?: { text: string; tone: DeckTone; against: string };
  /** Segunda comparación, frente al año pasado. */
  year?: { text: string; tone: DeckTone; against: string };
};
export type DeckList = {
  title: string;
  head: string[];
  rows: string[][];
  /** Texto cuando no hay filas: una tabla vacía también informa. */
  empty?: string;
  /** Tono por fila (p. ej. prioridad de una tarea), aplicado a `toneColumn`. */
  tones?: DeckTone[];
  /** Columna que toma el tono; por defecto, la última. */
  toneColumn?: number;
};
/** Barras mes a mes: el periodo frente al mismo mes del año anterior. */
export type DeckBars = {
  title: string;
  metric: string;
  months: Array<{
    label: string;
    value: number | null;
    previousYear: number | null;
    inPeriod: boolean;
  }>;
};
export type DeckSlide = {
  id: string;
  title: string;
  source: string;
  /** Qué dicen las cifras. */
  note: string;
  /** Lectura SEO: qué significa y qué hacer, en una o dos frases. */
  reading?: string;
  metrics: DeckMetric[];
  lists: DeckList[];
  /** Serie diaria/semanal de clics para la mini gráfica del resumen. */
  series?: Array<{
    label: string;
    current: number | null;
    previous: number | null;
  }>;
  bars?: DeckBars;
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
const dmy = (value: string) => value.split("-").reverse().join("/");
const pathOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url, "https://x").pathname);
  } catch {
    return url;
  }
};

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
/** Une las frases de una lectura y se queda con las dos primeras: breve por diseño. */
const reading = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).slice(0, 2).join(" ") || undefined;

/** Variación de un «mover» (keyword o URL) para las tablas de tendencia. */
const moverRow = (
  name: string,
  item: { before: number; now: number; change: number | null },
) => [
  name,
  `${nf(item.before)} → ${nf(item.now)}`,
  item.change === null ? "Nueva" : signed(item.change, 0),
];

/** Tarea concreta por incidencia del crawl: el verbo es lo que hay que hacer. */
const TASKS: Record<string, string> = {
  http_4xx: "Redirigir con 301 o recuperar las URL que dan error 4xx",
  http_5xx: "Revisar con sistemas los errores de servidor",
  redirect_internal:
    "Apuntar los enlaces internos al destino final, sin redirección",
  noindex: "Confirmar si el noindex es intencionado; si no, quitarlo",
  canonical_other:
    "Revisar que el canonical apunte a la versión que debe posicionar",
  canonical_missing: "Añadir canonical autorreferente",
  sitemap_non_indexable: "Sacar del sitemap las URL no indexables",
  not_in_sitemap: "Incluir en el sitemap las páginas indexables que faltan",
  title_missing: "Escribir el title de las páginas que no lo tienen",
  title_duplicate: "Diferenciar los titles duplicados",
  title_too_long: "Acortar titles a menos de 60 caracteres",
  title_too_short: "Completar titles demasiado cortos con la keyword",
  description_missing: "Redactar meta descriptions que vendan el clic",
  description_duplicate: "Diferenciar las meta descriptions duplicadas",
  description_too_long: "Acortar descriptions a menos de 160 caracteres",
  description_too_short: "Ampliar descriptions demasiado cortas",
  h1_missing: "Añadir un H1 con el tema de la página",
  h1_multiple: "Dejar un único H1 por página",
  thin_content: "Ampliar el contenido de las páginas con poco texto",
  img_missing_alt: "Añadir texto alternativo a las imágenes",
  broken_links: "Corregir los enlaces internos que apuntan a errores",
  links_to_redirects: "Actualizar enlaces internos que pasan por redirecciones",
  lang_missing: "Declarar el idioma con el atributo lang",
  hreflang_missing: "Enlazar las versiones de idioma con hreflang",
  hreflang_no_xdefault: "Añadir hreflang x-default",
  hreflang_no_self: "Incluir la propia URL en el grupo hreflang",
  slow_response: "Comprobar el tiempo de respuesta del servidor (medido en local, orientativo)",
  html_heavy: "Aligerar el HTML de las páginas más pesadas",
};
const SEVERITY_ORDER = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
const SEVERITY_LABEL = {
  critica: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
} as const;

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
  const ctr = kpi("ctr");
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
  const impressionsChange = change(
    impressions?.value ?? null,
    impressions?.previous ?? null,
  );
  const leadsChange = change(leads?.value ?? null, leads?.previous ?? null);
  const leadsYear = change(leads?.value ?? null, leads?.previousYear ?? null);
  const ctrDiff =
    ctr?.value !== null && ctr?.value !== undefined && ctr.previous !== null
      ? ctr.value - ctr.previous
      : null;
  const migrationRecent =
    report.migration && report.migration.date >= w.previousStart;
  const barsMetric = ga4 ? "Visitas SEO" : "Clics en Google";
  slides.push({
    id: "resumen",
    title: "Resumen del periodo",
    source: ga4 ? "GA4 y Search Console" : "Search Console",
    note: ga4
      ? `Las visitas desde buscadores ${verb(sessionsChange)} frente al ${prev} y ${verb(sessionsYear)} frente al ${year}. Los clics en Google ${verb(clicksChange)}.`
      : `Los clics en Google ${verb(clicksChange)} frente al ${prev}. GA4 no ha respondido: faltan visitas y conversiones.`,
    reading: reading(
      clicksChange !== null && clicksChange <= -10 && impressionsChange !== null
        ? impressionsChange <= -10
          ? `La caída es de visibilidad, no de atractivo: Google nos enseña menos${migrationRecent ? ", en línea con la migración" : ""}. Prioridad: indexación y posiciones de las URL principales.`
          : ctrDiff !== null && ctrDiff < 0
            ? "Aparecemos lo mismo pero nos eligen menos: revisar titles y descriptions de las páginas con más impresiones y el efecto de AI Overviews."
            : "Los clics caen sin perder visibilidad: revisar posiciones de las keywords de más tráfico."
        : clicksChange !== null && clicksChange >= 5
          ? "Crecimiento orgánico sano: consolidar las páginas que lo sostienen antes de abrir frentes nuevos."
          : "Tráfico estable: el margen está en ganar posiciones en keywords sin marca.",
      ga4 && sessionsChange !== null && leadsChange !== null
        ? sessionsChange > 0 && leadsChange < -10
          ? "Llega más tráfico pero convierte menos: comprobar el evento de conversión y las landings de entrada."
          : sessionsChange < 0 && leadsChange > 10
            ? "Menos visitas y más conversiones: el tráfico perdido era poco cualificado."
            : leadsYear !== null &&
                sessionsYear !== null &&
                sessionsYear > 0 &&
                leadsYear < -20
              ? `Frente al ${year}, más visitas y bastantes menos conversiones: revisar la medición antes de sacar conclusiones.`
              : null
        : null,
    ),
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
    bars: report.months.length
      ? {
          title: `${barsMetric} mes a mes`,
          metric: barsMetric,
          months: report.months.map((month) => {
            const [y, m] = month.month.split("-").map(Number) as [
              number,
              number,
            ];
            const monthEnd = new Date(Date.UTC(y, m, 0))
              .toISOString()
              .slice(0, 10);
            return {
              label: month.label,
              value: ga4 ? month.searchSessions : month.clicks,
              previousYear: ga4
                ? month.searchSessionsPreviousYear
                : month.clicksPreviousYear,
              inPeriod: monthEnd >= w.start && `${month.month}-01` <= w.end,
            };
          }),
        }
      : undefined,
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
  const keywordsChange = change(
    ranking?.total ?? null,
    ranking?.previousTotal ?? null,
  );
  const positionDiff =
    totals?.all.position.value != null && totals.all.position.previous != null
      ? totals.all.position.value - totals.all.position.previous
      : null;
  const up = report.keywordsUp.slice(0, 5);
  const down = report.keywordsDown.slice(0, 5);
  slides.push({
    id: "keywords",
    title: "Keywords",
    source: "Search Console",
    note: ranking
      ? `La web aparece en ${nf(ranking.total)} búsquedas; ${nf(ranking.top3)} en el top 3. ${nonBrandShare === null ? "" : `El ${pct(nonBrandShare)} de los clics con búsqueda visible llega por búsquedas sin marca.`}`.trim()
      : "Sin ranking de keywords disponible para este periodo.",
    reading: reading(
      keywordsChange !== null && keywordsChange <= -20
        ? "Perdemos presencia en muchas búsquedas: típico de URLs desindexadas o redirecciones incompletas; revisar primero las URL antiguas con tráfico."
        : positionDiff !== null && positionDiff >= 0.5
          ? "La posición media empeora: reforzar enlazado interno y contenido de las páginas que caen."
          : keywordsChange !== null && keywordsChange >= 10
            ? "Ganamos cobertura de búsquedas: buen momento para empujar las que están en posiciones 4–10."
            : null,
      nonBrandShare !== null && nonBrandShare < 30
        ? "Dependemos de la marca: el crecimiento pasa por contenidos para búsquedas genéricas de producto y uso."
        : nonBrandShare !== null
          ? "Buena base sin marca: priorizar las keywords en tendencia con contenido y enlazado."
          : null,
    ),
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
    lists: [
      {
        title: "En tendencia",
        head: ["Keyword sin marca", "Clics", "Variación"],
        rows: up.map((item) => moverRow(item.query, item)),
        tones: up.map(() => "good"),
        empty: "Sin keywords que ganen clics frente al periodo anterior.",
      },
      {
        title: "En bajada",
        head: ["Keyword sin marca", "Clics", "Variación"],
        rows: down.map((item) => moverRow(item.query, item)),
        tones: down.map(() => "bad"),
        empty: "Sin keywords que pierdan clics frente al periodo anterior.",
      },
    ],
  });

  // 3. Páginas
  const pages = analysePages(report, rootLabel);
  if (pages.available) {
    const pagesUp = report.contentUp.slice(0, 5);
    const pagesDown = report.contentDown.slice(0, 5);
    slides.push({
      id: "paginas",
      title: "Páginas",
      source: "Search Console",
      note: `${nf(pages.visible)} URLs aparecen en Google y ${nf(pages.withClicks)} reciben clics; las 10 primeras concentran el ${pct(pages.top10Share)} de los clics.`,
      reading: reading(
        pages.losing > pages.gaining * 2 && pages.losing >= 20
          ? `Pierden clics ${nf(pages.losing)} URLs y ganan ${nf(pages.gaining)}: patrón de cambio de URLs sin redirecciones completas o de contenido que envejece.`
          : pages.gaining > pages.losing
            ? "Ganan clics más URLs de las que pierden: el sitio gana tracción de forma repartida."
            : null,
        pages.variantGroups >= 10
          ? `${nf(pages.variantGroups)} rutas se indexan en varias URLs: unificar con 301 y canonical es la victoria rápida.`
          : pages.top10Share !== null && pages.top10Share > 50
            ? "Mucha dependencia de pocas URLs: proteger su posición y repartir tráfico hacia categorías."
            : null,
      ),
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
          title: "En tendencia",
          head: ["URL", "Clics", "Variación"],
          rows: pagesUp.map((item) => moverRow(pathOf(item.page), item)),
          tones: pagesUp.map(() => "good"),
          empty: "Sin URLs que ganen clics frente al periodo anterior.",
        },
        {
          title: "En bajada",
          head: ["URL", "Clics", "Variación"],
          rows: pagesDown.map((item) => moverRow(pathOf(item.page), item)),
          tones: pagesDown.map(() => "bad"),
          empty: "Sin URLs que pierdan clics frente al periodo anterior.",
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
        sessions: item.sessions,
      }));
    const best = [...moves].sort((a, b) => b.diff - a.diff)[0];
    const worst = [...moves].sort((a, b) => a.diff - b.diff)[0];
    const topShare = total ? (markets[0]!.sessions / total) * 100 : null;
    slides.push({
      id: "mercados",
      title: "Mercados",
      source: "GA4 y Search Console",
      note: `${markets[0]!.name} aporta el ${pct(topShare)} de las visitas SEO.${best && best.diff > 0 ? ` Mayor subida: ${best.name} (${signed(best.diff)}).` : ""}${worst && worst.diff < 0 ? ` Mayor caída: ${worst.name} (${signed(worst.diff)}).` : ""}`,
      reading: reading(
        worst && worst.diff <= -50
          ? `La caída de ${worst.name} es demasiado brusca para ser demanda: revisar su carpeta de idioma, hreflang y redirecciones.`
          : null,
        topShare !== null && topShare > 50
          ? `Más de la mitad del tráfico depende de ${markets[0]!.name}: los mercados internacionales son la palanca de crecimiento.`
          : "Tráfico repartido entre mercados: priorizar los que suman el 80 % de las visitas.",
      ),
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
      reading: reading(
        migration.lostUrls > 0
          ? "Las URL antiguas que no recuperan su tráfico en el destino señalan redirecciones que faltan o que apuntan a páginas no equivalentes: revisar primero las de más clics."
          : "La migración no deja URL antiguas con pérdidas graves: seguir vigilando las posiciones de los destinos.",
      ),
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

  // 6. Plan editorial: lo publicado en el periodo y lo que viene.
  if (pieces.length) {
    const inPeriod = (date: string | null) =>
      Boolean(date && date >= w.start && date <= w.end);
    const published = pieces
      .filter(
        (piece) =>
          piece.statusKey === "publicado" && inPeriod(piece.publicationDate),
      )
      .sort((a, b) => a.publicationDate!.localeCompare(b.publicationDate!));
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
    const doing = pieces.filter((piece) =>
      ["aceptado", "redactando", "revision", "programado"].includes(
        piece.statusKey,
      ),
    ).length;
    const pending = pieces.filter((piece) =>
      ["backlog", "desconocido"].includes(piece.statusKey),
    ).length;
    const measured = new Map(report.editorial.map((item) => [item.id, item]));
    slides.push({
      id: "editorial",
      title: "Plan editorial",
      source: "Plan editorial del equipo",
      note: `${nf(published.length)} ${published.length === 1 ? "pieza publicada" : "piezas publicadas"} en el periodo y ${nf(next.length)} con fecha de publicación próxima. En total, ${nf(doing)} en marcha y ${nf(pending)} por empezar.`,
      reading: reading(
        published.length === 0
          ? "Sin publicaciones en el periodo, el plan no genera tráfico nuevo: fijar una cadencia mínima mensual."
          : "Las piezas publicadas necesitan entre 4 y 12 semanas para posicionar: medir su keyword objetivo el próximo periodo.",
        next.length === 0 && pending > 0
          ? "Hay piezas por empezar sin fecha: asignarles mes para que entren en el calendario."
          : null,
      ),
      metrics: [
        { label: "Publicadas en el periodo", value: nf(published.length) },
        { label: "Próximas con fecha", value: nf(next.length) },
        { label: "En marcha", value: nf(doing) },
        { label: "Por empezar", value: nf(pending) },
      ],
      lists: [
        {
          title: "Publicado en el periodo",
          head: ["Fecha", "Pieza", "Keyword", "Clics"],
          rows: published.slice(0, 6).map((piece) => {
            const found = measured.get(piece.id);
            return [
              dmy(piece.publicationDate!),
              piece.title ?? "Sin título",
              piece.keyword ?? "—",
              found?.measured ? nf(found.clicks) : "—",
            ];
          }),
          empty: "Ninguna pieza publicada en el periodo.",
        },
        {
          title: "Próximas publicaciones",
          head: ["Fecha", "Pieza", "Estado"],
          rows: next.map((piece) => [
            dmy(piece.publicationDate!),
            piece.title ?? "Sin título",
            piece.status,
          ]),
          empty: "Ninguna pieza con fecha de publicación próxima.",
        },
      ],
    });
  }

  // 7. Estado del sitio: tareas a realizar, por prioridad.
  if (audit) {
    const t = audit.totals;
    const tasks = audit.issues
      .filter((issue) => issue.affected > 0)
      .sort(
        (a, b) =>
          SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
          b.affected - a.affected,
      )
      .slice(0, 7);
    const crawled = new Date(audit.completedAt).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Europe/Madrid",
    });
    const urgent = tasks.filter(
      (task) => task.severity === "critica" || task.severity === "alta",
    );
    slides.push({
      id: "estado",
      title: "Estado del sitio",
      source: `Crawl del ${crawled}`,
      note: `Rastreo de ${nf(t.crawled)} URLs principales: ${nf(t.indexable)} indexables, ${nf(t.clientErrors + t.serverErrors)} con error y ${nf(t.pagesWithSevere)} con alguna incidencia grave. Es una muestra, no el sitio entero.`,
      reading: reading(
        urgent.length
          ? "Primero lo que impide rastrear o indexar (errores y noindex), después el enlazado interno: son los arreglos con más retorno por hora de trabajo."
          : "Sin bloqueos graves de rastreo: el margen está en la calidad on-page (titles, descriptions, contenido).",
      ),
      metrics: [
        { label: "URLs rastreadas", value: nf(t.crawled) },
        { label: "Indexables", value: nf(t.indexable) },
        {
          label: "Con error 4xx/5xx",
          value: nf(t.clientErrors + t.serverErrors),
        },
        { label: "Tareas urgentes o altas", value: nf(urgent.length) },
      ],
      lists: [
        {
          title: "Tareas a realizar",
          head: ["Prioridad", "Tarea", "URLs", "Ejemplo"],
          rows: tasks.map((issue) => [
            SEVERITY_LABEL[issue.severity],
            TASKS[issue.id] ?? issue.label,
            nf(issue.affected),
            issue.sample[0] ?? "—",
          ]),
          tones: tasks.map((issue) =>
            issue.severity === "critica" || issue.severity === "alta"
              ? "bad"
              : "neutral",
          ),
          toneColumn: 0,
          empty: "Sin incidencias en el último crawl.",
        },
      ],
    });
  }

  return slides;
}
