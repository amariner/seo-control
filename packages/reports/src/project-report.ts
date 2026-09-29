import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import type { EditorialPlanRow } from "@seo/editorial-ui";
import { analysePages } from "./page-analysis";

/**
 * Informe del proyecto (D-073, D-074, D-075): recopilación simplificada de las
 * pestañas del proyecto, una diapositiva por apartado con sus cifras clave, una
 * aclaración (qué dicen las cifras) y una lectura SEO (qué significa y qué
 * hacer). Las dos se redactan con reglas a partir de las cifras, nunca con IA:
 * cada frase tiene detrás un umbral explícito de este fichero. Abre con un
 * resumen ejecutivo (veredicto, idea clave por apartado, prioridades y avisos
 * de medición) y cierra con el plan de acción que proponen los apartados. La
 * misma estructura sirve al modo presentación y al PDF.
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
  /** Aclaración bajo la tabla: muestra, definición de una columna. */
  note?: string;
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
  /** Puntualización del equipo SEO escrita en el workbench (D-076). */
  comment?: string;
  /** Idea clave del apartado, para el resumen ejecutivo. */
  key?: { text: string; tone: DeckTone };
  /** Solo en el resumen ejecutivo: veredicto del periodo. */
  verdict?: { tone: "good" | "warn" | "bad"; headline: string; detail: string };
  /** Solo en el resumen ejecutivo: la idea clave de cada apartado. */
  points?: Array<{ label: string; text: string; tone: DeckTone }>;
  /** Avisos de medición que condicionan la lectura de las cifras. */
  warnings?: string[];
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
const shortDate = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
const dayMonth = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
/** «A», «A y B», «A, B y C»; «e» ante sonido /i/ («Portugal e Italia»). */
const listOf = (items: string[]) => {
  if (items.length <= 1) return items[0] ?? "";
  const last = items.at(-1)!;
  const and = /^h?[ií](?![aeoáéó])/i.test(last) ? "e" : "y";
  return `${items.slice(0, -1).join(", ")} ${and} ${last}`;
};
/** Tono de una variación para el resumen ejecutivo: por debajo del umbral es ruido. */
const toneOf = (diff: number | null, threshold = 5): DeckTone =>
  diff === null || Math.abs(diff) < threshold
    ? "neutral"
    : diff > 0
      ? "good"
      : "bad";
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
  item: {
    before: number;
    now: number;
    change: number | null;
    position: number | null;
    previousPosition: number | null;
  },
) => [
  name,
  `${nf(item.before)} → ${nf(item.now)}`,
  item.position === null
    ? "—"
    : item.previousPosition === null
      ? nf(item.position, 1)
      : `${nf(item.previousPosition, 1)} → ${nf(item.position, 1)}`,
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

/**
 * Plan de acción: cada apartado aporta sus acciones con prioridad y motivo (la
 * cifra que la justifica). Los próximos pasos del informe (`report.nextSteps`)
 * toman la prioridad de su área: técnica y medición condicionan todo lo demás.
 */
export type Priority = "urgente" | "alta" | "media" | "baja";
type Action = { priority: Priority; title: string; why: string; area: string };
const PRIORITY_ORDER: Record<Priority, number> = {
  urgente: 0,
  alta: 1,
  media: 2,
  baja: 3,
};
const PRIORITY_LABEL: Record<Priority, string> = {
  urgente: "Urgente",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};
const STEP_AREA = {
  tecnico: { label: "Técnico", priority: "alta" },
  medicion: { label: "Medición", priority: "alta" },
  contenido: { label: "Contenido", priority: "media" },
  editorial: { label: "Editorial", priority: "media" },
} as const satisfies Record<
  BrandReport["nextSteps"][number]["area"],
  { label: string; priority: Priority }
>;
const priorityTone = (priority: Priority): DeckTone =>
  priority === "urgente" || priority === "alta" ? "bad" : "neutral";

/** Diagnóstico de cada URL antigua de la migración, en palabras. */
const MIGRATION_VERDICT: Record<
  NonNullable<BrandReport["migration"]>["urls"][number]["verdict"],
  { label: string; tone: DeckTone }
> = {
  recupera: { label: "Recupera", tone: "good" },
  "recupera-parcial": { label: "Recupera en parte", tone: "neutral" },
  "no-recupera": { label: "No recupera", tone: "bad" },
  "sin-redireccion": { label: "Sin redirección", tone: "bad" },
  "destino-roto": { label: "Destino roto", tone: "bad" },
  cadena: { label: "Cadena de redirecciones", tone: "bad" },
  "sin-comprobar": { label: "Sin comprobar", tone: "neutral" },
};

export type ProjectReportInput = {
  report: BrandReport;
  pieces: EditorialPlanRow[];
  audit: SiteAuditSummary | null;
  /** Nombre de la raíz del dominio en el reparto por carpeta. */
  rootLabel?: string;
  /** Día de referencia para «próximas publicaciones» (YYYY-MM-DD). */
  today: string;
  /** Acciones que añade el equipo SEO desde el workbench (D-076); entran en el plan con su prioridad. */
  teamActions?: Array<{ priority: Priority; title: string; why: string }>;
};

export function buildProjectReport({
  report,
  pieces,
  audit,
  rootLabel,
  today,
  teamActions = [],
}: ProjectReportInput): DeckSlide[] {
  const w = report.window;
  const prev = w.previousLabel;
  const year = w.previousYearLabel;
  const kpi = (key: BrandReport["kpis"][number]["key"]) =>
    report.kpis.find((item) => item.key === key);
  const ga4 = report.sources.some(
    (source) => source.source === "ga4" && source.ok,
  );
  const warnings = report.dataQuality
    .filter((item) => item.tone === "warn")
    .map((item) => item.text);
  const slides: DeckSlide[] = [];
  const actions: Action[] = report.nextSteps.map((step) => ({
    priority: STEP_AREA[step.area].priority,
    title: step.title,
    why: step.why,
    area: STEP_AREA[step.area].label,
  }));
  // Las del equipo van primero dentro de su prioridad: son decisiones, no reglas.
  actions.unshift(
    ...teamActions.map((action) => ({
      ...action,
      why: action.why || "Decisión del equipo SEO",
      area: "Equipo SEO",
    })),
  );

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
  // La migración explica el periodo solo si ocurrió dentro de él o de su comparación.
  const migrationRecent = Boolean(
    report.migration &&
      report.migration.date >= w.previousStart &&
      report.migration.date <= w.end,
  );
  const barsMetric = ga4 ? "Visitas SEO" : "Clics en Google";
  slides.push({
    id: "resumen",
    title: "Tráfico orgánico",
    source: ga4 ? "GA4 y Search Console" : "Search Console",
    key: {
      text: ga4
        ? `Visitas SEO ${sessionsChange === null ? "sin comparación" : signed(sessionsChange)} y clics en Google ${clicksChange === null ? "sin comparación" : signed(clicksChange)} frente al ${prev}.`
        : `Clics en Google ${clicksChange === null ? "sin comparación" : signed(clicksChange)} frente al ${prev}.`,
      tone: toneOf(clicksChange ?? sessionsChange),
    },
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
      // Con avisos de medición, ninguna conclusión sobre conversiones: primero validar.
      ga4 && warnings.length
        ? "Hay avisos de medición en Analytics: validar visitas y conversiones antes de sacar conclusiones."
        : ga4 && sessionsChange !== null && leadsChange !== null
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
    key: ranking
      ? {
          text: `${nf(ranking.total)} keywords con impresiones (${keywordsChange === null ? "sin comparación" : signed(keywordsChange)}) y ${nf(ranking.top3)} en el top 3.`,
          tone: toneOf(keywordsChange),
        }
      : undefined,
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
        head: ["Keyword sin marca", "Clics", "Posición", "Variación"],
        rows: up.map((item) => moverRow(item.query, item)),
        tones: up.map(() => "good"),
        empty: "Sin keywords que ganen clics frente al periodo anterior.",
      },
      {
        title: "En bajada",
        head: ["Keyword sin marca", "Clics", "Posición", "Variación"],
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
    // URLs que no tenían clics antes: tras una migración, son los destinos nuevos.
    const newUrls = report.contentUp.filter((item) => item.change === null).length;
    const visibleChange = change(pages.visible, pages.previousVisible);
    if (pages.variantGroups >= 10)
      actions.push({
        priority: "media",
        title: "Unificar las rutas servidas en varias URLs con 301 y canonical",
        why: `${nf(pages.variantGroups)} rutas aparecen en Google con y sin barra final, mayúsculas o parámetros; ${nf(pages.variantClicks)} clics caen en variantes secundarias.`,
        area: "Técnico",
      });
    slides.push({
      id: "paginas",
      title: "Páginas",
      source: "Search Console",
      key: {
        text:
          pages.variantGroups >= 10
            ? `${nf(pages.visible)} URLs en Google (${visibleChange === null ? "sin comparación" : signed(visibleChange)}); ${nf(pages.variantGroups)} rutas se sirven en varias URLs.`
            : `${nf(pages.visible)} URLs en Google (${visibleChange === null ? "sin comparación" : signed(visibleChange)}) y ${nf(pages.withClicks)} con clics.`,
        tone: toneOf(visibleChange),
      },
      note: `${nf(pages.visible)} URLs aparecen en Google y ${nf(pages.withClicks)} reciben clics; las 10 primeras concentran el ${pct(pages.top10Share)} de los clics.`,
      reading: reading(
        // Contar URLs que ganan no basta: tras una migración ganan las nuevas
        // mientras el total cae, y leerlo como tracción sería engañoso.
        migrationRecent &&
          newUrls > 0 &&
          clicksChange !== null &&
          clicksChange < 0
          ? "Las URL nuevas de la migración ya captan clics, pero no compensan lo que pierden las antiguas: comprobar que cada antigua redirige a su equivalente."
          : pages.losing > pages.gaining * 2 && pages.losing >= 20
            ? `Pierden clics ${nf(pages.losing)} URLs y ganan ${nf(pages.gaining)}: patrón de cambio de URLs sin redirecciones completas o de contenido que envejece.`
            : pages.gaining > pages.losing
              ? clicksChange !== null && clicksChange <= -5
                ? `Ganan clics más URLs de las que pierden, pero las que pierden pesan más (clics ${signed(clicksChange)}): empezar por la tabla «En bajada».`
                : "Ganan clics más URLs de las que pierden: el sitio gana tracción de forma repartida."
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
          head: ["URL", "Clics", "Posición", "Variación"],
          rows: pagesUp.map((item) => moverRow(pathOf(item.page), item)),
          tones: pagesUp.map(() => "good"),
          empty: "Sin URLs que ganen clics frente al periodo anterior.",
        },
        {
          title: "En bajada",
          head: ["URL", "Clics", "Posición", "Variación"],
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
    // Caídas de más de la mitad: no es demanda, es la web (idioma, hreflang, redirecciones).
    const collapsed = moves
      .filter((item) => item.diff <= -50)
      .sort((a, b) => a.diff - b.diff)
      .map((item) => item.name);
    // Con un mercado filtrado, el reparto es contexto: no entra en el resumen ni en el plan.
    const allMarkets = report.market === "all";
    if (allMarkets && collapsed.length)
      actions.push({
        priority: "alta",
        title: `Revisar ${listOf(collapsed)}: carpeta de idioma, hreflang y redirecciones`,
        why: `${collapsed.length === 1 ? "Cae" : "Caen"} más de un 50 % en visitas SEO frente al ${prev}; una caída así no se explica por la demanda.`,
        area: "Mercados",
      });
    slides.push({
      id: "mercados",
      title: "Mercados",
      source: "GA4 y Search Console",
      key: !allMarkets
        ? undefined
        : collapsed.length
          ? {
              text: `${listOf(collapsed)} ${collapsed.length === 1 ? "cae" : "caen"} más de un 50 % en visitas SEO.`,
              tone: "bad",
            }
          : {
              text: `${markets[0]!.name} aporta el ${pct(topShare)} de las visitas SEO.`,
              tone: "neutral",
            },
      note: `${markets[0]!.name} aporta el ${pct(topShare)} de las visitas SEO.${best && best.diff > 0 ? ` Mayor subida: ${best.name} (${signed(best.diff)}).` : ""}${worst && worst.diff < 0 ? ` Mayor caída: ${worst.name} (${signed(worst.diff)}).` : ""}`,
      reading: reading(
        collapsed.length > 1
          ? `${listOf(collapsed)} caen más de un 50 % a la vez: patrón de carpetas de idioma afectadas (hreflang, redirecciones o indexación), no de demanda.`
          : collapsed.length === 1
            ? `La caída de ${collapsed[0]} es demasiado brusca para ser demanda: revisar su carpeta de idioma, hreflang y redirecciones.`
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
    const checked = migration.urls.length;
    const count = (...verdicts: string[]) =>
      migration.urls.filter((item) => verdicts.includes(item.verdict)).length;
    const broken = count("sin-redireccion", "destino-roto", "cadena");
    const weak = count("no-recupera", "recupera-parcial");
    const recovered = count("recupera");
    // Primero las que fallan, para que la tabla muestre lo que dice la lectura;
    // dentro de cada grupo, las que más clics tenían.
    const TONE_ORDER: Record<DeckTone, number> = { bad: 0, neutral: 1, good: 2 };
    const reviewed = [...migration.urls]
      .sort(
        (a, b) =>
          TONE_ORDER[MIGRATION_VERDICT[a.verdict].tone] -
            TONE_ORDER[MIGRATION_VERDICT[b.verdict].tone] ||
          b.clicksBefore - a.clicksBefore,
      )
      .slice(0, 6);
    slides.push({
      id: "migracion",
      title: "Migración",
      // El bloque tiene fechas propias y mide toda la web, como la pestaña.
      source: "Search Console · comparativa fija de toda la web, sin filtro de periodo ni mercado",
      // Posterior al periodo, la migración no es una clave de este informe.
      key:
        migration.date <= w.end
          ? {
              text: `${nf(migration.lostUrls)} URLs antiguas pierden más del 80 % de sus clics desde el cambio del ${shortDate(migration.date)}.`,
              tone: migration.lostUrls > 0 ? "bad" : "good",
            }
          : undefined,
      note: `Cambio de estructura del ${shortDate(migration.date)}. Con ventanas iguales antes (${dayMonth(migration.beforeStart)} – ${dayMonth(migration.beforeEnd)}) y después (${dayMonth(migration.afterStart)} – ${dayMonth(migration.afterEnd)}), los clics del sitio ${verb(siteChange)} y ${nf(migration.lostUrls)} URLs antiguas pierden más del 80 % de sus clics.`,
      reading: reading(
        broken
          ? `${nf(broken)} de las ${nf(checked)} URLs revisadas ${broken === 1 ? "no lleva" : "no llevan"} en un salto a una página que responda bien: corregir esas redirecciones es lo primero.`
          : weak
            ? `${nf(weak)} de las ${nf(checked)} URLs revisadas ${weak === 1 ? "no recupera" : "no recuperan"} su tráfico en el destino: revisar que el destino sea equivalente (contenido, title y enlaces internos).`
            : migration.lostUrls > 0
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
        ...(checked
          ? [
              {
                label: "Revisadas que recuperan",
                value: `${nf(recovered)} de ${nf(checked)}`,
              },
            ]
          : []),
      ],
      lists: checked
        ? [
            {
              title: "URLs antiguas revisadas: primero las que fallan",
              head: [
                "URL antigua",
                "Clics antes",
                "Destino",
                "Recuperación",
                "Diagnóstico",
              ],
              rows: reviewed.map((item) => [
                item.oldUrl,
                nf(item.clicksBefore),
                item.redirectsTo ?? "—",
                item.recovery === null ? "—" : pct(item.recovery * 100, 0),
                MIGRATION_VERDICT[item.verdict].label,
              ]),
              tones: reviewed.map(
                (item) => MIGRATION_VERDICT[item.verdict].tone,
              ),
              note: `Muestra de las ${nf(checked)} URLs antiguas que más clics pierden, comprobadas una a una. Recuperación = (clics de la antigua + su destino después) / clics de la antigua antes.`,
            },
          ]
        : [],
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
    if (published.length === 0 && doing + pending > 0)
      actions.push({
        priority: "media",
        title: "Fijar una cadencia mínima de publicación",
        why: `Ninguna pieza publicada en el periodo, con ${nf(doing)} en marcha y ${nf(pending)} por empezar.`,
        area: "Editorial",
      });
    if (next.length === 0 && pending > 0)
      actions.push({
        priority: "baja",
        title: "Dar fecha a las piezas por empezar",
        why: `${nf(pending)} ${pending === 1 ? "pieza sin fecha no entra" : "piezas sin fecha no entran"} en el calendario.`,
        area: "Editorial",
      });
    const first28 = (piece: EditorialPlanRow) => {
      const item = piece.measurements?.find((m) => m.windowDays === 28 && m.status === "medido");
      return item && item.result !== null && item.baseline !== null ? { result: item.result, baseline: item.baseline } : null;
    };
    const measuredUp = published.reduce(
      (acc, piece) => {
        const window = first28(piece);
        return window ? { total: acc.total + 1, up: acc.up + (window.result > window.baseline ? 1 : 0) } : acc;
      },
      { total: 0, up: 0 },
    );
    slides.push({
      id: "editorial",
      title: "Plan editorial",
      source: "Plan editorial del equipo",
      key: {
        text: `${nf(published.length)} ${published.length === 1 ? "pieza publicada" : "piezas publicadas"} en el periodo, ${nf(next.length)} con fecha próxima y ${nf(pending)} por empezar.`,
        tone: published.length ? "good" : "neutral",
      },
      note: `${nf(published.length)} ${published.length === 1 ? "pieza publicada" : "piezas publicadas"} en el periodo y ${nf(next.length)} con fecha de publicación próxima. En total, ${nf(doing)} en marcha y ${nf(pending)} por empezar.`,
      reading: reading(
        published.length === 0
          ? "Sin publicaciones en el periodo, el plan no genera tráfico nuevo: fijar una cadencia mínima mensual."
          : measuredUp.total === 1
            ? `La pieza medida ${measuredUp.up ? "gana" : "no gana"} clics en sus primeros 28 días frente a los 28 anteriores${measuredUp.up ? "." : ": revisar su title, el enlazado interno y la indexación."}`
            : measuredUp.total
            ? `${nf(measuredUp.up)} de ${nf(measuredUp.total)} piezas medidas ganan clics en sus primeros 28 días frente a los 28 anteriores${measuredUp.up < measuredUp.total ? ": revisar title, enlazado interno e indexación de las que no" : ""}.`
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
            // Con medición real (D-079), los clics de sus primeros 28 días frente a los 28 anteriores.
            const window = first28(piece);
            return [
              dmy(piece.publicationDate!),
              piece.title ?? "Sin título",
              piece.keyword ?? "—",
              window
                ? `${nf(window.result)} en 28 d (antes ${nf(window.baseline)})`
                : found?.measured
                  ? nf(found.clicks)
                  : "—",
            ];
          }),
          empty: "Ninguna pieza publicada en el periodo.",
          note: published.some((piece) => first28(piece))
            ? "Clics de Search Console de la URL (o la keyword) en los 28 días desde la publicación, frente a los 28 anteriores."
            : undefined,
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
    // En el plan, una sola fila para el crawl: el detalle por tarea ya está en
    // su apartado y no debe desplazar acciones de más alcance.
    const urls = (n: number) => `${nf(n)} ${n === 1 ? "URL" : "URLs"}`;
    if (urgent.length === 1)
      actions.push({
        priority: urgent[0]!.severity === "critica" ? "urgente" : "alta",
        title: TASKS[urgent[0]!.id] ?? urgent[0]!.label,
        why: `${urls(urgent[0]!.affected)} en el crawl del ${crawled}${urgent[0]!.sample[0] ? `, p. ej. ${urgent[0]!.sample[0]}` : ""}.`,
        area: "Técnico",
      });
    else if (urgent.length > 1)
      actions.push({
        priority: urgent.some((task) => task.severity === "critica")
          ? "urgente"
          : "alta",
        title: `Resolver las ${nf(urgent.length)} incidencias urgentes o altas del crawl`,
        why: `${listOf(urgent.map((task) => `${task.label} (${urls(task.affected)})`))} en el crawl del ${crawled}; tareas y ejemplos en «Estado del sitio».`,
        area: "Técnico",
      });
    slides.push({
      id: "estado",
      title: "Estado del sitio",
      source: `Crawl del ${crawled}`,
      key: {
        text: urgent.length
          ? `${nf(urgent.length)} ${urgent.length === 1 ? "tarea urgente o alta" : "tareas urgentes o altas"} en el crawl de ${nf(t.crawled)} URLs principales.`
          : `Sin incidencias graves en el crawl de ${nf(t.crawled)} URLs principales.`,
        tone: urgent.length ? "bad" : "good",
      },
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

  // 8. Plan de acción: lo que proponen todos los apartados, por prioridad.
  const plan = actions
    .map((action, index) => ({ action, index }))
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.action.priority] - PRIORITY_ORDER[b.action.priority] ||
        a.index - b.index,
    )
    .map(({ action }) => action)
    .slice(0, 8 + teamActions.length);
  if (plan.length)
    slides.push({
      id: "plan",
      title: "Plan de acción",
      source: "Reglas del informe sobre Search Console, GA4, el crawl y el plan editorial",
      note: `${nf(plan.length)} ${plan.length === 1 ? "acción" : "acciones"} ordenadas por prioridad: primero lo que impide rastrear, indexar o medir bien; después, lo que recupera o gana tráfico. Cada motivo remite a una cifra de este informe.`,
      metrics: [],
      lists: [
        {
          title: "Acciones",
          head: ["Prioridad", "Acción", "Motivo", "Área"],
          rows: plan.map((action) => [
            PRIORITY_LABEL[action.priority],
            action.title,
            action.why,
            action.area,
          ]),
          tones: plan.map((action) => priorityTone(action.priority)),
          toneColumn: 0,
        },
      ],
    });

  // 0. Resumen ejecutivo: veredicto, la idea clave de cada apartado y las tres
  // primeras acciones. Es la página que se lee si solo se lee una.
  slides.unshift({
    id: "ejecutivo",
    title: "Resumen ejecutivo",
    source: `${ga4 ? "GA4 y Search Console" : "Search Console"} · lectura automática con reglas, sin IA`,
    note: report.verdict.detail,
    verdict: report.verdict,
    points: slides
      .filter((slide) => slide.key)
      .map((slide) => ({ label: slide.title, ...slide.key! })),
    warnings,
    metrics: [],
    lists: plan.length
      ? [
          {
            title: "Prioridades",
            head: ["Prioridad", "Acción"],
            rows: plan
              .slice(0, 3)
              .map((action) => [PRIORITY_LABEL[action.priority], action.title]),
            tones: plan.slice(0, 3).map((action) => priorityTone(action.priority)),
            toneColumn: 0,
          },
        ]
      : [],
  });

  return slides;
}
