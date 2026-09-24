/**
 * Taxonomía canónica del grupo.
 *
 * `BRANDS` es la única lista de marcas del monorepo (P2.2). Antes vivía
 * duplicada en `PILOT_PROJECTS`/`EXPANSION_PROJECTS` y en `EDITORIAL_BRANDS`;
 * ambas se derivan ahora de aquí para que no puedan divergir.
 *
 * `v1Sources` no es una aspiración: reproduce lo que la V1 tenía realmente
 * conectado por marca según `src/lib/config/projects.ts` de
 * `~/Desktop/Proyectos/seo-dashboard` (auditado en P2.1). Es la referencia de
 * cobertura que P3 y P11 deben recuperar, y lo que permite declarar en pantalla
 * qué se pierde temporalmente al migrar.
 */

export const BRAND_SLUGS = [
  "porcelanosa",
  "noken",
  "ecommerce",
  "butech",
  "antic-colonial",
  "krion",
  "xtone",
  "gamadecor",
] as const;

export type BrandSlug = (typeof BRAND_SLUGS)[number];

/** Fuentes que una marca puede tener conectadas de forma independiente. */
export type BrandSourceMap = { ga4: boolean; gsc: boolean; semrush: boolean; siteAudit: boolean };

export type Brand = {
  slug: BrandSlug;
  name: string;
  code: string;
  /** Host principal sin `www`. `null` cuando la V1 no lo declaraba (Gamadecor: solo GA4). */
  domain: string | null;
  /** Piloto de datos reales de V2 (P3): Porcelanosa, Noken y, desde D-036, Xtone. */
  pilot: boolean;
  /** Ola de expansión prevista en P11. 0 = piloto. */
  wave: number;
  v1Sources: BrandSourceMap;
};

const ALL: BrandSourceMap = { ga4: true, gsc: true, semrush: true, siteAudit: true };
const GA4_ONLY: BrandSourceMap = { ga4: true, gsc: false, semrush: false, siteAudit: false };
const GA4_GSC: BrandSourceMap = { ga4: true, gsc: true, semrush: false, siteAudit: false };

export const BRANDS = [
  { slug: "porcelanosa", name: "Porcelanosa", code: "PORCE", domain: "porcelanosa.com", pilot: true, wave: 0, v1Sources: ALL },
  { slug: "noken", name: "Noken", code: "NOKEN", domain: "noken.com", pilot: true, wave: 0, v1Sources: ALL },
  { slug: "ecommerce", name: "Ecommerce", code: "ECOM", domain: "store.porcelanosa.com", pilot: false, wave: 1, v1Sources: ALL },
  { slug: "butech", name: "Butech", code: "BUTECH", domain: "butech.es", pilot: false, wave: 1, v1Sources: ALL },
  { slug: "antic-colonial", name: "Antic Colonial", code: "AC", domain: "anticcolonial.com", pilot: false, wave: 2, v1Sources: ALL },
  { slug: "krion", name: "Krion", code: "KRION", domain: "krion.com", pilot: false, wave: 2, v1Sources: GA4_ONLY },
  { slug: "xtone", name: "XTONE", code: "XTONE", domain: "xtone-surface.com", pilot: true, wave: 0, v1Sources: GA4_GSC },
  { slug: "gamadecor", name: "Gamadecor", code: "GD", domain: null, pilot: false, wave: 3, v1Sources: GA4_ONLY },
] as const satisfies ReadonlyArray<Brand>;

export const SOURCE_LABELS: Record<keyof BrandSourceMap, string> = {
  ga4: "GA4",
  gsc: "Search Console",
  semrush: "SEMrush",
  siteAudit: "Auditoría técnica",
};

export function findBrand(slug: string): Brand | null {
  return BRANDS.find((brand) => brand.slug === slug) ?? null;
}

/** Marcas del piloto analítico de V2. El calendario editorial cubre las ocho desde P1. */
export const PILOT_PROJECTS: readonly Brand[] = BRANDS.filter((brand) => brand.pilot);

/**
 * Si la marca tiene serie analítica en V2. Es la única pregunta que separa lo
 * que se puede medir de lo que solo se puede describir, y desde D-033 hay que
 * hacerla explícitamente: ser seleccionable ya no implica tener datos.
 */
export function isPilotProject(slug: string): boolean {
  return findBrand(slug)?.pilot ?? false;
}

/** Marcas cuya analítica llega con la expansión de P11. */
export const EXPANSION_PROJECTS: readonly Brand[] = BRANDS.filter((brand) => !brand.pilot);

/**
 * Secuencia de expansión acordada, agrupada por ola y en orden. Se deriva de
 * `wave` porque escribirla a mano ya la había hecho divergir: la página de
 * proyectos anunciaba «L'Antic Colonial» cuando el nombre canónico es «Antic
 * Colonial», y una marca reasignada de ola habría quedado en el sitio antiguo.
 */
export function expansionWaves(): Array<{ wave: number; brands: readonly Brand[] }> {
  const waves = [...new Set(EXPANSION_PROJECTS.map((brand) => brand.wave))].sort((a, b) => a - b);
  return waves.map((wave) => ({ wave, brands: EXPANSION_PROJECTS.filter((brand) => brand.wave === wave) }));
}

export const MARKETS = [
  { code: "ES", name: "España" },
  { code: "UK", name: "Reino Unido" },
  { code: "US", name: "Estados Unidos" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
] as const;

export const PERIODS = [
  { key: "28d", label: "Últimos 28 días" },
  { key: "90d", label: "Últimos 90 días" },
  { key: "180d", label: "Últimos 180 días" },
  { key: "12m", label: "Últimos 12 meses" },
  { key: "24m", label: "Últimos 24 meses" },
] as const;

export const PROJECT_CHAPTERS = [
  { key: "resumen", label: "Resumen" },
  { key: "negocio", label: "Negocio" },
  { key: "demanda", label: "Demanda y visibilidad" },
  { key: "contenido", label: "Contenido" },
  { key: "tecnica", label: "Técnica" },
  { key: "mercados", label: "Mercados" },
  { key: "geo", label: "GEO" },
  { key: "cronologia", label: "Cronología e informes" },
] as const;
