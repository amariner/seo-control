import { z } from "zod";
import { coverageSchema, marketCodeSchema, metricSchema, periodKeySchema } from "./schemas";
import { BRANDS, BRAND_SLUGS, MARKETS, type BrandSlug, type BrandSourceMap } from "./taxonomy";
import { aggregateMetric, findMetric, findSource, type MetricKey } from "./catalog";

/**
 * Contrato de la visión transversal del grupo (P2.2).
 *
 * Sustituye a `/` y `/conjunto` de la V1, clasificadas como `redesign` en
 * `docs/continuity/v1-migration-inventory.json`. Dos reglas lo gobiernan:
 *
 * 1. **Nada agregado sin sumandos.** Cada total, cuota, media y explicación se
 *    deriva de las filas por marca con `aggregatePortfolio`, que es pura. No hay
 *    un segundo origen de los agregados, así que no pueden discrepar de sus
 *    partes.
 * 2. **Ninguna marca sin analítica recibe cifras.** El piloto de V2 es
 *    Porcelanosa + Noken; las otras seis marcas llegan con `analytics: null` y un
 *    motivo escrito, no con un cero ni con un dato inventado. La cobertura
 *    declarada (`coverage`) dice siempre cuántas marcas del conjunto
 *    seleccionado sostienen realmente el número.
 *
 * Lo que no se traslada de la V1, por decisión de P2.1: el ranking absoluto
 * entre marcas (compara negocios de tamaño distinto sin normalizar) y el
 * contador aleatorio de usuarios en directo.
 */

export const brandSlugSchema = z.enum(BRAND_SLUGS);

export const brandSourceMapSchema = z.object({
  ga4: z.boolean(),
  gsc: z.boolean(),
  semrush: z.boolean(),
  siteAudit: z.boolean(),
});

/** Comparativa temporal activa: periodo anterior o mismo periodo del año anterior. */
export const portfolioComparisonSchema = z.enum(["previous", "previousYear"]);

/**
 * `piloto`: la marca tiene serie (sintética hasta P3, real después).
 * `pendiente-migracion`: la V1 sí la medía, V2 todavía no. Nunca lleva cifras.
 */
export const brandAnalyticsStateSchema = z.enum(["piloto", "pendiente-migracion"]);

export const portfolioMarketRowSchema = z.object({
  code: marketCodeSchema,
  name: z.string(),
  sessions: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  previousSessions: z.number(),
  previousYearSessions: z.number(),
  /** Media de visibilidad ponderada por sesiones de las marcas que aportan al mercado. */
  visibility: z.number(),
  /** Número de marcas seleccionadas con serie en este mercado. */
  contributingBrands: z.number().int().nonnegative(),
});

export const brandAnalyticsSchema = z.object({
  sessions: z.number(),
  clicks: z.number(),
  conversions: z.number(),
  previousSessions: z.number(),
  previousYearSessions: z.number(),
  previousClicks: z.number(),
  previousYearClicks: z.number(),
  previousConversions: z.number(),
  previousYearConversions: z.number(),
  targetSessions: z.number(),
  targetClicks: z.number(),
  targetConversions: z.number(),
  visibility: z.number(),
  attention: z.enum(["estable", "observar", "actuar"]),
  coverage: coverageSchema,
  markets: z.array(portfolioMarketRowSchema),
});

export const brandEditorialActivitySchema = z.object({
  calendarEvents: z.number().int().nonnegative(),
  backlogPieces: z.number().int().nonnegative(),
  planPieces: z.number().int().nonnegative(),
  slots: z.number().int().nonnegative(),
  published: z.number().int().nonnegative(),
  scheduled: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
});

export const portfolioBrandSchema = z.object({
  slug: brandSlugSchema,
  name: z.string(),
  code: z.string(),
  domain: z.string().nullable(),
  pilot: z.boolean(),
  wave: z.number().int().nonnegative(),
  analyticsState: brandAnalyticsStateSchema,
  /** Obligatorio cuando `analytics` es null: por qué no hay cifra y cuándo llega. */
  analyticsPendingReason: z.string().nullable(),
  analytics: brandAnalyticsSchema.nullable(),
  /** Comparación de cobertura de la migración: qué medía la V1 y qué mide V2. */
  sources: z.object({ v1: brandSourceMapSchema, v2: brandSourceMapSchema }),
  editorial: brandEditorialActivitySchema,
  /** Cuota sobre las sesiones del conjunto seleccionado. `null` sin analítica. */
  shareOfSessions: z.number().nullable(),
});

export const portfolioObjectiveSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: metricSchema.shape.unit,
  value: z.number(),
  target: z.number(),
  /** `value / target`. Se muestra la fórmula, no solo el resultado. */
  progress: z.number(),
  gap: z.number(),
  status: z.enum(["cumplido", "en-riesgo", "incumplido"]),
  coverage: coverageSchema,
});

export const portfolioNoteSchema = z.object({
  id: z.string(),
  kind: z.enum(["mercado", "marca", "objetivo", "cobertura"]),
  tone: z.enum(["resultado", "riesgo", "oportunidad", "calidad"]),
  headline: z.string(),
  detail: z.string(),
  /** Magnitud absoluta que ordena las notas. No se muestra: justifica el orden. */
  magnitude: z.number(),
  evidence: z.array(z.object({ label: z.string(), value: z.string(), href: z.string().nullable() })),
});

export const portfolioCoverageSchema = z.object({
  brandsSelected: z.number().int().nonnegative(),
  brandsWithAnalytics: z.number().int().nonnegative(),
  brandsPending: z.array(brandSlugSchema),
  ratio: z.number().min(0).max(1),
  label: z.string(),
});

export const portfolioPayloadSchema = z.object({
  generatedAt: z.string().datetime(),
  mode: z.enum(["synthetic", "live", "database"]),
  filters: z.object({
    brands: z.array(brandSlugSchema).min(1),
    market: z.union([marketCodeSchema, z.literal("all")]),
    period: periodKeySchema,
    compare: portfolioComparisonSchema,
  }),
  /** Agregado de las marcas seleccionadas. Cada KPI declara su cobertura. */
  totals: z.array(metricSchema),
  brands: z.array(portfolioBrandSchema),
  markets: z.array(portfolioMarketRowSchema),
  objectives: z.array(portfolioObjectiveSchema),
  narrative: z.array(portfolioNoteSchema).max(5),
  coverage: portfolioCoverageSchema,
  /** Año del plan editorial cuyas cifras se cruzan. El plan no usa el periodo analítico. */
  editorialPlanningYear: z.number().int(),
});

export type BrandAnalytics = z.infer<typeof brandAnalyticsSchema>;
export type BrandEditorialActivity = z.infer<typeof brandEditorialActivitySchema>;
export type PortfolioBrand = z.infer<typeof portfolioBrandSchema>;
export type PortfolioMarketRow = z.infer<typeof portfolioMarketRowSchema>;
export type PortfolioObjective = z.infer<typeof portfolioObjectiveSchema>;
export type PortfolioNote = z.infer<typeof portfolioNoteSchema>;
export type PortfolioPayload = z.infer<typeof portfolioPayloadSchema>;
export type PortfolioFilters = PortfolioPayload["filters"];
export type PortfolioComparison = z.infer<typeof portfolioComparisonSchema>;

/**
 * Fuentes que V2 tiene conectadas hoy, derivadas del catálogo de fuentes (P3.1)
 * en lugar de una constante propia: cuando P3.2 marque GA4 y Search Console como
 * conectadas, esta tabla lo reflejará sin tocar el contrato del portfolio.
 *
 * `siteAudit` mapea a la fuente `crawl` del catálogo, que es su nombre en V2.
 */
export const v2ConnectedSources = (): BrandSourceMap => ({
  ga4: findSource("ga4")?.connected ?? false,
  gsc: findSource("gsc")?.connected ?? false,
  semrush: findSource("semrush")?.connected ?? false,
  siteAudit: findSource("crawl")?.connected ?? false,
});

export const PORTFOLIO_PENDING_REASON =
  "La V1 medía esta marca, pero el piloto de datos de V2 es Porcelanosa, Noken y Xtone. Su analítica llega con la expansión (P11) sobre el almacén de P3; hasta entonces no se muestra ninguna cifra estimada.";

// ---------------------------------------------------------------------------
// Filtros compartibles por URL
// ---------------------------------------------------------------------------

const pick = (input: Record<string, string | string[] | undefined>, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

/**
 * Lee el estado de filtros de la query string. Es tolerante por diseño: una
 * marca desconocida se descarta en vez de romper el enlace compartido, y una
 * selección vacía equivale a las ocho marcas.
 *
 * El orden siempre es el canónico de `BRANDS`, no el de la URL: dos enlaces con
 * las mismas marcas en distinto orden producen exactamente la misma respuesta.
 */
export function parsePortfolioFilters(input: Record<string, string | string[] | undefined>): PortfolioFilters {
  const raw = (pick(input, "brands") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const requested = new Set(raw);
  const brands = BRAND_SLUGS.filter((slug) => requested.has(slug));
  const market = pick(input, "market");
  const period = pick(input, "period");
  const compare = pick(input, "compare");
  return {
    brands: brands.length ? [...brands] : [...BRAND_SLUGS],
    market: marketCodeSchema.safeParse(market).success ? (market as z.infer<typeof marketCodeSchema>) : "all",
    period: periodKeySchema.catch("28d").parse(period),
    compare: compare === "previousYear" ? "previousYear" : "previous",
  };
}

/** Query string canónica: omite todo lo que ya es el valor por defecto. */
export function portfolioFilterQuery(filters: PortfolioFilters): string {
  const params = new URLSearchParams();
  if (filters.brands.length !== BRAND_SLUGS.length) params.set("brands", filters.brands.join(","));
  if (filters.market !== "all") params.set("market", filters.market);
  if (filters.period !== "28d") params.set("period", filters.period);
  if (filters.compare !== "previous") params.set("compare", filters.compare);
  return params.toString();
}

/** Alterna una marca conservando el orden canónico. Nunca deja la selección vacía. */
export function togglePortfolioBrand(filters: PortfolioFilters, slug: BrandSlug): PortfolioFilters {
  const selected = new Set(filters.brands);
  if (selected.has(slug)) selected.delete(slug);
  else selected.add(slug);
  const brands = BRAND_SLUGS.filter((item) => selected.has(item));
  return { ...filters, brands: brands.length ? [...brands] : [...BRAND_SLUGS] };
}

// ---------------------------------------------------------------------------
// Agregación pura
// ---------------------------------------------------------------------------

export type PortfolioInput = {
  generatedAt: string;
  mode: "synthetic" | "live" | "database";
  filters: PortfolioFilters;
  editorialPlanningYear: number;
  /**
   * Fuentes realmente conectadas en este origen. Sin él se usa el catálogo, que
   * describe el almacén de P3; el origen `live` sí lee GA4 y GSC aunque el
   * almacén aún no exista, y la tabla de cobertura debe decirlo (D-034).
   */
  connectedSources?: BrandSourceMap;
  /** Una entrada por marca seleccionada. `analytics: null` = sin fuente en V2. */
  rows: Array<{ slug: BrandSlug; analytics: BrandAnalytics | null; editorial: BrandEditorialActivity }>;
};

const round1 = (value: number) => Math.round(value * 10) / 10;
const percent = (value: number) => round1(value * 100);

function trendOf(value: number, comparison: number): "up" | "down" | "flat" {
  if (comparison === 0) return value === 0 ? "flat" : "up";
  const delta = (value - comparison) / Math.abs(comparison);
  if (delta > 0.005) return "up";
  if (delta < -0.005) return "down";
  return "flat";
}

/**
 * Media de visibilidad. La regla —ponderar por sesiones— **no se decide aquí**:
 * la declara el catálogo de métricas (`visibility.weightBy = "organic_sessions"`)
 * y la aplica `aggregateMetric`, que es la única función que agrega en el
 * monorepo (P3.1). Así el SQL de P3.2 agregará igual que agrega hoy el
 * sintético, en vez de reinventar la ponderación y mover los números al conectar
 * el dato real.
 *
 * `aggregateMetric` devuelve `null` sin peso, porque la ausencia de filas no es
 * un cero. Aquí se traduce a 0 porque el contrato de la fila de mercado exige un
 * número y esas filas solo existen cuando hay marca que aporta.
 */
function weightedVisibility(rows: Array<{ sessions: number; visibility: number }>) {
  return aggregateMetric("visibility", rows.map((row) => ({ value: row.visibility, weight: row.sessions }))) ?? 0;
}

function coverageFor(withAnalytics: number, selected: number, asOf: string): z.infer<typeof coverageSchema> {
  const ratio = selected === 0 ? 0 : withAnalytics / selected;
  return {
    ratio,
    label: `${withAnalytics} de ${selected} marcas con serie analítica`,
    quality: ratio === 1 ? "completa" : ratio > 0 ? "parcial" : "insuficiente",
    asOf,
  };
}

function objectiveStatus(progress: number): PortfolioObjective["status"] {
  if (progress >= 1) return "cumplido";
  if (progress >= 0.9) return "en-riesgo";
  return "incumplido";
}

/**
 * Explicaciones ejecutivas derivadas de los propios agregados. Son reglas
 * deterministas sobre los números, no prosa generada: el mismo payload produce
 * siempre las mismas notas en el mismo orden. Cada nota lleva su evidencia.
 */
export function buildPortfolioNarrative(input: {
  totals: z.infer<typeof metricSchema>[];
  brands: PortfolioBrand[];
  markets: PortfolioMarketRow[];
  objectives: PortfolioObjective[];
  coverage: z.infer<typeof portfolioCoverageSchema>;
  compare: PortfolioComparison;
}): PortfolioNote[] {
  const notes: PortfolioNote[] = [];
  const compareLabel = input.compare === "previousYear" ? "interanual" : "periodo anterior";
  const changeOf = (row: PortfolioMarketRow) => {
    const base = input.compare === "previousYear" ? row.previousYearSessions : row.previousSessions;
    return base === 0 ? 0 : ((row.sessions - base) / base) * 100;
  };

  const ranked = [...input.markets].filter((row) => row.sessions > 0).sort((a, b) => changeOf(a) - changeOf(b));
  const worst = ranked[0];
  const best = ranked[ranked.length - 1];

  if (worst && changeOf(worst) < 0) {
    const change = round1(changeOf(worst));
    notes.push({
      id: `note-market-${worst.code}-riesgo`,
      kind: "mercado",
      tone: "riesgo",
      headline: `${worst.name} retrocede ${Math.abs(change).toLocaleString("es-ES")}% frente al ${compareLabel}`,
      detail: `Es el mercado con la mayor caída relativa de sesiones orgánicas del conjunto seleccionado, con ${worst.contributingBrands} marca(s) aportando serie.`,
      magnitude: Math.abs(change),
      evidence: [
        { label: "Sesiones del periodo", value: worst.sessions.toLocaleString("es-ES"), href: null },
        { label: `Sesiones del ${compareLabel}`, value: (input.compare === "previousYear" ? worst.previousYearSessions : worst.previousSessions).toLocaleString("es-ES"), href: null },
      ],
    });
  }

  if (best && best.code !== worst?.code && changeOf(best) > 0) {
    const change = round1(changeOf(best));
    notes.push({
      id: `note-market-${best.code}-resultado`,
      kind: "mercado",
      tone: "resultado",
      headline: `${best.name} avanza ${change.toLocaleString("es-ES")}% frente al ${compareLabel}`,
      detail: `Es el mercado con el mayor avance relativo de sesiones orgánicas del conjunto seleccionado.`,
      magnitude: Math.abs(change),
      evidence: [
        { label: "Sesiones del periodo", value: best.sessions.toLocaleString("es-ES"), href: null },
        ...(input.totals.some((metric) => metric.key === "visibility")
          ? [{ label: "Visibilidad ponderada", value: `${best.visibility.toLocaleString("es-ES")}%`, href: null }]
          : [{ label: "Sesiones del periodo anterior", value: best.previousSessions.toLocaleString("es-ES"), href: null }]),
      ],
    });
  }

  const leader = [...input.brands]
    .filter((brand) => brand.shareOfSessions !== null)
    .sort((a, b) => (b.shareOfSessions ?? 0) - (a.shareOfSessions ?? 0))[0];
  if (leader && (leader.shareOfSessions ?? 0) >= 50) {
    notes.push({
      id: `note-brand-${leader.slug}-concentracion`,
      kind: "marca",
      tone: "calidad",
      headline: `${leader.name} concentra el ${(leader.shareOfSessions ?? 0).toLocaleString("es-ES")}% de las sesiones medidas`,
      detail: "Cualquier lectura del conjunto se mueve con esta marca. Interpreta los agregados sabiendo de dónde vienen antes de decidir sobre el grupo.",
      magnitude: leader.shareOfSessions ?? 0,
      evidence: [{ label: "Cuota de sesiones", value: `${(leader.shareOfSessions ?? 0).toLocaleString("es-ES")}%`, href: `/projects/${leader.slug}` }],
    });
  }

  const behind = [...input.objectives].filter((objective) => objective.status !== "cumplido").sort((a, b) => a.progress - b.progress)[0];
  if (behind) {
    notes.push({
      id: `note-objective-${behind.key}`,
      kind: "objetivo",
      tone: behind.status === "incumplido" ? "riesgo" : "oportunidad",
      headline: `${behind.label} queda ${percent(1 - behind.progress).toLocaleString("es-ES")}% por debajo de su objetivo`,
      detail: `Faltan ${Math.round(behind.gap).toLocaleString("es-ES")} para el objetivo del periodo. El progreso es valor ÷ objetivo, con la cobertura del propio KPI.`,
      magnitude: percent(1 - behind.progress),
      evidence: [
        { label: "Valor", value: Math.round(behind.value).toLocaleString("es-ES"), href: null },
        { label: "Objetivo", value: Math.round(behind.target).toLocaleString("es-ES"), href: null },
        { label: "Cobertura", value: behind.coverage.label, href: "/data" },
      ],
    });
  }

  if (input.coverage.brandsPending.length > 0) {
    notes.push({
      id: "note-coverage-pendiente",
      kind: "cobertura",
      tone: "calidad",
      headline: `${input.coverage.brandsPending.length} de ${input.coverage.brandsSelected} marcas seleccionadas no tienen analítica en V2`,
      detail: "La V1 sí las medía. Los agregados de esta pantalla solo suman las marcas con serie; el plan editorial sí cubre las ocho desde P1.",
      magnitude: (input.coverage.brandsPending.length / Math.max(input.coverage.brandsSelected, 1)) * 100,
      evidence: [
        { label: "Marcas sin serie", value: input.coverage.brandsPending.map((slug) => BRANDS.find((brand) => brand.slug === slug)?.name ?? slug).join(", "), href: null },
        { label: "Cobertura del agregado", value: input.coverage.label, href: "/data" },
      ],
    });
  }

  return notes.sort((a, b) => b.magnitude - a.magnitude).slice(0, 5);
}

/**
 * Construye el payload completo a partir de las filas por marca. Es la única
 * fuente de los agregados: totales, mercados, objetivos, cuotas, cobertura y
 * explicaciones salen todos de aquí, así que no pueden contradecir sus partes.
 */
export function aggregatePortfolio(input: PortfolioInput): PortfolioPayload {
  const selected = input.rows;
  const measured = selected.filter((row): row is (typeof selected)[number] & { analytics: BrandAnalytics } => row.analytics !== null);
  const asOf = measured[0]?.analytics.coverage.asOf ?? input.generatedAt.slice(0, 10);
  const totalCoverage = coverageFor(measured.length, selected.length, asOf);

  const sessions = measured.reduce((total, row) => total + row.analytics.sessions, 0);
  const clicks = measured.reduce((total, row) => total + row.analytics.clicks, 0);
  const conversions = measured.reduce((total, row) => total + row.analytics.conversions, 0);
  const previousSessions = measured.reduce((total, row) => total + row.analytics.previousSessions, 0);
  const previousYearSessions = measured.reduce((total, row) => total + row.analytics.previousYearSessions, 0);
  const targetSessions = measured.reduce((total, row) => total + row.analytics.targetSessions, 0);
  const targetClicks = measured.reduce((total, row) => total + row.analytics.targetClicks, 0);
  const targetConversions = measured.reduce((total, row) => total + row.analytics.targetConversions, 0);
  const visibility = weightedVisibility(measured.map((row) => ({ sessions: row.analytics.sessions, visibility: row.analytics.visibility })));

  const previousClicks = measured.reduce((total, row) => total + row.analytics.previousClicks, 0);
  const previousYearClicks = measured.reduce((total, row) => total + row.analytics.previousYearClicks, 0);
  const previousConversions = measured.reduce((total, row) => total + row.analytics.previousConversions, 0);
  const previousYearConversions = measured.reduce((total, row) => total + row.analytics.previousYearConversions, 0);

  const brands: PortfolioBrand[] = selected.map((row) => {
    const brand = BRANDS.find((item) => item.slug === row.slug)!;
    return {
      slug: brand.slug,
      name: brand.name,
      code: brand.code,
      domain: brand.domain,
      pilot: brand.pilot,
      wave: brand.wave,
      analyticsState: row.analytics ? "piloto" : "pendiente-migracion",
      analyticsPendingReason: row.analytics ? null : PORTFOLIO_PENDING_REASON,
      analytics: row.analytics,
      // Las fuentes del origen solo valen para las marcas que ese origen mide: una marca sin serie no tiene nada conectado.
      sources: { v1: brand.v1Sources, v2: input.connectedSources && row.analytics ? input.connectedSources : v2ConnectedSources() },
      editorial: row.editorial,
      shareOfSessions: row.analytics ? (sessions === 0 ? 0 : percent(row.analytics.sessions / sessions)) : null,
    };
  });

  const marketCodes = input.filters.market === "all" ? MARKETS.map((market) => market.code) : [input.filters.market];
  const markets: PortfolioMarketRow[] = marketCodes
    .map((code) => {
      const rows = measured.flatMap((row) => row.analytics.markets.filter((market) => market.code === code));
      const name = MARKETS.find((market) => market.code === code)?.name ?? code;
      return {
        code,
        name,
        sessions: rows.reduce((total, row) => total + row.sessions, 0),
        clicks: rows.reduce((total, row) => total + row.clicks, 0),
        conversions: rows.reduce((total, row) => total + row.conversions, 0),
        previousSessions: rows.reduce((total, row) => total + row.previousSessions, 0),
        previousYearSessions: rows.reduce((total, row) => total + row.previousYearSessions, 0),
        visibility: weightedVisibility(rows),
        contributingBrands: rows.length,
      };
    })
    .filter((row) => row.contributingBrands > 0);

  /**
   * Etiqueta, unidad y dirección buena salen del catálogo de métricas (P3.1), no
   * de literales repetidos en cada superficie: si mañana cambia el nombre de un
   * KPI o se corrige su dirección, cambia en un sitio y llega a todas.
   */
  const total = (key: MetricKey, value: number, previous: number | null, previousYear: number | null, target: number | null): z.infer<typeof metricSchema> => {
    const definition = findMetric(key)!;
    const weighted = definition.aggregation === "weighted-average";
    return {
      key,
      label: definition.label,
      value,
      unit: definition.unit,
      previous,
      previousYear,
      target,
      trend: previous === null ? "flat" : trendOf(value, previous),
      goodDirection: definition.goodDirection,
      coverage: weighted
        ? { ...totalCoverage, label: `${totalCoverage.label} · media ponderada por ${findMetric(definition.weightBy!)?.label.toLowerCase() ?? definition.weightBy}` }
        : totalCoverage,
    };
  };

  /*
   * Un objetivo que suma cero no es un objetivo: es la ausencia de plan. Se
   * declara `null` para que la interfaz no pinte «Objetivo 0». Y la visibilidad
   * solo entra si el origen mide SEMrush: un 0 % sin fuente parecería una
   * medición (D-034).
   */
  const measuresVisibility = input.connectedSources ? input.connectedSources.semrush : true;
  const totals: z.infer<typeof metricSchema>[] = [
    total("organic_sessions", sessions, previousSessions, previousYearSessions, targetSessions || null),
    total("organic_clicks", clicks, previousClicks, previousYearClicks, targetClicks || null),
    total("macro_conversions", conversions, previousConversions, previousYearConversions, targetConversions || null),
    ...(measuresVisibility ? [total("visibility", visibility, null, null, null)] : []),
  ];

  const objectives: PortfolioObjective[] = totals
    .filter((metric) => metric.target !== null && metric.target > 0)
    .map((metric) => {
      const target = metric.target as number;
      const progress = metric.value / target;
      return {
        key: metric.key,
        label: metric.label,
        unit: metric.unit,
        value: metric.value,
        target,
        progress,
        gap: target - metric.value,
        status: objectiveStatus(progress),
        coverage: metric.coverage,
      };
    });

  const coverage: z.infer<typeof portfolioCoverageSchema> = {
    brandsSelected: selected.length,
    brandsWithAnalytics: measured.length,
    brandsPending: selected.filter((row) => row.analytics === null).map((row) => row.slug),
    ratio: totalCoverage.ratio,
    label: totalCoverage.label,
  };

  const payload: PortfolioPayload = {
    generatedAt: input.generatedAt,
    mode: input.mode,
    filters: input.filters,
    totals,
    brands,
    markets,
    objectives,
    narrative: buildPortfolioNarrative({ totals, brands, markets, objectives, coverage, compare: input.filters.compare }),
    coverage,
    editorialPlanningYear: input.editorialPlanningYear,
  };

  return portfolioPayloadSchema.parse(payload);
}
