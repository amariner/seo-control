import type { MarketCode, PeriodWindow } from "@seo/contracts";
import { ga4MarketFilter, gscMarketFilters, type LiveMarket, type ResolvedLiveBrand } from "./brands";
import { ga4Batch, gscQuery, type Env, type Ga4DateRange, type Ga4Request, type GscFilter } from "./google";

/**
 * Cifras de una marca en una ventana, leídas en directo de GA4 y GSC (D-034).
 *
 * Una fuente que falla no tumba la otra: cada una llega como `SourceResult`,
 * con el error escrito, y quien compone el payload decide qué declarar. Así un
 * token de Search Console caducado deja la portada con GA4 y la tarjeta de GSC
 * en «error», en lugar de una pantalla en blanco o —peor— ceros.
 */

export type SourceResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type Ga4Totals = { sessions: number; conversions: number };
export type GscTotals = { clicks: number; brandClicks: number; nonBrandClicks: number };
export type DailyPoint = { date: string; sessions: number; conversions: number; clicks: number };

export type RangeKey = "current" | "previous" | "previousYear";

export type BrandFigures = {
  ga4: SourceResult<{ totals: Record<RangeKey, Ga4Totals>; daily: Record<"current" | "previousYear", Array<{ date: string; sessions: number; conversions: number }>> }>;
  gsc: SourceResult<{ totals: Record<RangeKey, GscTotals | null>; daily: Record<"current" | "previousYear", Array<{ date: string; clicks: number }>> }>;
};

export type MarketFigures = {
  code: MarketCode;
  ga4: SourceResult<Record<"current" | "previous" | "previousYear", Ga4Totals>>;
  gsc: SourceResult<Record<"current" | "previous", number | null>>;
};

/** Search Console conserva 16 meses. Un rango que empieza antes está incompleto. */
export const GSC_RETENTION_DAYS = 486;

const DAY_MS = 86_400_000;
const isoMinus = (iso: string, days: number) => new Date(Date.parse(iso) - days * DAY_MS).toISOString().slice(0, 10);

export function gscFloor(cutoff: string) {
  return isoMinus(cutoff, GSC_RETENTION_DAYS);
}

export const ranges = (window: PeriodWindow): Record<RangeKey, Ga4DateRange> => ({
  current: { startDate: window.start, endDate: window.end },
  previous: { startDate: window.previousStart, endDate: window.previousEnd },
  previousYear: { startDate: window.previousYearStart, endDate: window.previousYearEnd },
});

const ORGANIC = { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "EXACT", value: "organic", caseSensitive: false } } };

function withOrganic(extra: Record<string, unknown> | null) {
  return extra ? { andGroup: { expressions: [ORGANIC, extra] } } : ORGANIC;
}

const num = (value: string | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ga4Date = (raw: string) => (raw.length === 8 ? `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}` : raw);

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function settle<T>(run: () => Promise<T>): Promise<SourceResult<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

/**
 * Limita la concurrencia hacia Search Console: la cuota es por sitio y minuto,
 * y lanzar las ~20 consultas de una portada a la vez provoca 429 intermitentes.
 */
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
const gscSlot = limiter(6);

/** Totales de un rango de GSC, o `null` si el rango cae fuera de la retención. */
function gscRangeAvailable(range: Ga4DateRange, floor: string) {
  return range.startDate >= floor;
}

export async function fetchBrandFigures(env: Env, brand: ResolvedLiveBrand, market: LiveMarket | null, window: PeriodWindow, cutoff: string): Promise<BrandFigures> {
  const r = ranges(window);
  const floor = gscFloor(cutoff);

  const ga4 = settle(async () => {
    if (!brand.propertyId) throw new Error(`Falta ${brand.propertyEnv}`);
    const filter = withOrganic(ga4MarketFilter(brand, market));
    const metrics = [{ name: "sessions" }, { name: "keyEvents" }];
    const daily = (range: Ga4DateRange): Ga4Request => ({ dateRanges: [range], dimensions: [{ name: "date" }], metrics, dimensionFilter: filter, limit: "1000", orderBys: [{ dimension: { dimensionName: "date" } }] });
    const [summary, current, previousYear] = await ga4Batch(env, brand.propertyId, [
      // Con varios rangos y sin dimensiones, GA4 devuelve una fila por rango con la dimensión implícita `dateRange`.
      { dateRanges: [{ ...r.current, name: "current" }, { ...r.previous, name: "previous" }, { ...r.previousYear, name: "previousYear" }], metrics, dimensionFilter: filter },
      daily(r.current),
      daily(r.previousYear),
    ]);
    const totals = { current: { sessions: 0, conversions: 0 }, previous: { sessions: 0, conversions: 0 }, previousYear: { sessions: 0, conversions: 0 } };
    for (const row of summary?.rows ?? []) {
      const key = row.dimensionValues?.[0]?.value as RangeKey | undefined;
      if (key && key in totals) totals[key] = { sessions: num(row.metricValues?.[0]?.value), conversions: num(row.metricValues?.[1]?.value) };
    }
    const series = (report: typeof current) =>
      (report?.rows ?? [])
        .map((row) => ({ date: ga4Date(row.dimensionValues?.[0]?.value ?? ""), sessions: num(row.metricValues?.[0]?.value), conversions: num(row.metricValues?.[1]?.value) }))
        .sort((a, b) => a.date.localeCompare(b.date));
    return { totals, daily: { current: series(current), previousYear: series(previousYear) } };
  });

  const gsc = settle(async () => {
    if (!brand.siteUrl) throw new Error(`Falta ${brand.siteEnv}`);
    const base: GscFilter[] = gscMarketFilters(brand, market);
    const brandFilter = (operator: "includingRegex" | "excludingRegex"): GscFilter => ({ dimension: "query", operator, expression: `(?i)(${brand.brandRegex})` });
    const clicksOf = (rows: Array<{ clicks: number }>) => rows.reduce((total, row) => total + row.clicks, 0);

    /**
     * El periodo actual se recorta al suelo de retención (y la cobertura lo
     * declara); una comparación incompleta, en cambio, se anula: comparar 28
     * días reales contra 9 conservados fabricaría una caída.
     */
    const totalsFor = async (input: Ga4DateRange, clip: boolean): Promise<GscTotals | null> => {
      const range = clip && input.startDate < floor ? { ...input, startDate: floor } : input;
      if (!gscRangeAvailable(range, floor) || range.startDate > range.endDate) return null;
      const [all, branded, nonBranded] = await Promise.all([
        gscSlot(() => gscQuery(env, brand.siteUrl!, { ...range, filters: base })),
        gscSlot(() => gscQuery(env, brand.siteUrl!, { ...range, filters: [...base, brandFilter("includingRegex")] })),
        gscSlot(() => gscQuery(env, brand.siteUrl!, { ...range, filters: [...base, brandFilter("excludingRegex")] })),
      ]);
      return { clicks: clicksOf(all), brandClicks: clicksOf(branded), nonBrandClicks: clicksOf(nonBranded) };
    };
    const dailyFor = async (range: Ga4DateRange) => {
      // Se recorta al suelo de retención: la serie empieza donde empieza el dato, no con ceros.
      const startDate = range.startDate < floor ? floor : range.startDate;
      if (startDate > range.endDate) return [];
      const rows = await gscSlot(() => gscQuery(env, brand.siteUrl!, { startDate, endDate: range.endDate, dimensions: ["date"], filters: base, rowLimit: 1000 }));
      return rows.map((row) => ({ date: row.keys?.[0] ?? "", clicks: row.clicks })).sort((a, b) => a.date.localeCompare(b.date));
    };

    const [current, previous, previousYear, dailyCurrent, dailyPreviousYear] = await Promise.all([
      totalsFor(r.current, true),
      totalsFor(r.previous, false),
      totalsFor(r.previousYear, false),
      dailyFor(r.current),
      dailyFor(r.previousYear),
    ]);
    return { totals: { current, previous, previousYear }, daily: { current: dailyCurrent, previousYear: dailyPreviousYear } };
  });

  return { ga4: await ga4, gsc: await gsc };
}

/** Reparto por mercado Tier 1: sesiones, conversiones y clics del periodo y del anterior. */
export async function fetchMarketFigures(env: Env, brand: ResolvedLiveBrand, markets: readonly LiveMarket[], window: PeriodWindow, cutoff: string): Promise<MarketFigures[]> {
  const r = ranges(window);
  const floor = gscFloor(cutoff);
  const metrics = [{ name: "sessions" }, { name: "keyEvents" }];

  const ga4 = await settle(async () => {
    if (!brand.propertyId) throw new Error(`Falta ${brand.propertyEnv}`);
    const reports = await ga4Batch(
      env,
      brand.propertyId,
      markets.map((market) => ({
        dateRanges: [{ ...r.current, name: "current" }, { ...r.previous, name: "previous" }, { ...r.previousYear, name: "previousYear" }],
        metrics,
        dimensionFilter: withOrganic(ga4MarketFilter(brand, market)),
      })),
    );
    return reports.map((report) => {
      const totals = { current: { sessions: 0, conversions: 0 }, previous: { sessions: 0, conversions: 0 }, previousYear: { sessions: 0, conversions: 0 } };
      for (const row of report.rows ?? []) {
        const key = row.dimensionValues?.[0]?.value as RangeKey | undefined;
        if (key && key in totals) totals[key] = { sessions: num(row.metricValues?.[0]?.value), conversions: num(row.metricValues?.[1]?.value) };
      }
      return totals;
    });
  });

  const gsc = await Promise.all(
    markets.map((market) =>
      settle(async () => {
        if (!brand.siteUrl) throw new Error(`Falta ${brand.siteEnv}`);
        const filters = gscMarketFilters(brand, market);
        const clicks = async (input: Ga4DateRange, clip: boolean) => {
          const range = clip && input.startDate < floor ? { ...input, startDate: floor } : input;
          if (!gscRangeAvailable(range, floor) || range.startDate > range.endDate) return null;
          const rows = await gscSlot(() => gscQuery(env, brand.siteUrl!, { ...range, filters }));
          return rows.reduce((total, row) => total + row.clicks, 0);
        };
        const [current, previous] = await Promise.all([clicks(r.current, true), clicks(r.previous, false)]);
        return { current, previous };
      }),
    ),
  );

  return markets.map((market, index) => ({
    code: market.code,
    ga4: ga4.ok ? { ok: true as const, value: ga4.value[index]! } : ga4,
    gsc: gsc[index]!,
  }));
}
