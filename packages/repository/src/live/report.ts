import { MARKETS, brandReportSchema, findBrand, type BrandReport, type MarketCode, type ReportWindow } from "@seo/contracts";
import { ga4MarketFilter, gscMarketFilters, reportMarketsOf, type MarketScope, type ResolvedLiveBrand } from "./brands";
import { gscFloor } from "./figures";
import { ga4Batch, gscQuery, type Env, type Ga4Report, type Ga4Request, type GscFilter, type GscRow } from "./google";
import { ctrCurve, normalizePath, potential } from "./opportunities";

/**
 * Informe ejecutivo de marca con dato real (D-037).
 *
 * Una sola función compone todo lo que ve dirección para una marca y un
 * periodo. Las cifras salen de GA4 (todos los canales, no solo el orgánico, para
 * poder comparar) y de Search Console; las lecturas y los próximos pasos, de
 * reglas fijas escritas aquí, a la vista, y declaradas como automáticas.
 *
 * Coherencia interna: dentro del informe «visitas desde buscadores» es el canal
 * `Organic Search` de GA4, el mismo que suma el reparto por canales. No se
 * mezcla con `sessionMedium = organic` (portada, D-034), que difiere en décimas:
 * dos definiciones en la misma página harían que los números no cuadraran.
 */

export type EditorialTarget = { id: string; month: string | null; title: string; type: string; status: string; keyword: string | null };

type Range = { startDate: string; endDate: string };
type Totals3<T> = { current: T; previous: T; previousYear: T };

const DAY = 86_400_000;
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const parse = (date: string) => Date.parse(`${date}T00:00:00Z`);
const addDays = (date: string, days: number) => iso(parse(date) + days * DAY);
const round1 = (value: number) => Math.round(value * 10) / 10;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const num = (value: string | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};
const pct = (value: number, base: number) => (base === 0 ? null : ((value - base) / base) * 100);
// Separador de miles también en cuatro cifras, como en la interfaz: «1.006», no «1006».
const fmt = (value: number) => new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" as unknown as boolean }).format(Math.round(value));
const fmtPct = (value: number) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(round1(value)).toLocaleString("es-ES")} %`;
const plural = (count: number, one: string, many: string) => `${count.toLocaleString("es-ES")} ${count === 1 ? one : many}`;
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const dayLabel = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
const longDate = (date: string) => `${Number(date.slice(8, 10))} de ${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} de ${date.slice(0, 4)}`;

/** Nombres de canal de GA4 en el idioma de quien lee el informe. */
const CHANNEL_LABELS: Record<string, string> = {
  "Organic Search": "Buscadores (SEO)",
  Direct: "Directo",
  Referral: "Enlaces de otras webs",
  "Paid Search": "Buscadores (pago)",
  "Organic Social": "Redes sociales",
  "Paid Social": "Redes sociales (pago)",
  Email: "Email",
  Unassigned: "Sin clasificar",
  "AI Assistant": "Asistentes de IA",
  "Cross-network": "Campañas multicanal",
  Display: "Display",
  "Organic Video": "Vídeo",
  "Organic Shopping": "Shopping orgánico",
  "Paid Shopping": "Shopping de pago",
  "Paid Video": "Vídeo de pago",
  Affiliates: "Afiliados",
  SMS: "SMS",
  "Mobile Push Notifications": "Notificaciones",
};

/** Orígenes de asistentes de IA conocidos en GA4 (`sessionSource`). */
const AI_ASSISTANTS = [
  { key: "chatgpt", label: "ChatGPT", pattern: /chatgpt|openai/i },
  { key: "gemini", label: "Gemini", pattern: /gemini\.google|bard\.google/i },
  { key: "perplexity", label: "Perplexity", pattern: /perplexity/i },
  { key: "copilot", label: "Copilot", pattern: /copilot/i },
  { key: "claude", label: "Claude", pattern: /claude\.ai|anthropic/i },
  { key: "deepseek", label: "DeepSeek", pattern: /deepseek/i },
  { key: "otros", label: "Otros asistentes", pattern: /meta\.ai|grok|mistral|poe\.com|you\.com|phind/i },
] as const;
const AI_SOURCE_FILTER = { filter: { fieldName: "sessionSource", stringFilter: { matchType: "PARTIAL_REGEXP", value: "chatgpt|openai|gemini\\.google|bard\\.google|perplexity|copilot|claude\\.ai|anthropic|deepseek|meta\\.ai|grok|mistral|poe\\.com|you\\.com|phind", caseSensitive: false } } };

const ORGANIC_CHANNEL = { filter: { fieldName: "sessionDefaultChannelGroup", stringFilter: { matchType: "EXACT", value: "Organic Search" } } };
const and = (...expressions: Array<Record<string, unknown> | null>) => {
  const list = expressions.filter((item): item is Record<string, unknown> => item !== null);
  return list.length === 0 ? undefined : list.length === 1 ? list[0] : { andGroup: { expressions: list } };
};

/** Valor de una dimensión por nombre: con varios rangos GA4 añade `dateRange` y el orden no está garantizado. */
function reader(report: Ga4Report | undefined) {
  const names = (report?.dimensionHeaders ?? []).map((header) => header.name ?? "");
  return (row: NonNullable<Ga4Report["rows"]>[number], name: string) => row.dimensionValues?.[names.indexOf(name)]?.value ?? "";
}

function limiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= max) await new Promise<void>((resolve) => queue.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      queue.shift()?.();
    }
  };
}

// ---------------------------------------------------------------------------
// Auditoría de redirecciones de la migración
// ---------------------------------------------------------------------------

/**
 * Comprueba adónde lleva una URL antigua, salto a salto, sin seguir la
 * redirección automáticamente (para contar saltos y ver cada código).
 *
 * No es un crawl (D-037): como mucho 25 URLs, petición HEAD, sin descargar
 * cuerpos ni seguir enlaces. El crawl sigue siendo exclusivo del workbench.
 */
async function traceRedirects(url: string): Promise<{ status: number | null; location: string | null; hops: number; finalStatus: number | null; finalUrl: string | null }> {
  let current = url;
  let first: number | null = null;
  let firstLocation: string | null = null;
  for (let hop = 0; hop < 6; hop += 1) {
    let response: Response;
    try {
      response = await fetch(current, { method: "HEAD", redirect: "manual", headers: { "user-agent": "SEO-Intelligence/1.0 (auditoria de redirecciones)" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (response.status === 405) response = await fetch(current, { method: "GET", redirect: "manual", headers: { "user-agent": "SEO-Intelligence/1.0 (auditoria de redirecciones)" }, signal: AbortSignal.timeout(6000), cache: "no-store" });
    } catch {
      return { status: first, location: firstLocation, hops: hop, finalStatus: null, finalUrl: null };
    }
    if (first === null) first = response.status;
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, current).toString();
      if (firstLocation === null) firstLocation = next;
      current = next;
      continue;
    }
    return { status: first, location: firstLocation, hops: hop, finalStatus: response.status, finalUrl: current };
  }
  return { status: first, location: firstLocation, hops: 6, finalStatus: null, finalUrl: current };
}

/**
 * Memoria de lo que no depende del periodo elegido: la auditoría de la migración
 * (ventanas fijas alrededor de su fecha) y la situación de las piezas
 * editoriales (últimos 90 días). Sin ella, cambiar el periodo repetía ~45
 * consultas y 25 comprobaciones HTTP idénticas. Un fallo no se guarda.
 */
const shared = new Map<string, { expiresAt: number; value: Promise<unknown> }>();
function once<T>(key: string, run: () => Promise<T>): Promise<T> {
  const hit = shared.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.value as Promise<T>;
  const value = run();
  shared.set(key, { expiresAt: Date.now() + 6 * 60 * 60 * 1000, value });
  value.catch(() => shared.delete(key));
  return value;
}

/**
 * Filtros GSC para la búsqueda objetivo de una pieza: todas sus palabras
 * significativas, en cualquier orden, con o sin tilde y en singular o plural.
 * La coincidencia exacta perdía «fachada ventilada porcelanico» (sin tilde) o
 * «porcelanico exterior gran formato» (otro orden), y declaraba «terreno nuevo»
 * lo que ya tenía presencia.
 */
const STOPWORDS = new Set(["para", "como", "cómo", "sobre", "entre", "desde", "hasta", "sin", "con", "del", "los", "las", "una", "que", "qué", "and", "the", "for", "with"]);
const ACCENTS: Record<string, string> = { a: "[aá]", e: "[eé]", i: "[ií]", o: "[oó]", u: "[uúü]", n: "[nñ]" };
export function keywordFilters(keyword: string): GscFilter[] {
  const words = keyword.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((word) => word.length > 2 && !STOPWORDS.has(word));
  return words.slice(0, 5).map((word) => {
    // Raíz sin plural ni vocal de género: «porcelánico» también encuentra «porcelánicas».
    const stem = word.length > 4 ? word.replace(/(os|as|es|o|a|s)$/, "") : word;
    return { dimension: "query" as const, operator: "includingRegex" as const, expression: `(?i)${[...stem].map((char) => ACCENTS[char] ?? char).join("")}` };
  });
}

const comparableUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${normalizePath(parsed.pathname)}`;
  } catch {
    return normalizePath(url);
  }
};

const EXPLORER_QUERY_LIMIT = 3000;
const EXPLORER_PAGE_LIMIT = 5000;

/**
 * Expone las muestras ya consultadas a GSC, sin nuevas peticiones ni recortes de
 * oportunidad. Mantiene la URL completa: dos hosts o parámetros distintos no
 * son la misma fila. Una ausencia en la muestra anterior nunca significa cero.
 */
export function buildReportExplorers(input: {
  queryPagesNonBrand: GscRow[] | null;
  pagesNow: GscRow[] | null;
  pagesBefore: GscRow[] | null;
}): Pick<BrandReport, "searchQueries" | "pages" | "explorerCoverage"> {
  const metrics = (row: GscRow) => ({ clicks: row.clicks, impressions: row.impressions, position: row.position, ctr: row.ctr * 100 });
  const searchQueries = (input.queryPagesNonBrand ?? []).flatMap((row) => {
    const [query, page] = row.keys ?? [];
    return query && page ? [{ query, page, ...metrics(row) }] : [];
  });
  const previous = new Map((input.pagesBefore ?? []).map((row) => [row.keys?.[0], row.clicks]));
  const pages = (input.pagesNow ?? []).flatMap((row) => {
    const page = row.keys?.[0];
    return page ? [{ page, ...metrics(row), previousClicks: previous.get(page) ?? null }] : [];
  });
  const coverage = (rows: GscRow[] | null, rowLimit: number) => ({
    rowLimit,
    rowsReturned: rows?.length ?? 0,
    available: rows !== null,
    limitReached: (rows?.length ?? 0) >= rowLimit,
  });
  return {
    searchQueries,
    pages,
    explorerCoverage: {
      searchQueries: { scope: "non_brand_query_page", ...coverage(input.queryPagesNonBrand, EXPLORER_QUERY_LIMIT) },
      pages: { scope: "all_pages", ...coverage(input.pagesNow, EXPLORER_PAGE_LIMIT) },
      previousPages: { scope: "all_pages", ...coverage(input.pagesBefore, EXPLORER_PAGE_LIMIT) },
    },
  };
}

/** Conserva por separado el resultado de la comprobación y sus cifras, incluso sin coincidencias. */
export function buildReportEditorialRow({ target, rows, checked }: { target: EditorialTarget; rows: GscRow[]; checked: boolean }): BrandReport["editorial"][number] {
  const impressions = sum(rows.map((row) => row.impressions));
  const clicks = sum(rows.map((row) => row.clicks));
  const position = impressions ? round1(sum(rows.map((row) => row.position * row.impressions)) / impressions) : null;
  const best = [...rows].sort((a, b) => b.impressions - a.impressions)[0];
  const situation: BrandReport["editorial"][number]["situation"] = !checked || impressions < 10 || position === null ? "sin-presencia" : position <= 3 ? "ya-top" : position <= 10 ? "cerca" : "lejos";
  const advice = {
    "sin-presencia": checked ? "Hoy no aparecemos en Google para esta búsqueda: la pieza parte de cero." : "Sin dato de Search Console para esta búsqueda.",
    "ya-top": "Ya somos top 3 con otra página: reforzar esa URL o cambiar el enfoque para no competir con nosotros mismos.",
    cerca: "Estamos en primera página: la pieza puede subirnos al top 3 si enlaza con la URL que ya posiciona.",
    lejos: "Hay presencia, pero lejos del top: la pieza tiene recorrido.",
  }[situation];
  return { ...target, measured: checked, position, clicks, impressions, page: best?.keys?.[0] ? new URL(best.keys[0]).pathname : null, situation, advice };
}

// ---------------------------------------------------------------------------
// Informe
// ---------------------------------------------------------------------------

export async function buildBrandReport(input: {
  env: Env;
  brand: ResolvedLiveBrand;
  market: string;
  window: ReportWindow;
  cutoff: string;
  editorial: readonly EditorialTarget[];
  now?: Date;
}): Promise<BrandReport> {
  const { env, brand, window, cutoff } = input;
  const meta = findBrand(brand.slug)!;
  const floor = gscFloor(cutoff);
  const allMarkets = reportMarketsOf(brand);
  // Un mercado que la marca no tiene no filtra en silencio: el informe vuelve a «todos» y lo declara en `market`.
  const selectedMarket = input.market === "all" ? null : (allMarkets.find((item) => item.code === input.market) ?? null);
  const market = selectedMarket?.code ?? "all";
  const scope: MarketScope | null = selectedMarket?.scope ?? null;
  const scopeGa4 = ga4MarketFilter(brand, scope);
  const scopeGsc = gscMarketFilters(brand, scope);
  const gscSlot = limiter(10);

  const ranges: Totals3<Range> = {
    current: { startDate: window.start, endDate: window.end },
    previous: { startDate: window.previousStart, endDate: window.previousEnd },
    previousYear: { startDate: window.previousYearStart, endDate: window.previousYearEnd },
  };
  const named = [{ ...ranges.current, name: "current" }, { ...ranges.previous, name: "previous" }, { ...ranges.previousYear, name: "previousYear" }];
  /** El periodo actual se recorta al suelo de GSC; una comparación incompleta se anula (D-034). */
  const gscRange = (range: Range, clip: boolean): Range | null => {
    const start = clip && range.startDate < floor ? floor : range.startDate;
    return start < floor || start > range.endDate ? null : { startDate: start, endDate: range.endDate };
  };
  const gscRanges: Totals3<Range | null> = { current: gscRange(ranges.current, true), previous: gscRange(ranges.previous, false), previousYear: gscRange(ranges.previousYear, false) };

  const sources: BrandReport["sources"] = [];

  // ---- GA4 -----------------------------------------------------------------
  const endMonth = window.end.slice(0, 7);
  const [ey, em] = endMonth.split("-").map(Number) as [number, number];
  const lastCompleteMonth = addDays(window.end, 1).slice(0, 7) !== endMonth ? endMonth : iso(Date.UTC(ey, em - 2, 1)).slice(0, 7);
  const [ly, lm] = lastCompleteMonth.split("-").map(Number) as [number, number];
  const monthsStart = iso(Date.UTC(ly, lm - 24, 1));
  const monthsEnd = iso(Date.UTC(ly, lm, 0));

  const organicScope = and(ORGANIC_CHANNEL, scopeGa4);
  // Todos los canales, mismo mercado: pestaña «Tráfico total» del gráfico de evolución.
  const webDaily = (range: Range): Ga4Request => ({ dateRanges: [range], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], dimensionFilter: and(scopeGa4), limit: "1000" });
  const daily = (range: Range): Ga4Request => ({ dateRanges: [range], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "totalUsers" }], dimensionFilter: organicScope, limit: "1000" });

  let ga4: Ga4Report[] = [];
  let ga4Markets: Ga4Report[] = [];
  let ga4Ok = true;
  if (!brand.propertyId) {
    ga4Ok = false;
    sources.push({ source: "ga4", ok: false, note: `Falta ${brand.propertyEnv}` });
  } else {
    try {
      [ga4, ga4Markets] = await Promise.all([
        ga4Batch(env, brand.propertyId, [
          { dateRanges: named, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }, { name: "keyEvents" }, { name: "totalUsers" }, { name: "newUsers" }], dimensionFilter: and(scopeGa4), limit: "100" },
          daily(ranges.current),
          daily(ranges.previous),
          daily(ranges.previousYear),
          { dateRanges: [{ startDate: monthsStart, endDate: monthsEnd }], dimensions: [{ name: "yearMonth" }], metrics: [{ name: "sessions" }], dimensionFilter: organicScope, limit: "100" },
          { dateRanges: [ranges.current], dimensions: [{ name: "landingPage" }], metrics: [{ name: "sessions" }, { name: "keyEvents" }], dimensionFilter: organicScope, orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }], limit: "300" },
          { dateRanges: [ranges.current], dimensions: [{ name: "eventName" }], metrics: [{ name: "keyEvents" }], dimensionFilter: organicScope, orderBys: [{ metric: { metricName: "keyEvents" }, desc: true }], limit: "20" },
          // Buscador de origen de las visitas orgánicas: explica la distancia con Search Console (D-045).
          { dateRanges: named, dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }], dimensionFilter: organicScope, orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: "150" },
          // Visitas desde asistentes de IA, de cualquier canal (D-046).
          { dateRanges: named, dimensions: [{ name: "sessionSource" }], metrics: [{ name: "sessions" }], dimensionFilter: and(AI_SOURCE_FILTER, scopeGa4), limit: "100" },
          webDaily(ranges.current),
          webDaily(ranges.previous),
          webDaily(ranges.previousYear),
          // Visitas diarias por canal del periodo actual: mini gráfica de cada canal.
          { dateRanges: [ranges.current], dimensions: [{ name: "date" }, { name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], dimensionFilter: and(scopeGa4), limit: "10000" },
        ]),
        ga4Batch(env, brand.propertyId, allMarkets.map((item) => ({ dateRanges: named, metrics: [{ name: "sessions" }, { name: "keyEvents" }], dimensionFilter: and(ORGANIC_CHANNEL, ga4MarketFilter(brand, item.scope)) }))),
      ]);
      sources.push({ source: "ga4", ok: true, note: "Todos los canales · lectura directa" });
    } catch (error) {
      ga4Ok = false;
      sources.push({ source: "ga4", ok: false, note: error instanceof Error ? error.message : String(error) });
    }
  }
  const [channelReport, dailyCurrent, dailyPrevious, dailyPreviousYear, monthlyReport, landingReport, eventReport, sourceReport, aiReport, webDailyCurrent, webDailyPrevious, webDailyPreviousYear, channelDailyReport] = ga4;

  // ---- GSC -----------------------------------------------------------------
  const site = brand.siteUrl;
  const nonBrand: GscFilter = { dimension: "query", operator: "excludingRegex", expression: `(?i)(${brand.brandRegex})` };
  const isBrand: GscFilter = { dimension: "query", operator: "includingRegex", expression: `(?i)(${brand.brandRegex})` };
  const q = (request: Parameters<typeof gscQuery>[2]) => (site ? gscSlot(() => gscQuery(env, site, request)) : Promise.resolve([] as GscRow[]));
  const opt = <T,>(range: Range | null, run: (range: Range) => Promise<T>) => (range ? run(range) : Promise.resolve(null));

  const editorialRange = { startDate: addDays(cutoff, -89), endDate: cutoff };
  /*
   * Solo se cruzan con Google las piezas que aún importan —desde el mes pasado
   * en adelante— y como mucho 20: Porcelanosa tiene más de cien piezas y una
   * consulta por pieza agotaba la cuota de carga de Search Console.
   */
  const lastMonth = iso(Date.UTC(Number(cutoff.slice(0, 4)), Number(cutoff.slice(5, 7)) - 2, 1)).slice(0, 7);
  const editorialTargets = input.editorial
    .filter((target) => !target.month || target.month >= lastMonth)
    .sort((a, b) => (a.month ?? "9999").localeCompare(b.month ?? "9999"))
    .slice(0, 20);
  const topLandingPaths = (landingReport?.rows ?? [])
    .map((row) => ({ path: normalizePath(row.dimensionValues?.[0]?.value ?? ""), leads: num(row.metricValues?.[1]?.value) }))
    .filter((row) => row.leads > 0 && row.path.startsWith("/"))
    .sort((a, b) => b.leads - a.leads)
    .map((row) => row.path)
    .filter((path, index, list) => list.indexOf(path) === index)
    .slice(0, 8);
  const migrationAnnotation = (brand.annotations ?? []).filter((item) => item.type === "migracion" && item.date <= cutoff).at(-1) ?? null;
  const migrationSpan = migrationAnnotation ? Math.min(90, Math.round((parse(cutoff) - parse(migrationAnnotation.date)) / DAY) + 1) : 0;
  const migrationWindows = migrationAnnotation
    ? { before: { startDate: addDays(migrationAnnotation.date, -migrationSpan), endDate: addDays(migrationAnnotation.date, -1) }, after: { startDate: migrationAnnotation.date, endDate: addDays(migrationAnnotation.date, migrationSpan - 1) } }
    : null;

  type GscData = {
    totals: Totals3<GscRow[] | null>;
    branded: Totals3<GscRow[] | null>;
    nonBranded: Totals3<GscRow[] | null>;
    daily: Totals3<GscRow[] | null>;
    monthly: GscRow[];
    pagesNow: GscRow[] | null;
    pagesBefore: GscRow[] | null;
    queryPagesNonBrand: GscRow[] | null;
    queryPagesAll: GscRow[];
    markets: Array<{ current: GscRow[] | null; previous: GscRow[] | null }>;
    migration: { before: GscRow[]; after: GscRow[] } | null;
    editorial: Array<{ target: EditorialTarget; rows: GscRow[]; checked: boolean }>;
    images: GscRow[] | null;
    keywordsNow: GscRow[] | null;
    keywordsBefore: GscRow[] | null;
  };
  let gsc: GscData | null = null;
  if (!site) sources.push({ source: "gsc", ok: false, note: `Falta ${brand.siteEnv}` });
  else {
    try {
      const three = (filters: GscFilter[], dimensions: Array<"date" | "page" | "query"> = []) => Promise.all([
        opt(gscRanges.current, (range) => q({ ...range, filters, dimensions, rowLimit: 1000 })),
        opt(gscRanges.previous, (range) => q({ ...range, filters, dimensions, rowLimit: 1000 })),
        opt(gscRanges.previousYear, (range) => q({ ...range, filters, dimensions, rowLimit: 1000 })),
      ]).then(([current, previous, previousYear]) => ({ current, previous, previousYear }));
      const keywordsOf = (keyword: string | null) => (keyword ?? "").split("/").map((item) => item.trim().toLowerCase()).filter(Boolean).slice(0, 2);
      const [totals, branded, nonBranded, dailyClicks, monthly, pagesNow, pagesBefore, queryPagesNonBrand, queryPagesAll, markets, migration, editorial, images, keywordsNow, keywordsBefore] = await Promise.all([
        three(scopeGsc),
        three([...scopeGsc, isBrand]),
        three([...scopeGsc, nonBrand]),
        three(scopeGsc, ["date"]),
        q({ startDate: floor, endDate: cutoff, dimensions: ["date"], filters: scopeGsc, rowLimit: 1000 }),
        /* Lo que sigue es secundario: si Search Console corta por cuota en uno de
           estos bloques, el bloque sale vacío y los indicadores siguen en pie. */
        opt(gscRanges.current, (range) => q({ ...range, dimensions: ["page"], filters: scopeGsc, rowLimit: EXPLORER_PAGE_LIMIT })).catch(() => null),
        opt(gscRanges.previous, (range) => q({ ...range, dimensions: ["page"], filters: scopeGsc, rowLimit: EXPLORER_PAGE_LIMIT })).catch(() => null),
        opt(gscRanges.current, (range) => q({ ...range, dimensions: ["query", "page"], filters: [...scopeGsc, nonBrand], rowLimit: EXPLORER_QUERY_LIMIT })).catch(() => null),
        // Búsquedas de las páginas que convierten, página a página: un volcado búsqueda × página agota la cuota de carga de un sitio grande.
        Promise.all(topLandingPaths.map((path) => (gscRanges.current ? q({ ...gscRanges.current, dimensions: ["query"], filters: [{ dimension: "page", operator: "includingRegex", expression: `^https?://[^/]+${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/?([?#].*)?$` }], rowLimit: 10 }) : Promise.resolve([] as GscRow[])).then((rows) => rows.map((row) => ({ ...row, keys: [row.keys?.[0] ?? "", `https://x${path}`] }))).catch(() => [] as GscRow[]))).then((lists) => lists.flat()),
        // Tier 1 con clics actuales y anteriores; el resto solo actuales, para no multiplicar las consultas en sitios con muchos mercados.
        Promise.all(allMarkets.map((item) => {
          const filters = gscMarketFilters(brand, item.scope);
          return Promise.all([opt(gscRanges.current, (range) => q({ ...range, filters })), item.tier1 ? opt(gscRanges.previous, (range) => q({ ...range, filters })) : Promise.resolve(null)]).then(([current, previous]) => ({ current, previous })).catch(() => ({ current: null, previous: null }));
        })),
        migrationWindows
          ? once(`migration:${brand.slug}:${cutoff}`, () => Promise.all([q({ ...migrationWindows.before, dimensions: ["page"], rowLimit: 5000 }), q({ ...migrationWindows.after, dimensions: ["page"], rowLimit: 5000 })]).then(([before, after]) => ({ before, after }))).catch(() => null)
          : Promise.resolve(null),
        Promise.all(editorialTargets.map((target) => once(`editorial:${brand.slug}:${cutoff}:${JSON.stringify(scopeGsc)}:${target.keyword}`, async () => {
          const rows = (await Promise.all(keywordsOf(target.keyword).map((keyword) => q({ ...editorialRange, dimensions: ["page"], filters: [...scopeGsc, ...keywordFilters(keyword)], rowLimit: 20 })))).flat();
          return rows;
        }).then((rows) => ({ target, rows, checked: keywordsOf(target.keyword).length > 0 })).catch(() => ({ target, rows: [] as GscRow[], checked: false })))),
        // Clics de Google Imágenes: llegan a GA4 como google/organic pero no suman en la búsqueda web (D-045).
        opt(gscRanges.current, (range) => q({ ...range, filters: scopeGsc, type: "image" })).catch(() => null),
        // Keywords posicionadas y su reparto por posición (D-045).
        opt(gscRanges.current, (range) => allQueries(q, { ...range, dimensions: ["query"], filters: scopeGsc })).catch(() => null),
        opt(gscRanges.previous, (range) => allQueries(q, { ...range, dimensions: ["query"], filters: scopeGsc })).catch(() => null),
      ]);
      gsc = { totals, branded, nonBranded, daily: dailyClicks, monthly, pagesNow, pagesBefore, queryPagesNonBrand, queryPagesAll, markets, migration, editorial, images, keywordsNow, keywordsBefore };
      sources.push({ source: "gsc", ok: true, note: `Lectura directa · Search Console conserva desde el ${longDate(floor)}` });
    } catch (error) {
      sources.push({ source: "gsc", ok: false, note: error instanceof Error ? error.message : String(error) });
    }
  }

  // ---- Canales y KPI de GA4 -----------------------------------------------
  const readCh = reader(channelReport);
  const channelMap = new Map<string, { current: number; previous: number; previousYear: number; leads: number }>();
  for (const row of channelReport?.rows ?? []) {
    const key = readCh(row, "sessionDefaultChannelGroup");
    const range = readCh(row, "dateRange") as keyof Totals3<number>;
    const entry = channelMap.get(key) ?? { current: 0, previous: 0, previousYear: 0, leads: 0 };
    entry[range] = num(row.metricValues?.[0]?.value);
    if (range === "current") entry.leads = num(row.metricValues?.[1]?.value);
    channelMap.set(key, entry);
  }
  const leadsBy = (range: keyof Totals3<number>) => {
    const row = (channelReport?.rows ?? []).find((item) => readCh(item, "sessionDefaultChannelGroup") === "Organic Search" && readCh(item, "dateRange") === range);
    return num(row?.metricValues?.[1]?.value);
  };
  /* Usuarios del canal orgánico por periodo. No se suman entre canales: una
     persona que llega por dos canales cuenta en ambos. */
  const usersBy = (range: keyof Totals3<number>) => {
    const row = (channelReport?.rows ?? []).find((item) => readCh(item, "sessionDefaultChannelGroup") === "Organic Search" && readCh(item, "dateRange") === range);
    return num(row?.metricValues?.[2]?.value);
  };
  const newUsersBy = (range: keyof Totals3<number>) => {
    const row = (channelReport?.rows ?? []).find((item) => readCh(item, "sessionDefaultChannelGroup") === "Organic Search" && readCh(item, "dateRange") === range);
    return num(row?.metricValues?.[3]?.value);
  };
  const webTotal = (range: keyof Totals3<number>) => sum([...channelMap.values()].map((entry) => entry[range]));
  const organic = channelMap.get("Organic Search") ?? { current: 0, previous: 0, previousYear: 0, leads: 0 };
  const channels: BrandReport["channels"] = [...channelMap]
    .map(([key, entry]) => ({ key, label: CHANNEL_LABELS[key] ?? key, sessions: entry.current, previous: entry.previous, previousYear: entry.previousYear, leads: entry.leads, share: webTotal("current") ? round1((entry.current / webTotal("current")) * 100) : 0, trend: [] as number[] }))
    .filter((entry) => entry.sessions > 0 || entry.previous > 0)
    .sort((a, b) => b.sessions - a.sessions);

  // ---- KPI de GSC ------------------------------------------------------------
  const clicksOf = (rows: GscRow[] | null | undefined) => (rows ? sum(rows.map((row) => row.clicks)) : null);
  const impressionsOf = (rows: GscRow[] | null | undefined) => (rows ? sum(rows.map((row) => row.impressions)) : null);
  const gscTotal = (range: keyof Totals3<number>) => ({ clicks: clicksOf(gsc?.totals[range]), impressions: impressionsOf(gsc?.totals[range]) });
  const nonBrandShare = (range: keyof Totals3<number>) => {
    const brandClicks = clicksOf(gsc?.branded[range]);
    const nonBrandClicks = clicksOf(gsc?.nonBranded[range]);
    if (brandClicks === null || nonBrandClicks === null || brandClicks + nonBrandClicks === 0) return null;
    return round1((nonBrandClicks / (brandClicks + nonBrandClicks)) * 100);
  };
  const ctr = (range: keyof Totals3<number>) => {
    const total = gscTotal(range);
    return total.clicks === null || !total.impressions ? null : Math.round((total.clicks / total.impressions) * 10000) / 100;
  };
  const ga4Value = (value: number) => (ga4Ok ? value : null);

  const kpis: BrandReport["kpis"] = [
    { key: "web_sessions", label: "Visitas totales a la web", help: "Todas las visitas, vengan del canal que vengan (Analytics).", unit: "number", value: ga4Value(webTotal("current")), previous: ga4Value(webTotal("previous")), previousYear: ga4Value(webTotal("previousYear")), source: "ga4" },
    { key: "search_sessions", label: "Visitas desde buscadores", help: "Visitas que llegan desde Google o Bing sin pagar (Analytics).", unit: "number", value: ga4Value(organic.current), previous: ga4Value(organic.previous), previousYear: ga4Value(organic.previousYear), source: "ga4" },
    { key: "search_users", label: "Personas desde buscadores", help: "Personas distintas que llegan desde buscadores sin pagar; una persona puede hacer varias visitas (Analytics).", unit: "number", value: ga4Value(usersBy("current")), previous: ga4Value(usersBy("previous")), previousYear: ga4Value(usersBy("previousYear")), source: "ga4" },
    { key: "search_leads", label: "Conversiones desde buscadores", help: "Acciones clave de las visitas de buscadores: solicitudes de información, muestras, contacto.", unit: "number", value: ga4Value(leadsBy("current")), previous: ga4Value(leadsBy("previous")), previousYear: ga4Value(leadsBy("previousYear")), source: "ga4" },
    { key: "nonbrand_share", label: "Búsquedas sin marca", help: "Parte de los clics que llega por búsquedas genéricas, de gente que aún no busca la marca.", unit: "percent", value: nonBrandShare("current"), previous: nonBrandShare("previous"), previousYear: nonBrandShare("previousYear"), source: "gsc" },
    { key: "clicks", label: "Clics en Google", help: "Personas que hicieron clic en un resultado nuestro (Search Console).", unit: "number", value: gscTotal("current").clicks, previous: gscTotal("previous").clicks, previousYear: gscTotal("previousYear").clicks, source: "gsc" },
    { key: "impressions", label: "Apariciones en Google", help: "Veces que salimos en los resultados, hagan clic o no.", unit: "number", value: gscTotal("current").impressions, previous: gscTotal("previous").impressions, previousYear: gscTotal("previousYear").impressions, source: "gsc" },
    { key: "ctr", label: "% que nos elige", help: "De cada 100 apariciones, cuántas acaban en clic.", unit: "percent", value: ctr("current"), previous: ctr("previous"), previousYear: ctr("previousYear"), source: "gsc" },
  ];

  // ---- Conciliación GA4 ↔ Search Console (D-045) -----------------------------
  const readSource = reader(sourceReport);
  const searchReconciliation =
    ga4Ok && sourceReport
      ? buildSearchReconciliation(
          (sourceReport.rows ?? []).map((row) => ({ source: readSource(row, "sessionSource"), range: readSource(row, "dateRange"), sessions: num(row.metricValues?.[0]?.value) })),
          organic.current,
          gscTotal("current").clicks,
          gsc?.images ? clicksOf(gsc.images) : null,
        )
      : null;

  const readAi = reader(aiReport);
  const aiTraffic =
    ga4Ok && aiReport
      ? buildAiTraffic(
          (aiReport.rows ?? []).map((row) => ({ source: readAi(row, "sessionSource"), range: readAi(row, "dateRange"), sessions: num(row.metricValues?.[0]?.value) })),
        )
      : null;
  const userMix = ga4Ok && channelReport ? buildUserMix(usersBy("current"), newUsersBy("current"), usersBy("previous"), newUsersBy("previous")) : null;
  const keywordRanking = gsc?.keywordsNow ? buildKeywordRanking(gsc.keywordsNow, gsc.keywordsBefore, brand.brandRegex) : null;

  // ---- Series comparables ----------------------------------------------------
  const bucketOf = (date: string, index: number) => {
    if (window.granularity === "day") return { key: date, label: dayLabel(date) };
    if (window.granularity === "week") {
      const start = addDays(window.start, Math.floor(index / 7) * 7);
      return { key: start, label: dayLabel(start) };
    }
    return { key: `${date.slice(0, 7)}-01`, label: `${MONTHS[Number(date.slice(5, 7)) - 1]} ${date.slice(2, 4)}` };
  };
  const indexOf = (rows: Array<{ date: string; value: number }>) => new Map(rows.map((row) => [row.date, row.value]));
  const series = (current: Map<string, number> | null, previous: Map<string, number> | null, previousYear: Map<string, number> | null) => {
    const buckets = new Map<string, { label: string; current: number | null; previous: number | null; previousYear: number | null }>();
    const add = (bucket: { current: number | null }, key: "current" | "previous" | "previousYear", value: number | undefined) => {
      if (value === undefined) return;
      const target = bucket as Record<typeof key, number | null>;
      target[key] = (target[key] ?? 0) + value;
    };
    for (let index = 0; index < window.days; index += 1) {
      const date = addDays(window.start, index);
      const { key, label } = bucketOf(date, index);
      const bucket = buckets.get(key) ?? { label, current: null, previous: null, previousYear: null };
      add(bucket, "current", current?.get(date));
      add(bucket, "previous", previous?.get(addDays(window.previousStart, index)));
      // Por posición: sirve igual para «misma fecha» y para «mismo día de la semana».
      add(bucket, "previousYear", previousYear?.get(addDays(window.previousYearStart, index)));
      buckets.set(key, bucket);
    }
    return [...buckets].map(([bucket, value]) => ({ bucket, ...value }));
  };
  const ga4Daily = (report: Ga4Report | undefined, metricIndex = 0) => (report ? indexOf((report.rows ?? []).map((row) => { const raw = row.dimensionValues?.[0]?.value ?? ""; return { date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, value: num(row.metricValues?.[metricIndex]?.value) }; })) : null);
  const gscDaily = (rows: GscRow[] | null | undefined, field: "clicks" | "impressions" = "clicks") => (rows ? indexOf(rows.map((row) => ({ date: row.keys?.[0] ?? "", value: row[field] }))) : null);
  const searchSeries = ga4Ok ? series(ga4Daily(dailyCurrent), ga4Daily(dailyPrevious), ga4Daily(dailyPreviousYear)) : [];
  /* Media diaria por tramo: el último tramo suele estar incompleto y su suma
     caería sin que cayera el tráfico (D-045). */
  const dailyAverages = (points: ReturnType<typeof series>) =>
    points.flatMap((point, index) => {
      if (point.current === null) return [];
      const next = points[index + 1]?.bucket;
      const stop = next ? Date.parse(`${next}T00:00:00Z`) : Date.parse(`${window.end}T00:00:00Z`) + 86_400_000;
      const days = Math.max(1, Math.round((stop - Date.parse(`${point.bucket}T00:00:00Z`)) / 86_400_000));
      return [round1(point.current / days)];
    });
  const readChannelDay = reader(channelDailyReport);
  const channelDays = new Map<string, Array<{ date: string; value: number }>>();
  for (const row of channelDailyReport?.rows ?? []) {
    const raw = readChannelDay(row, "date");
    const list = channelDays.get(readChannelDay(row, "sessionDefaultChannelGroup")) ?? [];
    list.push({ date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`, value: num(row.metricValues?.[0]?.value) });
    channelDays.set(readChannelDay(row, "sessionDefaultChannelGroup"), list);
  }
  for (const channel of channels) {
    const days = channelDays.get(channel.key);
    channel.trend = days ? dailyAverages(series(indexOf(days), null, null)) : [];
  }
  const webSeries = ga4Ok ? series(ga4Daily(webDailyCurrent), ga4Daily(webDailyPrevious), ga4Daily(webDailyPreviousYear)) : [];
  const usersSeries = ga4Ok ? series(ga4Daily(dailyCurrent, 1), ga4Daily(dailyPrevious, 1), ga4Daily(dailyPreviousYear, 1)) : [];
  const clickSeries = gsc ? series(gscDaily(gsc.daily.current), gscDaily(gsc.daily.previous), gscDaily(gsc.daily.previousYear)) : [];
  const impressionsSeries = gsc ? series(gscDaily(gsc.daily.current, "impressions"), gscDaily(gsc.daily.previous, "impressions"), gscDaily(gsc.daily.previousYear, "impressions")) : [];

  // ---- Mes a mes, año contra año ---------------------------------------------
  const monthlySessions = new Map<string, number>((monthlyReport?.rows ?? []).map((row) => { const raw = row.dimensionValues?.[0]?.value ?? ""; return [`${raw.slice(0, 4)}-${raw.slice(4, 6)}`, num(row.metricValues?.[0]?.value)]; }));
  const monthlyClicks = new Map<string, number>();
  for (const row of gsc?.monthly ?? []) {
    const month = (row.keys?.[0] ?? "").slice(0, 7);
    monthlyClicks.set(month, (monthlyClicks.get(month) ?? 0) + row.clicks);
  }
  const floorMonth = floor.slice(8, 10) === "01" ? floor.slice(0, 7) : iso(Date.UTC(Number(floor.slice(0, 4)), Number(floor.slice(5, 7)), 1)).slice(0, 7);
  const months: BrandReport["months"] = Array.from({ length: 12 }, (_, offset) => {
    const month = iso(Date.UTC(ly, lm - 12 + offset, 1)).slice(0, 7);
    const previousYearMonth = `${Number(month.slice(0, 4)) - 1}${month.slice(4)}`;
    const clicksFor = (key: string) => (key >= floorMonth ? (monthlyClicks.get(key) ?? 0) : null);
    return {
      month,
      label: `${MONTHS[Number(month.slice(5, 7)) - 1]} ${month.slice(2, 4)}`,
      searchSessions: ga4Ok ? (monthlySessions.get(month) ?? 0) : null,
      searchSessionsPreviousYear: ga4Ok ? (monthlySessions.get(previousYearMonth) ?? 0) : null,
      clicks: gsc ? clicksFor(month) : null,
      clicksPreviousYear: gsc ? clicksFor(previousYearMonth) : null,
    };
  });

  // ---- Embudo y conversiones ---------------------------------------------------
  const eventRows = (eventReport?.rows ?? []).map((row) => ({ name: row.dimensionValues?.[0]?.value ?? "", value: num(row.metricValues?.[0]?.value) })).filter((row) => row.value > 0);
  const eventTotal = sum(eventRows.map((row) => row.value));
  const funnel: BrandReport["funnel"] = {
    impressions: gscTotal("current").impressions,
    clicks: gscTotal("current").clicks,
    searchSessions: organic.current,
    leads: leadsBy("current"),
    leadEvent: eventRows[0]?.name ?? null,
    leadEventShare: eventRows[0] && eventTotal ? round1((eventRows[0].value / eventTotal) * 100) : null,
  };

  // ---- Mercados -------------------------------------------------------------------
  const marketRows: BrandReport["markets"] = allMarkets.map((item, index) => {
    const market = { code: item.code, ...item.scope };
    const report = ga4Markets[index];
    const read = reader(report);
    const value = (range: string, metric: number) => num((report?.rows ?? []).find((row) => read(row, "dateRange") === range)?.metricValues?.[metric]?.value);
    const gscMarket = gsc?.markets[index];
    return {
      code: market.code,
      name: item.name ?? MARKETS.find((entry) => entry.code === market.code)?.name ?? market.code,
      tier1: item.tier1,
      definition: `${market.pathPrefix ? `/${market.pathPrefix}` : "raíz del dominio"}${market.country ? ` + usuarios de ${MARKETS.find((entry) => entry.code === market.code)?.name ?? market.code}` : ""}`,
      sessions: value("current", 0),
      previous: value("previous", 0),
      previousYear: value("previousYear", 0),
      leads: value("current", 1),
      clicks: clicksOf(gscMarket?.current),
      clicksPrevious: clicksOf(gscMarket?.previous),
    };
  });

  // ---- Oportunidades de búsquedas genéricas -----------------------------------------
  const excluded = brand.opportunityExcludeRegex ? new RegExp(brand.opportunityExcludeRegex, "i") : null;
  const byQuery = new Map<string, { clicks: number; impressions: number; weighted: number; page: string | null; pageImpressions: number }>();
  for (const row of gsc?.queryPagesNonBrand ?? []) {
    const [query, page] = row.keys ?? [];
    if (!query || (excluded && excluded.test(query))) continue;
    const entry = byQuery.get(query) ?? { clicks: 0, impressions: 0, weighted: 0, page: null, pageImpressions: -1 };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weighted += row.position * row.impressions;
    if (page && row.impressions > entry.pageImpressions) { entry.page = new URL(page).pathname; entry.pageImpressions = row.impressions; }
    byQuery.set(query, entry);
  }
  const queryRows = [...byQuery].map(([query, entry]) => ({ query, ...entry, position: entry.impressions ? entry.weighted / entry.impressions : 0 }));
  const curve = ctrCurve(queryRows);
  const actionFor = (position: number, ctrValue: number, expected: number) =>
    position <= 3
      ? (ctrValue < expected ? "Ya estamos arriba pero nos eligen poco: reescribir título y descripción." : "Defender la posición: mantener la página actualizada.")
      : position <= 10
        ? "Estamos en primera página: reforzar contenido, título y enlaces internos para entrar en el top 3."
        : position <= 20
          ? "Segunda página: ampliar el contenido específico y enlazarlo desde páginas con tráfico."
          : "Poca presencia: crear una página o pieza dedicada.";
  const opportunities: BrandReport["opportunities"] = queryRows
    .filter((row) => row.impressions >= Math.max(50, window.days * 3) && row.position <= 30)
    .map((row) => {
      const ctrValue = row.impressions ? (row.clicks / row.impressions) * 100 : 0;
      const expected = curve(row.position);
      return { query: row.query, impressions: row.impressions, clicks: row.clicks, position: round1(row.position), ctr: round1(ctrValue), expectedCtr: round1(expected), potentialClicks: potential(row.impressions, row.clicks, row.position, curve), page: row.page, action: actionFor(row.position, ctrValue, expected) };
    })
    .filter((row) => row.potentialClicks > 0)
    .sort((a, b) => b.potentialClicks - a.potentialClicks)
    .slice(0, 10);

  // ---- Páginas que convierten ------------------------------------------------------------
  const queriesByPage = new Map<string, Array<{ query: string; clicks: number }>>();
  for (const row of gsc?.queryPagesAll ?? []) {
    const [query, page] = row.keys ?? [];
    if (!query || !page) continue;
    const key = normalizePath(new URL(page).pathname);
    const list = queriesByPage.get(key) ?? [];
    list.push({ query, clicks: row.clicks });
    queriesByPage.set(key, list);
  }
  const landingTotals = new Map<string, { sessions: number; leads: number }>();
  for (const row of landingReport?.rows ?? []) {
    const key = normalizePath(row.dimensionValues?.[0]?.value ?? "");
    const entry = landingTotals.get(key) ?? { sessions: 0, leads: 0 };
    entry.sessions += num(row.metricValues?.[0]?.value);
    entry.leads += num(row.metricValues?.[1]?.value);
    landingTotals.set(key, entry);
  }
  const convertingPages: BrandReport["convertingPages"] = [...landingTotals]
    .filter(([page, entry]) => entry.leads > 0 && page !== "(not set)")
    .sort((a, b) => b[1].leads - a[1].leads)
    .slice(0, 8)
    .map(([page, entry]) => ({ page, sessions: entry.sessions, leads: entry.leads, rate: entry.sessions ? round1((entry.leads / entry.sessions) * 100) : 0, queries: [...new Set((queriesByPage.get(page) ?? []).filter((item) => item.clicks > 0 && item.query.length > 3 && !/site:|\d{3,}/.test(item.query)).sort((a, b) => b.clicks - a.clicks).map((item) => item.query))].slice(0, 3) }));

  // ---- Contenidos que suben y bajan ---------------------------------------------------------
  const pageClicks = (rows: GscRow[]) => {
    const map = new Map<string, number>();
    for (const row of rows) { const key = normalizePath(new URL(row.keys?.[0] ?? "https://x/").pathname); map.set(key, (map.get(key) ?? 0) + row.clicks); }
    return map;
  };
  const now = pageClicks(gsc?.pagesNow ?? []);
  const before = pageClicks(gsc?.pagesBefore ?? []);
  const movers = [...new Set([...now.keys(), ...before.keys()])].map((page) => ({ page, before: before.get(page) ?? 0, now: now.get(page) ?? 0 })).map((row) => ({ ...row, change: row.before ? round1(((row.now - row.before) / row.before) * 100) : null }));
  const hasPrevious = Boolean(gsc?.pagesBefore?.length);
  const contentUp = hasPrevious ? movers.filter((row) => row.now > row.before && row.now >= 10).sort((a, b) => b.now - b.before - (a.now - a.before)).slice(0, 6) : [];
  const contentDown = hasPrevious ? movers.filter((row) => row.before > row.now && row.before >= 10).sort((a, b) => a.now - a.before - (b.now - b.before)).slice(0, 6) : [];

  // ---- Migración ------------------------------------------------------------------------------
  let migration: BrandReport["migration"] = null;
  if (migrationAnnotation && migrationWindows && gsc?.migration) {
    const beforeMap = new Map(gsc.migration.before.map((row) => [row.keys?.[0] ?? "", row.clicks]));
    const afterMap = new Map(gsc.migration.after.map((row) => [row.keys?.[0] ?? "", row.clicks]));
    const afterComparable = new Map<string, number>();
    for (const [url, clicks] of afterMap) afterComparable.set(comparableUrl(url), (afterComparable.get(comparableUrl(url)) ?? 0) + clicks);
    const lost = [...beforeMap]
      .map(([url, clicks]) => ({ url, before: clicks, after: afterMap.get(url) ?? 0 }))
      .filter((row) => row.before >= 10 && row.after < row.before * 0.2)
      .sort((a, b) => b.before - b.after - (a.before - a.after));
    const checkSlot = limiter(8);
    const checked = await Promise.all(lost.slice(0, 25).map((row) => checkSlot(async () => {
      const trace = await once(`redirect:${cutoff}:${row.url}`, () => traceRedirects(row.url));
      const targetClicks = trace.finalUrl && trace.finalUrl !== row.url ? (afterComparable.get(comparableUrl(trace.finalUrl)) ?? 0) : null;
      const recovery = row.before ? (row.after + (targetClicks ?? 0)) / row.before : null;
      const verdict: NonNullable<BrandReport["migration"]>["urls"][number]["verdict"] =
        trace.status === null ? "sin-comprobar"
          : trace.status < 300 || (trace.status >= 400 && !trace.location) ? "sin-redireccion"
            : trace.finalStatus === null || trace.finalStatus >= 400 ? "destino-roto"
              : trace.hops > 1 ? "cadena"
                : recovery !== null && recovery >= 0.8 ? "recupera"
                  : recovery !== null && recovery >= 0.4 ? "recupera-parcial" : "no-recupera";
      return { oldUrl: new URL(row.url).pathname, clicksBefore: row.before, clicksAfter: row.after, httpStatus: trace.status, redirectsTo: trace.finalUrl && trace.finalUrl !== row.url ? new URL(trace.finalUrl).pathname : null, hops: trace.hops, finalStatus: trace.finalStatus, targetClicks, recovery: recovery === null ? null : Math.round(recovery * 100) / 100, verdict };
    })));
    migration = {
      date: migrationAnnotation.date,
      label: migrationAnnotation.label,
      beforeStart: migrationWindows.before.startDate,
      beforeEnd: migrationWindows.before.endDate,
      afterStart: migrationWindows.after.startDate,
      afterEnd: migrationWindows.after.endDate,
      siteClicksBefore: sum(gsc.migration.before.map((row) => row.clicks)),
      siteClicksAfter: sum(gsc.migration.after.map((row) => row.clicks)),
      lostUrls: lost.length,
      lostClicks: sum(lost.map((row) => row.before - row.after)),
      checked: checked.length,
      urls: checked,
    };
  }

  // ---- Plan editorial frente a Google -----------------------------------------------------------
  const editorial: BrandReport["editorial"] = (gsc?.editorial ?? editorialTargets.map((target) => ({ target, rows: [] as GscRow[], checked: false })))
    .map(buildReportEditorialRow)
    .sort((a, b) => (a.month ?? "9999").localeCompare(b.month ?? "9999"));

  // ---- Lecturas automáticas -------------------------------------------------------------------------
  const readings: BrandReport["readings"] = {};
  const vsPrevious = window.compare === "custom" ? "frente a la comparación elegida" : "frente al periodo anterior";
  const searchChange = pct(organic.current, organic.previous);
  const searchYoy = pct(organic.current, organic.previousYear);
  const clicksKpi = kpis.find((kpi) => kpi.key === "clicks")!;
  const clicksChange = clicksKpi.value !== null && clicksKpi.previous ? pct(clicksKpi.value, clicksKpi.previous) : null;
  // Solo se atribuye la variación a la migración si cae dentro de lo que se compara: el periodo o su anterior.
  const migrationNear = migrationAnnotation && migrationAnnotation.date >= window.previousStart && migrationAnnotation.date <= window.end ? migrationAnnotation : null;

  const summary: string[] = [];
  if (ga4Ok && searchChange !== null) summary.push(`Las visitas desde buscadores ${searchChange >= 0 ? "suben" : "bajan"} un ${fmtPct(Math.abs(searchChange)).replace(/^[+−]/, "")} ${vsPrevious}${searchYoy !== null ? ` y ${searchYoy >= 0 ? "suben" : "bajan"} un ${fmtPct(Math.abs(searchYoy)).replace(/^[+−]/, "")} frente al ${window.previousYearLabel}` : ""}.`);
  const share = nonBrandShare("current");
  if (share !== null) summary.push(`El ${round1(100 - share).toLocaleString("es-ES")} % de los clics con búsqueda visible viene de gente que ya busca la marca; el ${share.toLocaleString("es-ES")} % restante, de búsquedas genéricas, que es donde el SEO gana clientes nuevos.`);
  if (migrationNear) summary.push(`El ${longDate(migrationNear.date)} la web cambió su estructura de URLs; la caída de clics empieza ahí (ver «La migración»).`);
  readings.summary = summary;

  const channelNotes: string[] = [];
  const total = webTotal("current");
  if (ga4Ok && total) {
    channelNotes.push(`Los buscadores aportan el ${round1((organic.current / total) * 100).toLocaleString("es-ES")} % de las visitas de la web.`);
    // «Sin clasificar» no es un canal: su crecimiento es un aviso de medición (ver calidad del dato), no una lectura de negocio.
    const growers = channels.filter((item) => item.previous >= 50 && item.key !== "Unassigned").map((item) => ({ ...item, change: pct(item.sessions, item.previous)! })).sort((a, b) => b.change - a.change);
    if (growers[0] && growers[0].change > 0) channelNotes.push(`El canal que más crece es «${growers[0].label}»: de ${fmt(growers[0].previous)} a ${fmt(growers[0].sessions)} visitas (${fmtPct(growers[0].change)}).`);
    const worst = growers.at(-1);
    if (worst && worst.change < 0 && worst !== growers[0]) channelNotes.push(`El que más cae es «${worst.label}» (${fmtPct(worst.change)}).`);
  }
  readings.channels = channelNotes;

  const funnelNotes: string[] = [];
  if (funnel.impressions && funnel.clicks !== null) funnelNotes.push(`De cada 10.000 veces que aparecemos en Google entran ${fmt((funnel.clicks / funnel.impressions) * 10000)} personas.`);
  if (funnel.searchSessions) funnelNotes.push(`De cada 1.000 visitas desde buscadores salen ${round1((funnel.leads / funnel.searchSessions) * 1000).toLocaleString("es-ES")} conversiones${funnel.leadEvent ? ` (el ${funnel.leadEventShare?.toLocaleString("es-ES")} % son «${funnel.leadEvent}»)` : ""}.`);
  if (funnel.clicks && funnel.searchSessions) funnelNotes.push(`Analytics registra ${fmt((funnel.searchSessions / funnel.clicks) * 100)} visitas por cada 100 clics de Google: la diferencia son cookies rechazadas y salidas inmediatas, no otro canal.`);
  readings.funnel = funnelNotes;

  const marketNotes: string[] = [];
  const marketChanges = marketRows.filter((row) => row.previous >= 50).map((row) => ({ ...row, change: pct(row.sessions, row.previous)! })).sort((a, b) => a.change - b.change);
  if (marketChanges.length > 1) {
    marketNotes.push(`${marketChanges[0]!.name} es el mercado que más cae (${fmtPct(marketChanges[0]!.change)}).`);
    const best = marketChanges.at(-1)!;
    marketNotes.push(best.change >= 0 ? `${best.name} es el que mejor se comporta (${fmtPct(best.change)}).` : `Todos los mercados caen; ${best.name} es el que menos (${fmtPct(best.change)}).`);
  }
  readings.markets = marketNotes;

  const top = opportunities[0];
  readings.opportunities = top ? [`La mayor oportunidad genérica es «${top.query}»: ${fmt(top.impressions)} apariciones en posición ${top.position.toLocaleString("es-ES")}; llegar al top 3 daría unos ${fmt(top.potentialClicks)} clics más en un periodo como este.`] : [];

  if (migration) {
    const redirected = migration.urls.filter((row) => row.httpStatus !== null && row.httpStatus >= 300 && row.httpStatus < 400).length;
    const recoveries = migration.urls.map((row) => row.recovery).filter((value): value is number => value !== null);
    const medianRecovery = recoveries.length ? [...recoveries].sort((a, b) => a - b)[Math.floor(recoveries.length / 2)]! : null;
    readings.migration = [
      `Tras el cambio del ${longDate(migration.date)}, los clics de la web pasan de ${fmt(migration.siteClicksBefore)} a ${fmt(migration.siteClicksAfter)} en ventanas iguales de ${migrationSpan} días (${fmtPct(pct(migration.siteClicksAfter, migration.siteClicksBefore) ?? 0)}).`,
      `${fmt(migration.lostUrls)} URLs antiguas pierden más del 80 % de sus clics: ${fmt(migration.lostClicks)} clics menos.`,
      migration.checked ? `De las ${migration.checked} que más pierden, ${redirected} redirigen con 301${medianRecovery !== null ? `; la mediana de recuperación en su nueva URL es del ${Math.round(medianRecovery * 100)} %` : ""}. La redirección existe: lo que falta es que las nuevas URLs hereden el posicionamiento.` : "",
    ].filter(Boolean);
  }

  const counts = { nuevo: editorial.filter((row) => row.situation === "sin-presencia").length, cerca: editorial.filter((row) => row.situation === "cerca").length, top: editorial.filter((row) => row.situation === "ya-top").length, lejos: editorial.filter((row) => row.situation === "lejos").length };
  readings.editorial = editorial.length ? [
    `De las ${plural(editorial.length, "pieza planificada", "piezas planificadas")}: ${counts.nuevo} sin presencia hoy en Google, ${counts.lejos} con presencia lejana y ${counts.cerca} ya en primera página.`,
    counts.top ? `${plural(counts.top, "pieza busca", "piezas buscan")} una consulta en la que ya somos top 3 con otra página: conviene reforzar esa URL en vez de publicar otra que compita con ella.` : "Ninguna compite con una página propia que ya esté en el top 3.",
  ] : [];

  // ---- Calidad del dato ------------------------------------------------------------------------------
  const dataQuality: BrandReport["dataQuality"] = [];
  const direct = channelMap.get("Direct")?.current ?? 0;
  if (ga4Ok && organic.current && direct > organic.current * 3) dataQuality.push({ tone: "warn", text: `El tráfico directo (${fmt(direct)} visitas${channelMap.get("Direct")?.previous ? `, frente a ${fmt(channelMap.get("Direct")!.previous)} ${window.compare === "custom" ? "en la comparación elegida" : "en el periodo anterior"}` : ""}) multiplica por ${round1(direct / organic.current).toLocaleString("es-ES")} al de buscadores. Es muy inusual y suele indicar tráfico automático o etiquetado incompleto: revisar la medición antes de leer los totales de la web.` });
  const unassigned = channelMap.get("Unassigned")?.current ?? 0;
  if (ga4Ok && total && unassigned / total > 0.05) dataQuality.push({ tone: "warn", text: `El ${round1((unassigned / total) * 100).toLocaleString("es-ES")} % de las visitas llega «sin clasificar»: Analytics no identifica su origen.` });
  if (gscRanges.current && gscRanges.current.startDate !== window.start) dataQuality.push({ tone: "info", text: `Search Console solo guarda 16 meses: sus cifras cubren desde el ${longDate(gscRanges.current.startDate)}.` });
  if (!gscRanges.previousYear && gsc) dataQuality.push({ tone: "info", text: "La comparación con el año pasado de Search Console no está disponible para este periodo: cae fuera de los 16 meses que conserva." });
  const leadsKpi = kpis.find((kpi) => kpi.key === "search_leads")!;
  if (leadsKpi.value !== null && leadsKpi.previous && leadsKpi.value > leadsKpi.previous * 2) dataQuality.push({ tone: "warn", text: `Las conversiones se multiplican por ${round1(leadsKpi.value / leadsKpi.previous).toLocaleString("es-ES")} ${vsPrevious} mientras las visitas ${searchChange !== null && searchChange < 0 ? "bajan" : "no crecen igual"}: confirmar si cambió la definición del evento${funnel.leadEvent ? ` «${funnel.leadEvent}»` : ""} antes de presentarlo como mejora.` });

  // ---- Próximos pasos -------------------------------------------------------------------------------------
  const nextSteps: BrandReport["nextSteps"] = [];
  if (migration) {
    const weak = migration.urls.filter((row) => row.verdict === "no-recupera" || row.verdict === "recupera-parcial");
    const broken = migration.urls.filter((row) => row.verdict === "destino-roto" || row.verdict === "cadena" || row.verdict === "sin-redireccion");
    if (weak.length) nextSteps.push({ title: "Recuperar el posicionamiento de las URLs migradas", why: `${weak.length} de las ${migration.checked} URLs que más perdían no recuperan su tráfico en la nueva dirección: revisar título, contenido, enlaces internos y sitemap de sus destinos.`, area: "tecnico" });
    if (broken.length) nextSteps.push({ title: "Corregir las redirecciones que fallan", why: `${plural(broken.length, "URL antigua", "URLs antiguas")} de las ${migration.checked} revisadas no lleva en un solo salto a una página que responda bien.`, area: "tecnico" });
  }
  if (top) nextSteps.push({ title: `Atacar «${top.query}»${opportunities[1] ? ` y «${opportunities[1].query}»` : ""}`, why: `Son las búsquedas genéricas con más recorrido (${fmt(top.impressions + (opportunities[1]?.impressions ?? 0))} apariciones). ${top.action}`, area: "contenido" });
  if (counts.top) nextSteps.push({ title: "Revisar las piezas editoriales que competirían con páginas propias", why: `${counts.top} piezas del plan apuntan a búsquedas en las que ya somos top 3.`, area: "editorial" });
  const warnings = dataQuality.filter((item) => item.tone === "warn");
  if (warnings.length) nextSteps.push({ title: "Revisar la medición de Analytics antes de leer los totales", why: `${plural(warnings.length, "señal anómala", "señales anómalas")} en este periodo (ver «Calidad del dato»).`, area: "medicion" });

  // ---- Veredicto ----------------------------------------------------------------------------------------------
  const driver = clicksChange ?? searchChange;
  const tone = driver === null ? "warn" : driver <= -10 ? "bad" : driver < 0 || (searchYoy !== null && searchYoy <= -10) ? "warn" : "good";
  const headline = driver === null
    ? `${meta.name} · ${window.label.toLowerCase()}`
    : `${clicksChange !== null ? "Los clics desde Google" : "Las visitas desde buscadores"} ${driver >= 0 ? "crecen" : "caen"} un ${Math.abs(round1(driver)).toLocaleString("es-ES")} %${migrationNear && driver < 0 ? ` tras el cambio de URLs del ${Number(migrationNear.date.slice(8, 10))} de ${MONTHS_LONG[Number(migrationNear.date.slice(5, 7)) - 1]}` : ""}`;
  const detail = ga4Ok
    ? `${fmt(organic.current)} visitas desde buscadores${searchChange !== null ? ` (${fmtPct(searchChange)} ${vsPrevious})` : ""} y ${fmt(leadsBy("current"))} conversiones en el periodo`
    : "Analytics no respondió; el veredicto se basa solo en Search Console";

  return brandReportSchema.parse({
    generatedAt: (input.now ?? new Date()).toISOString(),
    mode: "live",
    brand: brand.slug,
    market,
    window,
    cutoff,
    gscFloor: floor,
    verdict: { tone, headline, detail: `${detail}.` },
    kpis,
    searchReconciliation,
    keywordRanking,
    aiTraffic,
    userMix,
    readings,
    channels,
    searchSeries,
    clickSeries,
    usersSeries,
    impressionsSeries,
    webSeries,
    months,
    annotations: (brand.annotations ?? []).map((item) => ({ ...item })),
    funnel,
    markets: marketRows,
    opportunities,
    ...buildReportExplorers({ queryPagesNonBrand: gsc?.queryPagesNonBrand ?? null, pagesNow: gsc?.pagesNow ?? null, pagesBefore: gsc?.pagesBefore ?? null }),
    convertingPages,
    contentUp,
    contentDown,
    migration,
    editorial,
    nextSteps: nextSteps.slice(0, 5),
    dataQuality,
    sources,
  });
}

/** Buscador de una `sessionSource` de GA4, agrupando dominios de un mismo motor. */
export function searchEngineOf(source: string) {
  const value = source.toLowerCase();
  if (value === "google" || /(^|\.)google\./.test(value)) return "Google";
  if (/bing\b|msn\.com/.test(value)) return "Bing";
  if (/yahoo/.test(value)) return "Yahoo";
  if (/duckduckgo/.test(value)) return "DuckDuckGo";
  if (/ecosia/.test(value)) return "Ecosia";
  if (/yandex/.test(value)) return "Yandex";
  return "Otros";
}

/**
 * Conciliación de «Visitas SEO» con «Clics en Google» (D-045). Los otros
 * buscadores salen por diferencia con el total orgánico, para que la suma
 * cuadre aunque la cola larga de fuentes no quepa en la consulta.
 */
export function buildSearchReconciliation(
  sources: Array<{ source: string; sessions: number; range?: string }>,
  organicSessions: number,
  googleWebClicks: number | null,
  googleImageClicks: number | null,
): NonNullable<BrandReport["searchReconciliation"]> {
  const totals = new Map<string, number>();
  const previous = new Map<string, number>();
  for (const row of sources) {
    const label = searchEngineOf(row.source);
    // Sin `range` la fila es del periodo actual (lecturas de un solo periodo).
    const target = !row.range || row.range === "current" ? totals : row.range === "previous" ? previous : null;
    if (target) target.set(label, (target.get(label) ?? 0) + row.sessions);
  }
  const googleSessions = totals.get("Google") ?? 0;
  return {
    googleSessions,
    otherEngineSessions: Math.max(0, organicSessions - googleSessions),
    engines: [...totals]
      .filter(([label]) => label !== "Google" && label !== "Otros")
      .map(([label, sessions]) => ({ label, sessions, previous: previous.get(label) ?? 0 }))
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 3),
    googleWebClicks,
    googleImageClicks,
  };
}

/** Filas por página de la API de Search Console (su máximo). */
const GSC_PAGE_SIZE = 25000;
/** Tope de keywords leídas por periodo: cuatro páginas de la API. */
export const KEYWORD_ROW_LIMIT = 100000;

/** Todas las búsquedas del periodo, página a página, hasta `KEYWORD_ROW_LIMIT`. */
async function allQueries(
  query: (request: Parameters<typeof gscQuery>[2]) => Promise<GscRow[]>,
  request: Parameters<typeof gscQuery>[2],
): Promise<GscRow[]> {
  const rows: GscRow[] = [];
  for (let startRow = 0; startRow < KEYWORD_ROW_LIMIT; startRow += GSC_PAGE_SIZE) {
    const page = await query({ ...request, rowLimit: GSC_PAGE_SIZE, startRow });
    rows.push(...page);
    if (page.length < GSC_PAGE_SIZE) break;
  }
  return rows;
}

/** Reparto de keywords por posición media (D-045): 1–3, 4–20 y más de 20. */
export function buildKeywordRanking(
  current: GscRow[],
  previous: GscRow[] | null,
  brandRegex: string,
): NonNullable<BrandReport["keywordRanking"]> {
  const ranked = current.filter((row) => row.impressions > 0);
  // Misma expresión que el filtro de marca de Search Console (RE2 compatible con JS).
  const isBrand = new RegExp(brandRegex, "i");
  const top3 = ranked.filter((row) => row.position <= 3).length;
  const top20 = ranked.filter((row) => row.position > 3 && row.position <= 20).length;
  return {
    total: ranked.length,
    top3,
    top20,
    rest: ranked.length - top3 - top20,
    nonBrand: ranked.filter((row) => !isBrand.test(row.keys?.[0] ?? "")).length,
    previousTotal: previous ? previous.filter((row) => row.impressions > 0).length : null,
    rowLimit: KEYWORD_ROW_LIMIT,
    limitReached: current.length >= KEYWORD_ROW_LIMIT,
  };
}

/** Visitas por asistente de IA, periodo actual y anterior (D-046). */
export function buildAiTraffic(rows: Array<{ source: string; range: string; sessions: number }>): NonNullable<BrandReport["aiTraffic"]> {
  const totals = new Map<string, { sessions: number; previous: number }>();
  for (const row of rows) {
    const assistant = AI_ASSISTANTS.find((item) => item.pattern.test(row.source));
    if (!assistant || (row.range !== "current" && row.range !== "previous")) continue;
    const entry = totals.get(assistant.key) ?? { sessions: 0, previous: 0 };
    if (row.range === "current") entry.sessions += row.sessions;
    else entry.previous += row.sessions;
    totals.set(assistant.key, entry);
  }
  const assistants = AI_ASSISTANTS.flatMap((item) => {
    const entry = totals.get(item.key);
    return entry && (entry.sessions || entry.previous) ? [{ key: item.key, label: item.label, ...entry }] : [];
  }).sort((a, b) => b.sessions - a.sessions);
  return {
    total: sum(assistants.map((item) => item.sessions)),
    previousTotal: sum(assistants.map((item) => item.previous)),
    assistants,
  };
}

/**
 * Nuevos frente a recurrentes (D-045). GA4 cuenta como nuevo a quien hace su
 * primera visita en el periodo; el resto de usuarios son recurrentes.
 */
export function buildUserMix(total: number, fresh: number, previousTotal: number, previousFresh: number): NonNullable<BrandReport["userMix"]> | null {
  if (!total) return null;
  const newUsers = Math.min(fresh, total);
  return {
    newUsers,
    returningUsers: total - newUsers,
    previousNewShare: previousTotal ? round1((Math.min(previousFresh, previousTotal) / previousTotal) * 100) : null,
  };
}
