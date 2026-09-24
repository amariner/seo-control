import { createHash } from "node:crypto";
import type { DashboardPayload, PeriodWindow, QueryOpportunity } from "@seo/contracts";
import { ga4MarketFilter, gscMarketFilters, type LiveMarket, type ResolvedLiveBrand } from "./brands";
import { gscFloor, ranges } from "./figures";
import { ga4Batch, gscQuery, type Env, type GscFilter, type GscRow } from "./google";

/**
 * Oportunidades de captación leídas de Search Console (D-036).
 *
 * Dos listas, las dos con la misma regla: la demanda es real (impresiones de
 * GSC) y el margen se mide contra la **curva de CTR del propio sitio**, no
 * contra una curva genérica del sector. Un sitio de marca con mucho tráfico
 * branded tiene CTR muy por encima de cualquier benchmark; comparar con uno
 * externo marcaría como «oportunidad» páginas que ya rinden.
 *
 * - URLs: páginas en posición accionable (≤ 20) con volumen suficiente.
 * - Consultas **non-branded**: la demanda genérica es la que una estrategia SEO
 *   puede conquistar; la de marca ya es de la marca.
 *
 * `potentialClicks` = clics que daría el CTR del top 3 del sitio si la URL o la
 * consulta está por debajo, o el CTR de su propia posición si ya está arriba,
 * menos los que ya tiene. Ordena la lista; no es una previsión.
 */

export type PageOpportunity = DashboardPayload["opportunities"][number];

const round1 = (value: number) => Math.round(value * 10) / 10;
const shortHash = (value: string) => createHash("sha1").update(value).digest("hex").slice(0, 8);

/** Tramo de posición: 1..10 uno a uno, 11–20 juntos y todo lo demás en 21. */
const bucketOf = (position: number) => {
  const rounded = Math.max(1, Math.round(position));
  return rounded <= 10 ? rounded : rounded <= 20 ? 11 : 21;
};

/**
 * Curva de respaldo, solo para tramos donde el sitio no tiene volumen para
 * calcular la suya. Valores conservadores, en %.
 */
const FALLBACK_CTR: Record<number, number> = { 1: 25, 2: 14, 3: 9, 4: 6, 5: 4.5, 6: 3.5, 7: 2.8, 8: 2.2, 9: 1.8, 10: 1.5, 11: 0.8, 21: 0.3 };
const MIN_BUCKET_IMPRESSIONS = 500;

export function ctrCurve(rows: readonly Pick<GscRow, "clicks" | "impressions" | "position">[]): (position: number) => number {
  const totals = new Map<number, { clicks: number; impressions: number }>();
  for (const row of rows) {
    const bucket = bucketOf(row.position);
    const entry = totals.get(bucket) ?? { clicks: 0, impressions: 0 };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    totals.set(bucket, entry);
  }
  return (position: number) => {
    const bucket = bucketOf(position);
    const entry = totals.get(bucket);
    return entry && entry.impressions >= MIN_BUCKET_IMPRESSIONS ? (entry.clicks / entry.impressions) * 100 : FALLBACK_CTR[bucket]!;
  };
}

export function potential(impressions: number, clicks: number, position: number, curve: (position: number) => number) {
  const target = position > 3 ? Math.max(curve(3), curve(position)) : curve(position);
  return Math.max(0, Math.round((impressions * target) / 100 - clicks));
}

/** Tipo de página por la primera sección significativa de la ruta. */
export function pageTypeOf(path: string, languagePrefixes: readonly string[]): PageOpportunity["type"] {
  const segments = path.split(/[?#]/)[0]!.split("/").filter(Boolean);
  if (segments.length && languagePrefixes.includes(segments[0]!)) segments.shift();
  if (!segments.length) return "home";
  const first = segments[0]!.toLowerCase();
  if (/^(blog|tendencias|trends|inspiracion|inspiration|news|noticias|magazine|recursos|resources)$/.test(first)) return "editorial";
  if (/^(producto|productos|product|products|produit|produits|prodotti|produkte|colecciones|collections?|coleccion)$/.test(first)) return segments.length > 1 ? "producto_coleccion" : "categoria";
  if (/^(espacios|spaces|proyectos|projects|projets|library)$/.test(first)) return "proyecto_inspiracion";
  if (/^(tiendas|stores|showrooms?|boutiques|donde-comprar)$/.test(first)) return "tienda_showroom";
  if (/^(contacto|contact|kontakt)$/.test(first)) return "contacto";
  return segments.length > 1 ? "categoria" : "otras";
}

/** Título legible a partir del último tramo de la URL: GSC no devuelve el `<title>`. */
export function titleOf(path: string): string {
  const segments = path.split(/[?#]/)[0]!.split("/").filter(Boolean);
  const last = segments.at(-1);
  if (!last) return "Página de inicio";
  const words = decodeURIComponent(last).replace(/\.[a-z]{2,4}$/i, "").replace(/[-_]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : path;
}

/** Ruta comparable entre GSC y GA4: sin query, sin barra final y en minúsculas. */
export const normalizePath = (path: string) => {
  const bare = path.split(/[?#]/)[0]!.toLowerCase();
  return bare.length > 1 ? bare.replace(/\/+$/, "") : bare;
};

const pathOf = (url: string) => {
  try {
    const parsed = new URL(url);
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
};

export type BrandOpportunities = { pages: PageOpportunity[]; queries: QueryOpportunity[] };

export async function fetchOpportunities(env: Env, brand: ResolvedLiveBrand, market: LiveMarket | null, window: PeriodWindow, cutoff: string): Promise<BrandOpportunities> {
  if (!brand.siteUrl) return { pages: [], queries: [] };
  const r = ranges(window);
  const floor = gscFloor(cutoff);
  const current = { ...r.current, startDate: r.current.startDate < floor ? floor : r.current.startDate };
  const previousAvailable = r.previous.startDate >= floor;
  const base = gscMarketFilters(brand, market);
  const nonBrand: GscFilter = { dimension: "query", operator: "excludingRegex", expression: `(?i)(${brand.brandRegex})` };

  const [pages, previousPages, queryPages, landing] = await Promise.all([
    gscQuery(env, brand.siteUrl, { ...current, dimensions: ["page"], filters: base, rowLimit: 1000 }),
    previousAvailable ? gscQuery(env, brand.siteUrl, { ...r.previous, dimensions: ["page"], filters: base, rowLimit: 5000 }) : Promise.resolve([] as GscRow[]),
    gscQuery(env, brand.siteUrl, { ...current, dimensions: ["query", "page"], filters: [...base, nonBrand], rowLimit: 5000 }),
    // Conversiones por landing: sin ellas una URL con mucho clic y ninguna conversión parecería igual de valiosa.
    brand.propertyId
      ? ga4Batch(env, brand.propertyId, [{
          dateRanges: [current],
          dimensions: [{ name: "landingPage" }],
          metrics: [{ name: "keyEvents" }],
          dimensionFilter: (() => {
            const organic = { filter: { fieldName: "sessionMedium", stringFilter: { matchType: "EXACT", value: "organic" } } };
            const scope = ga4MarketFilter(brand, market);
            return scope ? { andGroup: { expressions: [organic, scope] } } : organic;
          })(),
          limit: "5000",
        }]).then(([report]) => report?.rows ?? []).catch(() => [])
      : Promise.resolve([]),
  ]);

  const conversions = new Map<string, number>();
  for (const row of landing) {
    const key = normalizePath(row.dimensionValues?.[0]?.value ?? "");
    conversions.set(key, (conversions.get(key) ?? 0) + Number(row.metricValues?.[0]?.value ?? 0));
  }
  const excluded = brand.opportunityExcludeRegex ? new RegExp(brand.opportunityExcludeRegex, "i") : null;
  const previousClicks = new Map(previousPages.map((row) => [row.keys?.[0] ?? "", row.clicks]));

  // --- URLs --------------------------------------------------------------
  const pageCurve = ctrCurve(pages);
  const minPageImpressions = Math.max(100, window.days * 5);
  const pageRows = pages
    .filter((row) => row.impressions >= minPageImpressions && row.position <= 20)
    .map((row) => {
      const url = row.keys?.[0] ?? "";
      const path = pathOf(url);
      const expected = pageCurve(row.position);
      const before = previousClicks.get(url);
      const status: PageOpportunity["status"] =
        previousAvailable && before === undefined && row.clicks > 0 ? "nuevo" : before !== undefined && before >= 20 && row.clicks < before * 0.8 ? "decay" : "estable";
      return {
        id: `${brand.slug}-p-${shortHash(url)}`,
        project: brand.slug,
        url: path,
        title: titleOf(path),
        type: pageTypeOf(path, brand.allPrefixes),
        status,
        clicks: row.clicks,
        impressions: row.impressions,
        position: round1(row.position),
        ctr: round1(row.ctr * 100),
        expectedCtr: round1(expected),
        conversions: conversions.get(normalizePath(path)) ?? 0,
        potential: potential(row.impressions, row.clicks, row.position, pageCurve),
      };
    })
    .filter((row) => row.potential > 0 && row.type !== "home" && !(excluded && excluded.test(row.url.replace(/[-_/]+/g, " "))))
    .sort((a, b) => b.potential - a.potential)
    .slice(0, 15);
  const maxPagePotential = pageRows[0]?.potential ?? 1;
  const pageOpportunities: PageOpportunity[] = pageRows.map(({ potential: value, ...row }) => ({ ...row, opportunityScore: Math.max(1, Math.round(Math.sqrt(value / maxPagePotential) * 100)) }));

  // --- Consultas non-branded ---------------------------------------------
  const byQuery = new Map<string, { clicks: number; impressions: number; weightedPosition: number; bestPage: string | null; bestImpressions: number }>();
  for (const row of queryPages) {
    const [query, page] = row.keys ?? [];
    if (!query) continue;
    const entry = byQuery.get(query) ?? { clicks: 0, impressions: 0, weightedPosition: 0, bestPage: null, bestImpressions: -1 };
    entry.clicks += row.clicks;
    entry.impressions += row.impressions;
    entry.weightedPosition += row.position * row.impressions;
    if (page && row.impressions > entry.bestImpressions) {
      entry.bestPage = pathOf(page);
      entry.bestImpressions = row.impressions;
    }
    byQuery.set(query, entry);
  }
  const queryRows = [...byQuery].map(([query, entry]) => ({ query, ...entry, position: entry.impressions ? entry.weightedPosition / entry.impressions : 0 }));
  const queryCurve = ctrCurve(queryRows);
  const minQueryImpressions = Math.max(50, window.days * 3);
  const queryOpportunities: QueryOpportunity[] = queryRows
    .filter((row) => row.impressions >= minQueryImpressions && row.position <= 30 && !(excluded && excluded.test(row.query)))
    .map((row) => ({
      id: `${brand.slug}-q-${shortHash(row.query)}`,
      project: brand.slug,
      query: row.query,
      clicks: row.clicks,
      impressions: row.impressions,
      position: round1(row.position),
      ctr: round1(row.impressions ? (row.clicks / row.impressions) * 100 : 0),
      expectedCtr: round1(queryCurve(row.position)),
      potentialClicks: potential(row.impressions, row.clicks, row.position, queryCurve),
      page: row.bestPage,
    }))
    .filter((row) => row.potentialClicks > 0)
    .sort((a, b) => b.potentialClicks - a.potentialClicks)
    .slice(0, 25);

  return { pages: pageOpportunities, queries: queryOpportunities };
}
