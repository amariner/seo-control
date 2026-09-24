import { BRAND_SLUGS, type BrandSlug, type BrandSourceMap } from "./taxonomy";

/**
 * Los sitios del grupo, importados de `src/lib/config/projects.ts` de V1.
 *
 * V1 llamaba «proyecto» a lo que en realidad era una WEB, y por eso su lista de
 * diez claves mezclaba cosas distintas. Al migrar, V2 colapsó esa lista en las
 * ocho marcas de `taxonomy.ts`, y en esa operación se perdieron dos cosas que
 * este módulo recupera:
 *
 * 1. `product-finder`, que desapareció por completo. No era un residuo: V1
 *    tenía `GA4_PROPERTY_ID_PRODUCT_FINDER_ES` y `GSC_SITE_URL_PRODUCT_FINDER`
 *    en su `.env`. No es una marca —es un buscador de Porcelanosa que vive en
 *    dos hosts a la vez—, así que entra como sitio y no como novena marca.
 * 2. Los 61 mercados por sitio, que en V2 se habían quedado en una sola lista
 *    global de cinco. Porcelanosa servía 18, Krion 13, Noken 10 y Gamadecor 7;
 *    con `pathPrefix` y `catalogSlug` propios, que es lo que permite filtrar
 *    GSC y GA4 por mercado. Sin eso, «Tier 1 · Todos» era una aproximación.
 *
 * La décima clave de V1, `conjunto`, NO se importa: no era una web sino la
 * vista agregada del grupo, y en V2 ya la sirve `/portfolio`.
 *
 * Marca y sitio son cosas distintas: una marca puede tener varios sitios
 * (Porcelanosa tiene el suyo y `product-finder`) y `BRANDS` sigue siendo la
 * lista canónica de ocho. Este módulo no la toca.
 *
 * La entrada de la importación está archivada en `data/archive/v1/projects.json`
 * y `pnpm --filter @seo/contracts import:v1-projects` la regenera. `sites.test.ts`
 * compara esta traducción contra ese archivo campo a campo, para que la
 * migración no pueda perder ni inventar un mercado en silencio.
 */

/** Idiomas que V1 soportaba para títulos editoriales y stopwords. */
export const SITE_LOCALES = ["es", "en", "fr", "de", "ru", "it", "pt", "nl", "pl", "zh", "ko", "he"] as const;
export type SiteLocale = (typeof SITE_LOCALES)[number];

/**
 * Un mercado dentro de un sitio. El `code` es el alias canónico y el
 * `pathPrefix` la ruta real bajo el host, que NO siempre coinciden: Noken sirve
 * Reino Unido bajo `/en_gb/`, y los mercados en la raíz llevan prefijo vacío.
 */
export type SiteMarket = {
  code: string;
  /** Ruta bajo el host, sin barras. Cadena vacía cuando el mercado va en la raíz. */
  pathPrefix: string;
  /** Subdirectorio de catálogo. Alimenta el árbol comercial de autoridad temática. */
  catalogSlug: string;
  /**
   * Solo cuando los productos NO cuelgan del mismo path que las categorías.
   * Butech es el único caso: categorías en `/categorias/`, productos planos en
   * `/productos/`.
   */
  productCatalogSlug?: string;
  locale: SiteLocale;
  /** Base de datos de SEMrush del mercado; no siempre igual al `code`. */
  semrushDatabase: string;
  label: string;
  flag: string;
};

/**
 * Términos de marca para el desglose branded/non-branded. `own` es la marca del
 * sitio; `umbrella` la marca paraguas del grupo cuando aplica (Noken, Butech,
 * XTONE y Antic Colonial van bajo Porcelanosa).
 */
export type BrandTerms = { own: readonly string[]; umbrella: readonly string[] };

/**
 * Términos que descartan una query como candidata a post nuevo en autoridad
 * temática: marca propia, competidores y modelos propios. Coincidencia por
 * subcadena sin distinguir mayúsculas; basta una para descartar.
 */
export type SuggestedExclusions = {
  ownBrand: readonly string[];
  competitors: readonly string[];
  productModels: readonly string[];
};

export type Site = {
  slug: string;
  name: string;
  /** Marca del grupo a la que pertenece el sitio. */
  brand: BrandSlug;
  /**
   * Web principal de su marca. Las ocho lo son; `product-finder` no, porque es
   * una herramienta de Porcelanosa y no su sitio. La interfaz lista las
   * principales: un secundario con hosts sin confirmar no debe aparecer como si
   * fuera un proyecto medible.
   */
  primary: boolean;
  /** Clave que tenía en V1. Es el ancla de la comprobación de paridad. */
  v1Key: string;
  /**
   * Hosts que sirve el sitio. Los de las ocho marcas vienen del dominio
   * auditado en P2.1; Gamadecor queda vacío porque V1 nunca lo declaró (solo
   * tenía GA4). Los dos de `product-finder` salen de un comentario del código
   * de V1, no de configuración: hay que confirmarlos antes de usarlos para
   * pedir datos.
   */
  hosts: readonly string[];
  /**
   * Lo que V1 tenía conectado de verdad. Donde V1 no declaraba `sources`, su
   * regla era caer al monolito `hasData`, y aquí ya viene resuelto.
   */
  sources: BrandSourceMap;
  brandTerms: BrandTerms | null;
  suggestedExclusions: SuggestedExclusions | null;
  markets: readonly SiteMarket[];
};

export const SITES = [
  {
    slug: "porcelanosa",
    name: "Porcelanosa",
    brand: "porcelanosa",
    primary: true,
    v1Key: "porcelanosa",
    hosts: ["porcelanosa.com"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: { own: ["porcelanosa"], umbrella: [] },
    suggestedExclusions: null,
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "uk", pathPrefix: "uk", catalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Reino Unido", flag: "🇬🇧" },
      { code: "en", pathPrefix: "en", catalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Internacional EN", flag: "🌍" },
      { code: "us", pathPrefix: "us", catalogSlug: "products", locale: "en", semrushDatabase: "us", label: "Estados Unidos", flag: "🇺🇸" },
      { code: "au", pathPrefix: "au", catalogSlug: "products", locale: "en", semrushDatabase: "au", label: "Australia", flag: "🇦🇺" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
      { code: "fra", pathPrefix: "fra", catalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francés internacional", flag: "🌍" },
      { code: "de", pathPrefix: "de", catalogSlug: "produkte", locale: "de", semrushDatabase: "de", label: "Alemania", flag: "🇩🇪" },
      { code: "it", pathPrefix: "it", catalogSlug: "prodotti", locale: "it", semrushDatabase: "it", label: "Italia", flag: "🇮🇹" },
      { code: "pt", pathPrefix: "pt", catalogSlug: "produtos", locale: "pt", semrushDatabase: "pt", label: "Portugal", flag: "🇵🇹" },
      { code: "br", pathPrefix: "br", catalogSlug: "produtos", locale: "pt", semrushDatabase: "br", label: "Brasil", flag: "🇧🇷" },
      { code: "mx", pathPrefix: "mx", catalogSlug: "productos", locale: "es", semrushDatabase: "mx", label: "México", flag: "🇲🇽" },
      { code: "co", pathPrefix: "co", catalogSlug: "productos", locale: "es", semrushDatabase: "co", label: "Colombia", flag: "🇨🇴" },
      { code: "cl", pathPrefix: "cl", catalogSlug: "productos", locale: "es", semrushDatabase: "cl", label: "Chile", flag: "🇨🇱" },
      { code: "ru", pathPrefix: "ru", catalogSlug: "kollekcii", locale: "ru", semrushDatabase: "ru", label: "Rusia", flag: "🇷🇺" },
      { code: "cn", pathPrefix: "cn", catalogSlug: "products", locale: "zh", semrushDatabase: "cn", label: "China", flag: "🇨🇳" },
      { code: "kr", pathPrefix: "kr", catalogSlug: "products", locale: "ko", semrushDatabase: "kr", label: "Corea", flag: "🇰🇷" },
      { code: "il", pathPrefix: "il", catalogSlug: "products", locale: "he", semrushDatabase: "il", label: "Israel / Hebreo", flag: "🇮🇱" },
    ],
  },
  {
    slug: "noken",
    name: "Noken",
    brand: "noken",
    primary: true,
    v1Key: "noken",
    hosts: ["noken.com"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: { own: ["noken", "нокен"], umbrella: ["porcelanosa"] },
    suggestedExclusions: {
      ownBrand: ["noken"],
      competitors: ["porcelanosa", "roca", "grohe", "hansgrohe", "kohler", "duravit", "geberit", "villeroy", "tres", "ramon soler", "ramón soler", "jacob delafon", "sanitana", "gala"],
      productModels: ["acro", "acro compact", "lounge", "nk", "nk concept", "nk logic", "nk one", "pure", "pure line", "urban", "urban c", "lignage", "tono", "menta", "hotels life", "imagine", "arquitect", "hi-flow", "forma"],
    },
    markets: [
      { code: "es", pathPrefix: "es", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "uk", pathPrefix: "en_gb", catalogSlug: "collections", locale: "en", semrushDatabase: "uk", label: "Reino Unido", flag: "🇬🇧" },
      { code: "us", pathPrefix: "us", catalogSlug: "collections", locale: "en", semrushDatabase: "us", label: "Estados Unidos", flag: "🇺🇸" },
      { code: "au", pathPrefix: "au", catalogSlug: "collections", locale: "en", semrushDatabase: "au", label: "Australia", flag: "🇦🇺" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "collections", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
      { code: "de", pathPrefix: "de", catalogSlug: "kollektionen", locale: "de", semrushDatabase: "de", label: "Alemania", flag: "🇩🇪" },
      { code: "it", pathPrefix: "it", catalogSlug: "collezioni", locale: "it", semrushDatabase: "it", label: "Italia", flag: "🇮🇹" },
      { code: "pt", pathPrefix: "pt", catalogSlug: "coleces", locale: "pt", semrushDatabase: "pt", label: "Portugal", flag: "🇵🇹" },
      { code: "mx", pathPrefix: "mx", catalogSlug: "colecciones", locale: "es", semrushDatabase: "mx", label: "México", flag: "🇲🇽" },
      { code: "ru", pathPrefix: "ru", catalogSlug: "collections", locale: "ru", semrushDatabase: "ru", label: "Rusia", flag: "🇷🇺" },
    ],
  },
  {
    slug: "ecommerce",
    name: "Ecommerce",
    brand: "ecommerce",
    primary: true,
    v1Key: "ecommerce",
    hosts: ["store.porcelanosa.com"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: { own: ["porcelanosa"], umbrella: [] },
    suggestedExclusions: null,
    markets: [
      { code: "uk", pathPrefix: "uk", catalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Reino Unido", flag: "🇬🇧" },
      { code: "us", pathPrefix: "us", catalogSlug: "products", locale: "en", semrushDatabase: "us", label: "Estados Unidos", flag: "🇺🇸" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
    ],
  },
  {
    slug: "butech",
    name: "Butech",
    brand: "butech",
    primary: true,
    v1Key: "butech",
    hosts: ["butech.es"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: { own: ["butech"], umbrella: ["porcelanosa"] },
    suggestedExclusions: {
      ownBrand: ["butech"],
      competitors: ["schluter", "kerakoll", "weber", "mapei", "ardex", "sika", "rubi"],
      productModels: ["pro-part", "pro-mate", "pro-light", "pro-leveling", "colorstuk", "one-flex", "super-flex", "politech", "imperband", "butech system"],
    },
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "categorias", productCatalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "en", pathPrefix: "en", catalogSlug: "categories", productCatalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Inglés", flag: "🇬🇧" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "categories", productCatalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
    ],
  },
  {
    slug: "antic-colonial",
    name: "Antic Colonial",
    brand: "antic-colonial",
    primary: true,
    v1Key: "antic-colonial",
    hosts: ["anticcolonial.com"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: { own: ["antic colonial", "anticcolonial"], umbrella: ["porcelanosa"] },
    suggestedExclusions: {
      ownBrand: ["antic colonial", "anticcolonial"],
      competitors: ["porcelanosa", "bisazza", "marazzi", "mutina", "roca", "saloni", "keraben"],
      productModels: ["linkfloor"],
    },
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "catalogo", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "en", pathPrefix: "en", catalogSlug: "catalogue", locale: "en", semrushDatabase: "uk", label: "Inglés", flag: "🇬🇧" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "catalogue", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
    ],
  },
  {
    slug: "krion",
    name: "Krion",
    brand: "krion",
    primary: true,
    v1Key: "krion",
    hosts: ["krion.com"],
    sources: { ga4: true, gsc: false, semrush: false, siteAudit: false },
    brandTerms: null,
    suggestedExclusions: null,
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "en", pathPrefix: "en", catalogSlug: "applications", locale: "en", semrushDatabase: "uk", label: "Inglés", flag: "🇬🇧" },
      { code: "uk", pathPrefix: "uk", catalogSlug: "applications", locale: "en", semrushDatabase: "uk", label: "Reino Unido", flag: "🇬🇧" },
      { code: "us", pathPrefix: "us", catalogSlug: "applications", locale: "en", semrushDatabase: "us", label: "Estados Unidos", flag: "🇺🇸" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "applications", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
      { code: "de", pathPrefix: "de", catalogSlug: "anwendungen", locale: "de", semrushDatabase: "de", label: "Alemania", flag: "🇩🇪" },
      { code: "it", pathPrefix: "it", catalogSlug: "applicazioni", locale: "it", semrushDatabase: "it", label: "Italia", flag: "🇮🇹" },
      { code: "pt", pathPrefix: "pt", catalogSlug: "aplicacoes", locale: "pt", semrushDatabase: "pt", label: "Portugal", flag: "🇵🇹" },
      { code: "mx", pathPrefix: "mx", catalogSlug: "aplicaciones", locale: "es", semrushDatabase: "mx", label: "México", flag: "🇲🇽" },
      { code: "ru", pathPrefix: "ru", catalogSlug: "applications", locale: "ru", semrushDatabase: "ru", label: "Rusia", flag: "🇷🇺" },
      { code: "nl", pathPrefix: "nl", catalogSlug: "toepassingen", locale: "nl", semrushDatabase: "nl", label: "Países Bajos", flag: "🇳🇱" },
      { code: "pl", pathPrefix: "pl", catalogSlug: "zastosowania", locale: "pl", semrushDatabase: "pl", label: "Polonia", flag: "🇵🇱" },
      { code: "zh", pathPrefix: "zh", catalogSlug: "applications", locale: "zh", semrushDatabase: "cn", label: "China", flag: "🇨🇳" },
    ],
  },
  {
    slug: "xtone",
    name: "XTONE",
    brand: "xtone",
    primary: true,
    v1Key: "xtone",
    hosts: ["xtone-surface.com"],
    sources: { ga4: true, gsc: true, semrush: false, siteAudit: false },
    brandTerms: { own: ["xtone"], umbrella: ["porcelanosa"] },
    suggestedExclusions: null,
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
    ],
  },
  {
    slug: "gamadecor",
    name: "Gamadecor",
    brand: "gamadecor",
    primary: true,
    v1Key: "gamadecor",
    hosts: [],
    sources: { ga4: true, gsc: false, semrush: false, siteAudit: false },
    brandTerms: null,
    suggestedExclusions: null,
    markets: [
      { code: "es", pathPrefix: "", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "en", pathPrefix: "en", catalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Inglés", flag: "🌍" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
      { code: "de", pathPrefix: "de", catalogSlug: "produkte", locale: "de", semrushDatabase: "de", label: "Alemania", flag: "🇩🇪" },
      { code: "it", pathPrefix: "it", catalogSlug: "prodotti", locale: "it", semrushDatabase: "it", label: "Italia", flag: "🇮🇹" },
      { code: "pt", pathPrefix: "pt", catalogSlug: "produtos", locale: "pt", semrushDatabase: "pt", label: "Portugal", flag: "🇵🇹" },
      { code: "ru", pathPrefix: "ru", catalogSlug: "produkty", locale: "ru", semrushDatabase: "ru", label: "Rusia", flag: "🇷🇺" },
    ],
  },
  {
    slug: "product-finder",
    name: "Product Finder",
    brand: "porcelanosa",
    primary: false,
    v1Key: "product-finder",
    hosts: ["productfinder.porcelanosagrupo.com", "www.porcelanosa.com/productfinder"],
    sources: { ga4: true, gsc: true, semrush: true, siteAudit: true },
    brandTerms: null,
    suggestedExclusions: null,
    markets: [
      { code: "es", pathPrefix: "es", catalogSlug: "productos", locale: "es", semrushDatabase: "es", label: "España", flag: "🇪🇸" },
      { code: "en", pathPrefix: "en", catalogSlug: "products", locale: "en", semrushDatabase: "uk", label: "Inglés", flag: "🇬🇧" },
      { code: "fr", pathPrefix: "fr", catalogSlug: "produits", locale: "fr", semrushDatabase: "fr", label: "Francia", flag: "🇫🇷" },
    ],
  },] as const satisfies ReadonlyArray<Site>;

/** Unión de slugs, derivada de `SITES` para que no pueda divergir de ella. */
export type SiteSlug = (typeof SITES)[number]["slug"];

export const SITE_SLUGS: readonly SiteSlug[] = SITES.map((site) => site.slug);

export function findSite(slug: string): Site | null {
  return SITES.find((site) => site.slug === slug) ?? null;
}

/** Las webs principales del grupo: una por marca. Es lo que lista la interfaz. */
export const PRIMARY_SITES: readonly Site[] = SITES.filter((site) => site.primary);

/** Sitios de una marca. Porcelanosa es hoy la única con más de uno. */
export function sitesOfBrand(brand: BrandSlug): readonly Site[] {
  return SITES.filter((site) => site.brand === brand);
}

export function findSiteMarket(slug: string, marketCode: string): SiteMarket | null {
  return findSite(slug)?.markets.find((market) => market.code === marketCode) ?? null;
}

/**
 * Ruta bajo el host para un mercado, normalizada con barras. La raíz devuelve
 * `/` en vez de `//`, que es lo que saldría de concatenar un prefijo vacío.
 */
export function marketPath(market: SiteMarket): string {
  return market.pathPrefix ? `/${market.pathPrefix}/` : "/";
}

/** Marcas sin ningún sitio importado. Hoy ninguna; el test lo vigila. */
export function brandsWithoutSite(): readonly BrandSlug[] {
  return BRAND_SLUGS.filter((brand) => !SITES.some((site) => site.brand === brand));
}
