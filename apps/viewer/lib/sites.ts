import { PRIMARY_SITES, SOURCE_LABELS, type BrandSourceMap, type Site } from "@seo/contracts";

/**
 * Lectura del catálogo de webs del grupo para `/projects` (D-032).
 *
 * La página se queda con el pintado y la selección vive aquí, como en
 * `lib/portfolio.ts`: son reglas que conviene poder probar sin montar una
 * pantalla, y la de Tier 1 ya tiene un caso que engaña a la vista.
 */

/**
 * Los cinco mercados que la interfaz sabe filtrar hoy (`marketCodeSchema`).
 * Un sitio puede tener 18 mercados importados y solo cinco navegables, y la
 * ficha lo dice en vez de enseñarlos todos como si fueran equivalentes.
 */
export const TIER_1_MARKETS = ["ES", "UK", "US", "FR", "DE"] as const;

export function isTier1(marketCode: string): boolean {
  return (TIER_1_MARKETS as readonly string[]).includes(marketCode.toUpperCase());
}

export function tier1Count(site: Site): number {
  return site.markets.filter((market) => isTier1(market.code)).length;
}

/** Cuántas de las cuatro fuentes tenía conectadas el sitio en V1. */
export function connectedSourceCount(site: Site): number {
  return (Object.keys(SOURCE_LABELS) as Array<keyof BrandSourceMap>).filter((key) => site.sources[key]).length;
}

export function connectedSources(site: Site): Array<keyof BrandSourceMap> {
  return (Object.keys(SOURCE_LABELS) as Array<keyof BrandSourceMap>).filter((key) => site.sources[key]);
}

/**
 * Webs que muestra la pantalla. El filtro global de proyecto solo cubre el
 * piloto (`projectSlugSchema`), así que cualquier otro valor deja la lista
 * entera: es una vista de catálogo, y vaciarla por un filtro que no la
 * entiende sería peor que ignorarlo.
 */
export function listSites(projectFilter: string): readonly Site[] {
  const selected = PRIMARY_SITES.filter((site) => site.slug === projectFilter);
  return selected.length ? selected : PRIMARY_SITES;
}

export function totalMarkets(sites: readonly Site[]): number {
  return sites.reduce((count, site) => count + site.markets.length, 0);
}
