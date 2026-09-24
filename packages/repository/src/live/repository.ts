import {
  MARKETS,
  aggregateMetric,
  aggregatePortfolio,
  buildPeriodWindow,
  BRAND_REPORT_VERSION,
  resolveReportWindow,
  dashboardPayloadSchema,
  findBrand,
  findMetric,
  isPilotProject,
  type BrandAnalytics,
  type DashboardFilters,
  type DashboardPayload,
  type MarketCode,
  type MetricKey,
  type PeriodWindow,
  type PortfolioFilters,
} from "@seo/contracts";
import { RepositoryUnavailableError, type BrandReportRequest, type MetricsRepository, type PortfolioContext, type RepositoryDescription } from "../contract";
import { resolveLiveBrands, type LiveMarket, type ResolvedLiveBrand } from "./brands";
import { fetchBrandFigures, fetchMarketFigures, gscFloor, type BrandFigures, type MarketFigures } from "./figures";
import { hasGscCredentials, parseServiceAccount, type Env } from "./google";
import { fetchOpportunities, type BrandOpportunities } from "./opportunities";
import { buildBrandReport } from "./report";

/**
 * Origen `live`: lectura directa de GA4 y Search Console desde el servidor (D-034).
 *
 * Es un puente, no el destino. El destino sigue siendo el almacén de P3
 * (Postgres + ingesta diaria + reconciliación). Este origen existe para que el
 * visor desplegado enseñe dato real mientras el almacén no está, y por eso se
 * declara a sí mismo como lo que es:
 *
 * - `realData: true`, porque las cifras son las de las propiedades.
 * - Pero sin snapshot propio ni reconciliación: la tarjeta de cada fuente lo
 *   dice, y una fuente caída sale en «error» en vez de ocultarse.
 *
 * Lo que este origen **no** rellena, a propósito: conclusiones, acciones,
 * incidencias técnicas e informes. En el sintético eran texto
 * de validación; mezclarlo con cifras reales haría pasar una narrativa
 * inventada por una lectura del dato. Esas colecciones llegan vacías y las
 * pantallas ya saben decir «sin conclusiones aprobadas».
 *
 * Las oportunidades sí se rellenan desde D-036, porque salen del dato: URLs y
 * consultas non-branded de Search Console medidas contra la curva de CTR del
 * propio sitio (`opportunities.ts`).
 */

export const LIVE_DESCRIPTION: RepositoryDescription = {
  mode: "live",
  label: "GA4 y Search Console en directo",
  disclosure:
    "Cifras reales leídas en directo de GA4 y Search Console para el piloto (Porcelanosa, Noken y Xtone). Todavía sin almacén propio ni reconciliación: SEMrush, CrUX, crawl y GEO no están conectados y no se muestran.",
  realData: true,
  connectedSources: ["ga4", "gsc"],
  supersededBy: "P3.2",
};

/** Search Console publica con tres días de desfase; GA4 con uno. La ventana se cierra en el peor. */
const CUTOFF_LAG_DAYS = 3;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Hoy en Europe/Madrid menos el desfase. La zona es la del catálogo, no la del servidor. */
export function liveCutoff(now: Date = new Date()): string {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return new Date(Date.parse(today) - CUTOFF_LAG_DAYS * 86_400_000).toISOString().slice(0, 10);
}

type Entry = { expiresAt: number; value: Promise<unknown> };
const memo = new Map<string, Entry>();

/**
 * Caché en memoria de la instancia. La portada y el portfolio piden las mismas
 * cifras; sin esto cada navegación haría ~40 llamadas a Google. Un fallo no se
 * cachea: la siguiente petición lo reintenta.
 */
function remember<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
  const value = run();
  memo.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  value.catch(() => memo.delete(key));
  return value;
}

const round1 = (value: number) => Math.round(value * 10) / 10;
const changePct = (value: number, previous: number) => (previous === 0 ? 0 : round1(((value - previous) / previous) * 100));
const trendOf = (value: number, previous: number | null) => {
  if (previous === null || previous === 0) return "flat" as const;
  const delta = (value - previous) / Math.abs(previous);
  return delta > 0.005 ? ("up" as const) : delta < -0.005 ? ("down" as const) : ("flat" as const);
};
const attentionOf = (change: number) => (change <= -5 ? ("actuar" as const) : change < 0 ? ("observar" as const) : ("estable" as const));
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const marketName = (code: MarketCode) => MARKETS.find((market) => market.code === code)?.name ?? code;

type Loaded = { brand: ResolvedLiveBrand; figures: BrandFigures; markets: MarketFigures[]; opportunities: BrandOpportunities | null };

function scopeMarkets(brand: ResolvedLiveBrand, market: MarketCode | "all"): LiveMarket[] {
  return market === "all" ? [...brand.markets] : brand.markets.filter((item) => item.code === market);
}

export function createLiveRepository(env: Env = process.env): MetricsRepository {
  const hasGa4 = Boolean(parseServiceAccount(env));
  const hasGsc = hasGscCredentials(env);
  if (!hasGa4 && !hasGsc) {
    throw new RepositoryUnavailableError(
      "live",
      "El origen «live» no tiene credenciales de Google: faltan GA4_SERVICE_ACCOUNT_JSON y GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN.",
      "Define las credenciales en el entorno del servidor, o quita SEO_DATA_SOURCE para usar el origen sintético.",
    );
  }
  const brands = resolveLiveBrands(env).filter((brand) => isPilotProject(brand.slug));

  async function load(brand: ResolvedLiveBrand, market: MarketCode | "all", window: PeriodWindow, cutoff: string): Promise<Loaded> {
    const scope = market === "all" ? null : (brand.markets.find((item) => item.code === market) ?? null);
    const key = `${brand.slug}:${market}:${window.start}:${window.end}`;
    const [figures, markets, opportunities] = await Promise.all([
      remember(`fig:${key}`, () => fetchBrandFigures(env, brand, scope, window, cutoff)),
      remember(`mkt:${key}`, () => fetchMarketFigures(env, brand, scopeMarkets(brand, market), window, cutoff)),
      // Las oportunidades son un extra: si fallan, la portada sigue con sus KPI y la lista sale vacía.
      remember(`opp:${key}`, () => fetchOpportunities(env, brand, scope, window, cutoff)).catch(() => null),
    ]);
    return { brand, figures, markets, opportunities };
  }

  return {
    describe: () => LIVE_DESCRIPTION,
    cutoff: () => liveCutoff(),

    async brandReport(request: BrandReportRequest) {
      const brand = brands.find((item) => item.slug === request.brand);
      if (!brand) throw new RepositoryUnavailableError("live", `La marca «${request.brand}» no tiene lectura directa configurada.`, "Añádela a LIVE_BRANDS con su propiedad GA4 y su sitio de Search Console.");
      const cutoff = liveCutoff();
      const window = resolveReportWindow(request.range, cutoff);
      const key = `report:${BRAND_REPORT_VERSION}:${brand.slug}:${request.market}:${window.start}:${window.end}:${window.previousStart}:${window.previousYearStart}:${request.editorial.map((item) => `${item.id}=${item.keyword}`).join(",")}`;
      return remember(key, () => buildBrandReport({ env, brand, market: request.market, window, cutoff, editorial: request.editorial }));
    },

    async dashboard(filters: DashboardFilters) {
      const cutoff = liveCutoff();
      const window = buildPeriodWindow(filters.period, cutoff);
      const generatedAt = new Date().toISOString();
      if (filters.project !== "all" && !isPilotProject(filters.project)) return unmeasuredDashboard(filters, window, generatedAt);
      const selected = brands.filter((brand) => filters.project === "all" || brand.slug === filters.project);
      const loaded = await Promise.all(selected.map((brand) => load(brand, filters.market, window, cutoff)));
      return buildDashboard(filters, window, cutoff, generatedAt, loaded);
    },

    async portfolio(filters: PortfolioFilters, context: PortfolioContext) {
      const cutoff = liveCutoff();
      const window = buildPeriodWindow(filters.period, cutoff);
      const byslug = new Map(brands.map((brand) => [brand.slug, brand]));
      const rows = await Promise.all(
        filters.brands.map(async (slug) => {
          const brand = byslug.get(slug);
          const analytics = brand ? toBrandAnalytics(await load(brand, filters.market, window, cutoff), cutoff) : null;
          return { slug, analytics, editorial: context.editorial[slug] };
        }),
      );
      return aggregatePortfolio({
        generatedAt: new Date().toISOString(),
        mode: "live",
        filters,
        editorialPlanningYear: context.planningYear,
        connectedSources: { ga4: hasGa4, gsc: hasGsc, semrush: false, siteAudit: false },
        rows,
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Composición de la portada
// ---------------------------------------------------------------------------

const SOURCES = [
  { key: "ga4", label: "Google Analytics 4" },
  { key: "gsc", label: "Search Console" },
  { key: "semrush", label: "SEMrush" },
  { key: "geo", label: "GEO" },
  { key: "crux", label: "CrUX" },
  { key: "pagespeed", label: "PageSpeed" },
  { key: "crawl", label: "Crawl aprobado" },
] as const;

const PENDING_NOTE: Record<(typeof SOURCES)[number]["key"], string> = {
  ga4: "",
  gsc: "",
  semrush: "Sin conectar en V2. Llega con P3.3; hasta entonces no se muestra visibilidad.",
  geo: "Sin conectar en V2. Llega con P8.",
  crux: "Sin conectar en V2. Llega con P3.3.",
  pagespeed: "Sin conectar en V2. Llega con P3.3.",
  crawl: "El crawl vive en el workbench local; su publicación firmada llega con P5.",
};

function metric(key: MetricKey, value: number, previous: number | null, previousYear: number | null, coverage: DashboardPayload["metrics"][number]["coverage"]): DashboardPayload["metrics"][number] {
  const definition = findMetric(key)!;
  return { key, label: definition.label, value, unit: definition.unit, previous, previousYear, target: null, trend: trendOf(value, previous), goodDirection: definition.goodDirection, coverage };
}

const quality = (ratio: number) => (ratio >= 0.98 ? ("completa" as const) : ratio > 0 ? ("parcial" as const) : ("insuficiente" as const));

function buildDashboard(filters: DashboardFilters, window: PeriodWindow, cutoff: string, generatedAt: string, loaded: Loaded[]): DashboardPayload {
  const total = loaded.length;
  const ga4Ok = loaded.flatMap((item) => (item.figures.ga4.ok ? [item.figures.ga4.value] : []));
  const gscOk = loaded.flatMap((item) => (item.figures.gsc.ok ? [item.figures.gsc.value] : []));
  const byCountry = loaded.some((item) => item.brand.markets.some((market) => market.code === filters.market && market.country));
  const marketLabel = filters.market === "all" ? "todos los mercados" : `mercado ${filters.market} por ruta${byCountry ? " y país" : ""}`;
  const brandsLabel = (ok: number) => `${ok}/${total} marca${total === 1 ? "" : "s"}`;

  const metrics: DashboardPayload["metrics"] = [];

  if (ga4Ok.length) {
    const ga4Coverage = { ratio: ga4Ok.length / total, label: `GA4 · medium organic · ${brandsLabel(ga4Ok.length)} · ${marketLabel}`, quality: quality(ga4Ok.length / total), asOf: cutoff };
    const agg = (key: MetricKey, pick: (item: (typeof ga4Ok)[number], range: "current" | "previous" | "previousYear") => number) =>
      (["current", "previous", "previousYear"] as const).map((range) => aggregateMetric(key, ga4Ok.map((item) => ({ value: pick(item, range) }))) ?? 0);
    const [sessions, previousSessions, previousYearSessions] = agg("organic_sessions", (item, range) => item.totals[range].sessions);
    const [conversions, previousConversions, previousYearConversions] = agg("macro_conversions", (item, range) => item.totals[range].conversions);
    metrics.push(metric("organic_sessions", sessions!, previousSessions!, previousYearSessions!, ga4Coverage));
    metrics.push(metric("macro_conversions", conversions!, previousConversions!, previousYearConversions!, { ...ga4Coverage, label: `GA4 · key events orgánicos · ${brandsLabel(ga4Ok.length)}` }));
  }

  if (gscOk.length) {
    const floor = gscFloor(cutoff);
    const daysCovered = window.start >= floor ? window.days : Math.max(0, Math.round((Date.parse(window.end) - Date.parse(floor)) / 86_400_000) + 1);
    const dayRatio = daysCovered / window.days;
    const current = gscOk.map((item) => item.totals.current).filter((value) => value !== null);
    const comparable = (range: "previous" | "previousYear") => {
      const values = gscOk.map((item) => item.totals[range]);
      return values.every((value) => value !== null) ? values : null;
    };
    const previous = comparable("previous");
    const previousYear = comparable("previousYear");
    const clicksOf = (values: typeof current) => aggregateMetric("organic_clicks", values.map((value) => ({ value: value!.clicks }))) ?? 0;
    const ratio = (gscOk.length / total) * dayRatio;
    const retention = dayRatio < 1 ? ` · GSC conserva 16 meses: ${daysCovered} de ${window.days} días` : " · hasta D-3";
    metrics.push(metric("organic_clicks", clicksOf(current), previous ? clicksOf(previous) : null, previousYear ? clicksOf(previousYear) : null, { ratio, label: `GSC · ${brandsLabel(gscOk.length)}${retention}`, quality: quality(ratio), asOf: cutoff }));

    /*
     * Cuota non-branded = no marca / (marca + no marca). El denominador son los
     * clics con consulta visible: GSC anonimiza una parte grande de las
     * consultas, y dividir por el total infravaloraría la cuota. La cobertura
     * declara qué fracción de los clics estaba clasificada.
     */
    const share = (values: typeof current) =>
      aggregateMetric("nonbrand_share", values.map((value) => {
        const classified = value!.brandClicks + value!.nonBrandClicks;
        return { value: classified === 0 ? 0 : (value!.nonBrandClicks / classified) * 100, weight: classified };
      }));
    const classified = sum(current.map((value) => value!.brandClicks + value!.nonBrandClicks));
    const clicks = sum(current.map((value) => value!.clicks));
    const shareValue = share(current);
    if (shareValue !== null) {
      const classifiedRatio = clicks === 0 ? 0 : classified / clicks;
      metrics.push(
        metric("nonbrand_share", shareValue, previous ? share(previous) : null, previousYear ? share(previousYear) : null, {
          ratio: Math.min(1, classifiedRatio),
          label: `${Math.round(classifiedRatio * 100)}% de clics con consulta visible · marca propia + paraguas`,
          quality: classifiedRatio >= 0.9 ? "completa" : classifiedRatio > 0 ? "parcial" : "insuficiente",
          asOf: cutoff,
        }),
      );
    }
  }

  return dashboardPayloadSchema.parse({
    generatedAt,
    mode: "live",
    window,
    filters,
    metrics,
    projects: loaded.map(projectSummary),
    markets: marketRows(filters, loaded),
    executiveInsights: [],
    geo: { citationShare: 0, previousCitationShare: 0, citedPrompts: 0, totalPrompts: 0, aiSessions: 0, aiConversions: 0, leadingAssistant: "—", topCitedDomain: "—" },
    actions: [],
    sources: sourceStatus(loaded, cutoff, generatedAt),
    series: buildSeries(loaded, window),
    annotations: loaded
      .flatMap((item) => item.brand.annotations ?? [])
      .filter((annotation) => annotation.date >= window.start && annotation.date <= window.end)
      .map((annotation) => ({ ...annotation })),
    technicalIssues: [],
    opportunities: loaded.flatMap((item) => item.opportunities?.pages ?? []).sort((a, b) => b.opportunityScore - a.opportunityScore),
    queryOpportunities: loaded.flatMap((item) => item.opportunities?.queries ?? []).sort((a, b) => b.potentialClicks - a.potentialClicks),
    reports: [],
  });
}

function projectSummary({ brand, figures, opportunities }: Loaded): DashboardPayload["projects"][number] {
  const topQuery = opportunities?.queries[0] ?? null;
  const meta = findBrand(brand.slug)!;
  const change = figures.ga4.ok ? changePct(figures.ga4.value.totals.current.sessions, figures.ga4.value.totals.previous.sessions) : 0;
  return {
    slug: meta.slug,
    name: meta.name,
    domain: meta.domain ?? "—",
    attention: attentionOf(change),
    // El score compuesto exige visibilidad y salud técnica; sin SEMrush ni crawl no se calcula.
    score: null,
    businessScore: null,
    visibilityScore: null,
    technicalScore: null,
    delta: 0,
    primaryRisk: figures.ga4.ok ? `Sesiones ${change > 0 ? "+" : ""}${change}% vs. periodo anterior` : "GA4 no disponible",
    primaryOpportunity: topQuery ? `«${topQuery.query}» · pos. ${topQuery.position.toLocaleString("es-ES")} · +${topQuery.potentialClicks.toLocaleString("es-ES")} clics posibles` : "Sin conclusión aprobada",
  };
}

function marketRows(filters: DashboardFilters, loaded: Loaded[]): DashboardPayload["markets"] {
  const codes = filters.market === "all" ? MARKETS.map((market) => market.code) : [filters.market];
  return codes.flatMap((code) => {
    const rows = loaded.flatMap((item) => item.markets.filter((market) => market.code === code));
    const ga4 = rows.flatMap((row) => (row.ga4.ok ? [row.ga4.value] : []));
    if (!ga4.length) return [];
    const sessions = sum(ga4.map((value) => value.current.sessions));
    const previous = sum(ga4.map((value) => value.previous.sessions));
    const change = changePct(sessions, previous);
    return [{
      code,
      name: marketName(code),
      sessions,
      clicks: sum(rows.map((row) => (row.gsc.ok ? (row.gsc.value.current ?? 0) : 0))),
      conversions: sum(ga4.map((value) => value.current.conversions)),
      change,
      // Sin SEMrush no hay visibilidad. La interfaz lo muestra como «—», no como 0 %.
      visibility: 0,
      attention: attentionOf(change),
    }];
  });
}

function sourceStatus(loaded: Loaded[], cutoff: string, generatedAt: string): DashboardPayload["sources"] {
  return SOURCES.map((source) => {
    if (source.key !== "ga4" && source.key !== "gsc") {
      return { source: source.key, label: source.label, status: "no_configurado" as const, lastValidSnapshot: null, cutoff: null, coverage: 0, note: PENDING_NOTE[source.key] };
    }
    const results = loaded.map((item) => ({ slug: item.brand.slug, result: item.figures[source.key] }));
    const failed = results.filter((item) => !item.result.ok);
    const ok = results.length - failed.length;
    const status = failed.length === 0 ? ("correcto" as const) : ok > 0 ? ("parcial" as const) : ("error" as const);
    const note = failed.length
      ? failed.map((item) => `${findBrand(item.slug)?.name ?? item.slug}: ${item.result.ok ? "" : item.result.error}`).join(" · ")
      : `Lectura directa de la API · ${ok} marca${ok === 1 ? "" : "s"} · sin almacén propio todavía`;
    return { source: source.key, label: source.label, status, lastValidSnapshot: ok ? generatedAt : null, cutoff: ok ? cutoff : null, coverage: results.length ? ok / results.length : 0, note };
  });
}

/**
 * Series diarias sumadas entre marcas. El interanual se alinea por fecha menos
 * 365 días, que es como se construye la ventana interanual: alinear por
 * posición desplazaría la serie un día en cuanto a una de las dos le falte uno.
 */
function buildSeries(loaded: Loaded[], window: PeriodWindow): DashboardPayload["series"] {
  const shift = (date: string) => new Date(Date.parse(date) + 365 * 86_400_000).toISOString().slice(0, 10);
  const accumulate = (entries: Array<{ date: string; value: number }>) => {
    const map = new Map<string, number>();
    for (const entry of entries) map.set(entry.date, (map.get(entry.date) ?? 0) + entry.value);
    return map;
  };
  const series = (current: Array<{ date: string; value: number }>, previousYear: Array<{ date: string; value: number }>) => {
    const now = accumulate(current);
    const before = accumulate(previousYear.map((entry) => ({ date: shift(entry.date), value: entry.value })));
    return [...now.keys()]
      .filter((date) => date >= window.start && date <= window.end)
      .sort()
      .map((date) => ({ date, value: now.get(date)!, previousYear: before.get(date) ?? null, lowerBand: null, upperBand: null }));
  };
  const ga4 = loaded.flatMap((item) => (item.figures.ga4.ok ? [item.figures.ga4.value] : []));
  const gsc = loaded.flatMap((item) => (item.figures.gsc.ok ? [item.figures.gsc.value] : []));
  const out: DashboardPayload["series"] = {};
  if (ga4.length) {
    out.organic_sessions = series(ga4.flatMap((item) => item.daily.current.map((point) => ({ date: point.date, value: point.sessions }))), ga4.flatMap((item) => item.daily.previousYear.map((point) => ({ date: point.date, value: point.sessions }))));
    out.macro_conversions = series(ga4.flatMap((item) => item.daily.current.map((point) => ({ date: point.date, value: point.conversions }))), ga4.flatMap((item) => item.daily.previousYear.map((point) => ({ date: point.date, value: point.conversions }))));
  }
  if (gsc.length) {
    out.organic_clicks = series(gsc.flatMap((item) => item.daily.current.map((point) => ({ date: point.date, value: point.clicks }))), gsc.flatMap((item) => item.daily.previousYear.map((point) => ({ date: point.date, value: point.clicks }))));
  }
  return out;
}

function unmeasuredDashboard(filters: DashboardFilters, window: PeriodWindow, generatedAt: string): DashboardPayload {
  const brand = findBrand(filters.project);
  const note = brand ? `${brand.name} se incorpora en la ola ${brand.wave} de la expansión.` : "Marca sin serie analítica en V2.";
  return dashboardPayloadSchema.parse({
    generatedAt,
    mode: "live",
    window,
    filters,
    metrics: [],
    projects: [],
    markets: [],
    executiveInsights: [],
    geo: { citationShare: 0, previousCitationShare: 0, citedPrompts: 0, totalPrompts: 0, aiSessions: 0, aiConversions: 0, leadingAssistant: "—", topCitedDomain: "—" },
    actions: [],
    sources: SOURCES.map((source) => ({ source: source.key, label: source.label, status: "no_configurado" as const, lastValidSnapshot: null, cutoff: null, coverage: 0, note })),
    series: {},
    annotations: [],
    technicalIssues: [],
    opportunities: [],
    queryOpportunities: [],
    reports: [],
  });
}

// ---------------------------------------------------------------------------
// Composición del portfolio
// ---------------------------------------------------------------------------

/**
 * Traduce las cifras de una marca al contrato del portfolio. Objetivos a cero:
 * el plan de crecimiento por KPI no existe todavía como dato, y un objetivo
 * inventado es peor que ninguno (`aggregatePortfolio` descarta los de cero).
 */
function toBrandAnalytics({ figures, markets }: Loaded, cutoff: string): BrandAnalytics | null {
  if (!figures.ga4.ok) return null;
  const ga4 = figures.ga4.value.totals;
  const gsc = figures.gsc.ok ? figures.gsc.value.totals : null;
  const change = changePct(ga4.current.sessions, ga4.previous.sessions);
  return {
    sessions: ga4.current.sessions,
    clicks: gsc?.current?.clicks ?? 0,
    conversions: ga4.current.conversions,
    previousSessions: ga4.previous.sessions,
    previousYearSessions: ga4.previousYear.sessions,
    previousClicks: gsc?.previous?.clicks ?? 0,
    previousYearClicks: gsc?.previousYear?.clicks ?? 0,
    previousConversions: ga4.previous.conversions,
    previousYearConversions: ga4.previousYear.conversions,
    targetSessions: 0,
    targetClicks: 0,
    targetConversions: 0,
    visibility: 0,
    attention: attentionOf(change),
    coverage: {
      ratio: figures.gsc.ok ? 1 : 0.5,
      label: figures.gsc.ok ? "GA4 + GSC en directo · sin reconciliar" : "Solo GA4: Search Console no respondió",
      quality: figures.gsc.ok ? "completa" : "parcial",
      asOf: cutoff,
    },
    markets: markets.flatMap((market) =>
      market.ga4.ok
        ? [{
            code: market.code,
            name: marketName(market.code),
            sessions: market.ga4.value.current.sessions,
            clicks: market.gsc.ok ? (market.gsc.value.current ?? 0) : 0,
            conversions: market.ga4.value.current.conversions,
            previousSessions: market.ga4.value.previous.sessions,
            previousYearSessions: market.ga4.value.previousYear.sessions,
            visibility: 0,
            contributingBrands: 1,
          }]
        : [],
    ),
  };
}

