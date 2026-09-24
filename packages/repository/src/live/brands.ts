import type { BrandSlug, MarketCode } from "@seo/contracts";
import type { Env, GscFilter } from "./google";

/**
 * Configuración de lectura directa por marca (D-034).
 *
 * Reproduce la de la V1 (`src/lib/config/projects.ts` de `seo-dashboard`) para
 * que las cifras cuadren con las que el equipo ya conoce:
 *
 * - Una sola propiedad GA4 por marca, que cubre todos los mercados.
 * - El mercado es el **prefijo de ruta** de la URL, no el país del usuario. El
 *   mercado sin prefijo (Porcelanosa ES vive en la raíz) se define por
 *   exclusión de todos los prefijos hermanos que la V1 declaraba, incluidos
 *   los que V2 aún no navega (Italia, México…): sin ellos, «España» absorbería
 *   el tráfico de quince mercados.
 * - Non-branded excluye marca propia y paraguas, igual que el informe V1.
 * - Cuando un prefijo sirve a varios mercados (Xtone publica Reino Unido y
 *   Estados Unidos bajo el mismo `/en`), la ruta sola no los distingue y se
 *   añade el **país del usuario**. Es la única excepción a «mercado = ruta» y
 *   el mercado lo declara (`country`), para que nadie compare esa fila con la
 *   de una marca que sí separa por ruta sin saberlo.
 */

/** País en los dos vocabularios: nombre inglés de GA4 e ISO-3166 alfa-3 de GSC. */
export type LiveCountry = { ga4: string; gsc: string };

export type LiveMarket = { code: MarketCode; pathPrefix: string; country?: LiveCountry };

/**
 * Mercado fuera de Tier 1 (D-039). Solo lo usa el informe ejecutivo: la portada
 * y el portfolio siguen en los cinco de `marketCodeSchema`, que es lo que el
 * contrato global sabe filtrar. El código es el prefijo en mayúsculas.
 */
export type LiveExtraMarket = { code: string; name: string; pathPrefix: string };

/** Lo único que necesitan los filtros: la sección de la web y, si hace falta, el país. */
export type MarketScope = { pathPrefix: string; country?: LiveCountry };

export type LiveBrandConfig = {
  slug: BrandSlug;
  propertyEnv: string;
  siteEnv: string;
  /** Prefijos de los mercados Tier 1 que V2 navega. `""` = raíz del dominio. */
  markets: readonly LiveMarket[];
  /** Otros mercados que la V1 medía, por sección de la web. */
  extraMarkets?: readonly LiveExtraMarket[];
  /** Todos los prefijos que la V1 conocía. Se usan para definir por exclusión el mercado raíz. */
  allPrefixes: readonly string[];
  /** Expresión RE2 de consultas de marca (propia + paraguas). */
  brandRegex: string;
  /**
   * Consultas que no son marca pero tampoco demanda de producto: el interés por
   * una embajadora o un patrocinio. Siguen contando en la cuota non-branded
   * —son clics reales— pero no se listan como oportunidad SEO, porque ningún
   * trabajo de contenido de producto las captaría.
   */
  opportunityExcludeRegex?: string;
  /**
   * Hechos fechados observados en los datos (migraciones, lanzamientos), con su
   * procedencia en la etiqueta. Se pintan sobre la serie para que una caída se
   * lea junto a su causa probable; no son conclusiones ni sustituyen a un insight
   * aprobado.
   */
  annotations?: ReadonlyArray<{ id: string; date: string; label: string; type: "migracion" | "release" | "publicacion" | "incidencia" }>;
};

export const LIVE_BRANDS: readonly LiveBrandConfig[] = [
  {
    slug: "porcelanosa",
    propertyEnv: "GA4_PROPERTY_ID_PORCELANOSA",
    siteEnv: "GSC_SITE_URL_PORCELANOSA",
    markets: [
      { code: "ES", pathPrefix: "" },
      { code: "UK", pathPrefix: "uk" },
      { code: "US", pathPrefix: "us" },
      { code: "FR", pathPrefix: "fr" },
      { code: "DE", pathPrefix: "de" },
    ],
    extraMarkets: [
      { code: "EN", name: "Internacional (inglés)", pathPrefix: "en" },
      { code: "IT", name: "Italia", pathPrefix: "it" },
      { code: "PT", name: "Portugal", pathPrefix: "pt" },
      { code: "FRA", name: "Internacional (francés)", pathPrefix: "fra" },
      { code: "MX", name: "México", pathPrefix: "mx" },
      { code: "AU", name: "Australia", pathPrefix: "au" },
      { code: "BR", name: "Brasil", pathPrefix: "br" },
      { code: "CO", name: "Colombia", pathPrefix: "co" },
      { code: "CL", name: "Chile", pathPrefix: "cl" },
      { code: "RU", name: "Rusia", pathPrefix: "ru" },
      { code: "CN", name: "China", pathPrefix: "cn" },
      { code: "KR", name: "Corea del Sur", pathPrefix: "kr" },
      { code: "IL", name: "Israel", pathPrefix: "il" },
    ],
    allPrefixes: ["uk", "en", "us", "au", "fr", "fra", "de", "it", "pt", "br", "mx", "co", "cl", "ru", "cn", "kr", "il"],
    brandRegex: "porcelanosa",
  },
  {
    slug: "noken",
    propertyEnv: "GA4_PROPERTY_ID_NOKEN",
    siteEnv: "GSC_SITE_URL_NOKEN",
    markets: [
      { code: "ES", pathPrefix: "es" },
      { code: "UK", pathPrefix: "en_gb" },
      { code: "US", pathPrefix: "us" },
      { code: "FR", pathPrefix: "fr" },
      { code: "DE", pathPrefix: "de" },
    ],
    extraMarkets: [
      { code: "IT", name: "Italia", pathPrefix: "it" },
      { code: "PT", name: "Portugal", pathPrefix: "pt" },
      { code: "MX", name: "México", pathPrefix: "mx" },
      { code: "RU", name: "Rusia", pathPrefix: "ru" },
      { code: "AU", name: "Australia", pathPrefix: "au" },
    ],
    allPrefixes: ["es", "en_gb", "us", "au", "fr", "de", "it", "pt", "mx", "ru"],
    brandRegex: "noken|нокен|porcelanosa",
  },
  {
    /*
     * Xtone (D-036). La V1 solo declaraba España en la raíz y el resto del sitio
     * caía dentro; el sitio publica además /en, /fr, /de, /pt, /it, /pl y /zh
     * (detectado en GSC y GA4 el 2026-09-23). La marca se escribe de muchas
     * formas en las búsquedas —«xstone», «x tone», «x-tone»— y todas son marca.
     */
    slug: "xtone",
    propertyEnv: "GA4_PROPERTY_ID_XTONE",
    siteEnv: "GSC_SITE_URL_XTONE",
    markets: [
      { code: "ES", pathPrefix: "" },
      { code: "UK", pathPrefix: "en", country: { ga4: "United Kingdom", gsc: "gbr" } },
      { code: "US", pathPrefix: "en", country: { ga4: "United States", gsc: "usa" } },
      { code: "FR", pathPrefix: "fr" },
      { code: "DE", pathPrefix: "de" },
    ],
    extraMarkets: [
      { code: "PT", name: "Portugal", pathPrefix: "pt" },
      { code: "IT", name: "Italia", pathPrefix: "it" },
      { code: "PL", name: "Polonia", pathPrefix: "pl" },
      { code: "ZH", name: "China (chino)", pathPrefix: "zh" },
    ],
    allPrefixes: ["en", "fr", "de", "pt", "it", "pl", "zh"],
    brandRegex: "x[ -]?s?tone|porcelanosa",
    // Tamara Falcó es embajadora de Xtone: ~55 k impresiones al trimestre que buscan a la persona, no la superficie.
    opportunityExcludeRegex: "tamara|falc[oó]",
    annotations: [
      {
        // Detectado el 2026-09-23: primeras impresiones en GSC de /productos/porcelanico/ y /en/products/
        // el 2026-07-23; 634 URL antiguas pierden >80 % de sus clics en los 90 días siguientes.
        id: "xtone-migracion-urls-2026-07",
        date: "2026-07-23",
        label: "Xtone · nueva estructura de URLs (detectada en GSC)",
        type: "migracion",
      },
    ],
  },
];

export type ResolvedLiveBrand = LiveBrandConfig & { propertyId: string | null; siteUrl: string | null };

export function resolveLiveBrands(env: Env): ResolvedLiveBrand[] {
  return LIVE_BRANDS.map((brand) => ({
    ...brand,
    propertyId: env[brand.propertyEnv]?.trim() || null,
    siteUrl: env[brand.siteEnv]?.trim() || null,
  }));
}

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Prefijos hermanos del mercado raíz: todo lo que NO es el mercado raíz. */
function siblingsOf(brand: LiveBrandConfig) {
  return brand.allPrefixes.map(escape).join("|");
}

/** Filtro GA4 sobre la landing page y, si el mercado lo declara, el país. `null` = todo el sitio. */
export function ga4MarketFilter(brand: LiveBrandConfig, market: MarketScope | null): Record<string, unknown> | null {
  if (!market) return null;
  const path = ga4PathFilter(brand, market);
  if (!market.country) return path;
  const country = { filter: { fieldName: "country", stringFilter: { matchType: "EXACT", value: market.country.ga4 } } };
  return { andGroup: { expressions: [path, country] } };
}

function ga4PathFilter(brand: LiveBrandConfig, market: MarketScope): Record<string, unknown> {
  const field = "landingPagePlusQueryString";
  if (market.pathPrefix) {
    return { filter: { fieldName: field, stringFilter: { matchType: "FULL_REGEXP", value: `^/${escape(market.pathPrefix)}([/?#].*)?$`, caseSensitive: false } } };
  }
  return { notExpression: { filter: { fieldName: field, stringFilter: { matchType: "FULL_REGEXP", value: `^/(${siblingsOf(brand)})([/?#].*)?$`, caseSensitive: false } } } };
}

/** Filtros GSC sobre la URL completa y, si el mercado lo declara, el país. Vacío = todo el sitio. */
export function gscMarketFilters(brand: LiveBrandConfig, market: MarketScope | null): GscFilter[] {
  if (!market) return [];
  const page: GscFilter = market.pathPrefix
    ? { dimension: "page", operator: "includingRegex", expression: `^https?://[^/]+/${escape(market.pathPrefix)}([/?#].*)?$` }
    : { dimension: "page", operator: "excludingRegex", expression: `^https?://[^/]+/(${siblingsOf(brand)})([/?#].*)?$` };
  return market.country ? [page, { dimension: "country", operator: "equals", expression: market.country.gsc }] : [page];
}

/** Todos los mercados que el informe ofrece para una marca: Tier 1 primero, luego el resto. */
export function reportMarketsOf(brand: LiveBrandConfig): Array<{ code: string; name: string | null; tier1: boolean; scope: MarketScope }> {
  return [
    ...brand.markets.map((market) => ({ code: market.code as string, name: null, tier1: true, scope: market })),
    ...(brand.extraMarkets ?? []).map((market) => ({ code: market.code, name: market.name, tier1: false, scope: market })),
  ];
}
