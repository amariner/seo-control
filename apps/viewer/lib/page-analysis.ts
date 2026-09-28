import type { BrandReport } from "@seo/contracts";

/**
 * Análisis de la pestaña Páginas (D-072). Todo sale de la muestra de páginas de
 * Search Console que ya trae el informe: no hay consultas nuevas ni cifras
 * estimadas. Las URLs que no
 * están en la muestra anterior no cuentan como cero: quedan «sin dato anterior».
 */

type Page = BrandReport["pages"][number];

export const PAGE_KINDS = [
  { key: "inicio", label: "Inicio" },
  { key: "ficha", label: "Fichas de producto" },
  { key: "categoria", label: "Categorías y colecciones" },
  { key: "espacios", label: "Espacios e inspiración" },
  { key: "blog", label: "Blog y noticias" },
  { key: "recursos", label: "Descargas y recursos" },
  { key: "tiendas", label: "Tiendas y contacto" },
  { key: "institucional", label: "Marca e institucional" },
  { key: "tecnica", label: "Técnicas y legado" },
  { key: "otras", label: "Otras" },
] as const;
export type PageKind = (typeof PAGE_KINDS)[number]["key"];
const KIND_LABEL = new Map<string, string>(
  PAGE_KINDS.map((item) => [item.key, item.label]),
);
export const pageKindLabel = (kind: PageKind) => KIND_LABEL.get(kind)!;

const PRODUCT_ONE =
  /^(producto|product|produit|prodotto|produkt|produto|produkt)$/;
const PRODUCT_MANY =
  /^(productos|products|produits|prodotti|produkte|produtos|produkty|colecciones|coleccion|collections?|collezioni|kollektionen|serie|series)$/;
const SPACES =
  /^(espacios|spaces|espaces|spazi|raeume|räume|espacos|przestrzenie|proyectos|projects|projets|progetti|inspiracion|inspiration|ambientes|cocinas?|kitchens?|cuisines?|cucine?|kuechen?|banos?|bathrooms?|salles?-de-bain|bagni?|living|exterior|outdoor|into)$/;
const BLOG =
  /^(blog|noticias|news|actualidad|tendencias|trends|magazine|relatos|stories|prensa|press)$/;
const RESOURCES =
  /^(static|app|uploads|wp-content|recursos|resources|ressources|risorse|descargas|downloads|catalogos|catalogues|catalogs|library|biblioteca)$/;
const STORES =
  /^(tiendas|stores|showrooms?|boutiques|negozi|donde-comprar|where-to-buy|dealers|distribuidores|contacto|contact|kontakt|contatti|contatto)$/;
const CORPORATE =
  /^(sobre-.*|que-es-.*|about.*|a-propos.*|premios.*|awards?|nota-legal|aviso-legal|legal.*|privacidad|privacy.*|cookies?.*|preguntas-frecuentes|faqs?|profesional(es)?|professionals?|contract|empresa|company|sostenibilidad|sustainability)$/;
const TECHNICAL =
  /^(wp-.*|login|customer|cart|carrito|checkout|account|mi-cuenta|search|buscar|feed|xmlrpc\.php)$/;

/** Carpeta de idioma o país: dos letras (`en`, `fr`), `en_gb`/`en-gb` o `fra`. */
const LOCALE = /^([a-z]{2}([_-][a-z]{2})?|fra)$/i;

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split(/[?#]/)[0]!;
  }
};
const segmentsOf = (path: string) =>
  path
    .split("/")
    .filter(Boolean)
    .map((part) => {
      try {
        return decodeURIComponent(part).toLowerCase();
      } catch {
        return part.toLowerCase();
      }
    });

/** La raíz del dominio es un mercado (España en Xtone y Porcelanosa): se nombra como tal. */
export function rootLabelOf(
  markets: BrandReport["markets"],
): string | undefined {
  const root = markets.find((item) =>
    item.definition.startsWith("raíz del dominio"),
  );
  return root ? `${root.name} (raíz)` : undefined;
}

/** Prefijo de idioma o mercado de la URL; cadena vacía en la raíz. */
export function localeOf(url: string): string {
  const first = segmentsOf(pathOf(url))[0];
  return first && LOCALE.test(first) ? first.replace("-", "_") : "";
}

/** Tipo de plantilla por la ruta, sin el prefijo de idioma. Heurística, no taxonomía. */
export function pageKindOf(url: string): PageKind {
  const path = pathOf(url);
  const segments = segmentsOf(path);
  if (segments.length && LOCALE.test(segments[0]!)) segments.shift();
  if (/\.(pdf|docx?|xlsx?|zip|dwg|jpe?g|png|webp)$/i.test(path))
    return "recursos";
  if (!segments.length) return "inicio";
  const first = segments[0]!;
  if (TECHNICAL.test(first)) return "tecnica";
  if (PRODUCT_ONE.test(first))
    return segments.length > 1 ? "ficha" : "categoria";
  if (PRODUCT_MANY.test(first))
    return segments.length > 2 ? "ficha" : "categoria";
  if (SPACES.test(first)) return "espacios";
  if (BLOG.test(first)) return "blog";
  if (RESOURCES.test(first)) return "recursos";
  if (STORES.test(first)) return "tiendas";
  if (CORPORATE.test(first)) return "institucional";
  return "otras";
}

/** Ruta comparable entre variantes: sin query, sin barra final y en minúsculas. */
export const canonicalPath = (url: string) => {
  const path = pathOf(url).toLowerCase();
  return path.length > 1 ? path.replace(/\/+$/, "") || "/" : path;
};

/** Tendencia de la URL frente al periodo anterior, para filtrar la tabla. */
export const PAGE_TRENDS = [
  { key: "ganan", label: "Ganan clics" },
  { key: "pierden", label: "Pierden clics" },
  { key: "igual", label: "Sin cambio" },
  { key: "sin-dato", label: "Sin dato anterior" },
] as const;
export type PageTrend = (typeof PAGE_TRENDS)[number]["key"];
export function pageTrendOf(
  page: Pick<Page, "clicks" | "previousClicks">,
): PageTrend {
  if (page.previousClicks === null) return "sin-dato";
  return page.clicks > page.previousClicks
    ? "ganan"
    : page.clicks < page.previousClicks
      ? "pierden"
      : "igual";
}

/** Una ruta que Google muestra en varias URLs y qué hacer con las secundarias. */
/** Formas en que se repite una misma ruta: las columnas de la tabla cruzada del brief. */
export const DUPLICATE_FORMS = [
  { key: "slash", label: "Con barra final" },
  { key: "noslash", label: "Sin barra final" },
  { key: "case", label: "Con mayúsculas" },
  { key: "params", label: "Con parámetros" },
] as const;
export type DuplicateForm = (typeof DUPLICATE_FORMS)[number]["key"];
export type DuplicateCell = {
  urls: number;
  clicks: number;
  impressions: number;
  sample: string;
};

export function duplicateFormOf(url: string): DuplicateForm {
  const parsed = new URL(url, "https://x");
  if (parsed.search) return "params";
  if (parsed.pathname !== parsed.pathname.toLowerCase()) return "case";
  return parsed.pathname.endsWith("/") ? "slash" : "noslash";
}

const FORM_TEXT: Record<DuplicateForm, string> = {
  slash: "con barra",
  noslash: "sin barra",
  case: "con mayúsculas",
  params: "con parámetros",
};
function groupAction(
  cells: Partial<Record<DuplicateForm, DuplicateCell>>,
  main: DuplicateForm,
) {
  const actions: string[] = [];
  const target = main === "params" || main === "case" ? "slash" : main;
  for (const form of ["slash", "noslash", "case"] as const) {
    if (form === target || !cells[form]) continue;
    actions.push(`301 ${FORM_TEXT[form]} → ${FORM_TEXT[target]}`);
  }
  if (cells.params)
    actions.push(
      `Canonical en ${cells.params.urls} URL${cells.params.urls > 1 ? "s" : ""} con parámetros`,
    );
  return actions.join(" · ");
}

export type PageDuplicate = {
  path: string;
  /** Cruce ruta × forma: URLs, clics e impresiones de cada forma presente. */
  cells: Partial<Record<DuplicateForm, DuplicateCell>>;
  mainForm: DuplicateForm;
  /** Qué hacer con las formas secundarias. */
  action: string;
  /** La que más clics recibe; se propone como principal a falta del canonical del crawl. */
  main: { url: string; clicks: number };
  variants: Array<{ url: string; clicks: number }>;
  /** Clics de las variantes secundarias. */
  scattered: number;
};

export type PageGroup = {
  key: string;
  label: string;
  pages: number;
  clicks: number;
  impressions: number;
  /** % sobre los clics de la muestra. */
  share: number;
  ctr: number | null;
  /** Media ponderada por impresiones. */
  position: number | null;
};

export type PageAnalysis = {
  available: boolean;
  limitReached: boolean;
  visible: number;
  previousVisible: number | null;
  ranks: { top3: number; top10: number; rest: number };
  withClicks: number;
  impressionsOnly: number;
  clicks: number;
  top10Share: number | null;
  topPage: { page: string; share: number } | null;
  comparable: number;
  gaining: number;
  losing: number;
  netClicks: number;
  withoutPrevious: number;
  /** Clics de las URLs sin dato en la muestra anterior: nuevas o fuera de aquella muestra. */
  withoutPreviousClicks: number;
  /** URLs con parámetros (`?`) que Google muestra como páginas propias. */
  parameterUrls: number;
  variantGroups: number;
  variantClicks: number;
  duplicates: PageDuplicate[];
  kinds: PageGroup[];
  locales: PageGroup[];
};

function group(
  pages: readonly Page[],
  keyOf: (page: Page) => string,
  labelOf: (key: string) => string,
  total: number,
): PageGroup[] {
  const groups = new Map<
    string,
    { pages: number; clicks: number; impressions: number; weighted: number }
  >();
  for (const page of pages) {
    const key = keyOf(page);
    const entry = groups.get(key) ?? {
      pages: 0,
      clicks: 0,
      impressions: 0,
      weighted: 0,
    };
    entry.pages += 1;
    entry.clicks += page.clicks;
    entry.impressions += page.impressions;
    entry.weighted += page.position * page.impressions;
    groups.set(key, entry);
  }
  return [...groups]
    .map(([key, entry]) => ({
      key,
      label: labelOf(key),
      pages: entry.pages,
      clicks: entry.clicks,
      impressions: entry.impressions,
      share: total ? (entry.clicks / total) * 100 : 0,
      ctr: entry.impressions ? (entry.clicks / entry.impressions) * 100 : null,
      position: entry.impressions ? entry.weighted / entry.impressions : null,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions);
}

export function analysePages(
  report: Pick<BrandReport, "pages" | "explorerCoverage">,
  /** Nombre de la raíz del dominio, p. ej. «España» si el mercado ES vive sin prefijo. */
  rootLabel = "Raíz (sin prefijo)",
): PageAnalysis {
  const pages = report.pages;
  const coverage = report.explorerCoverage;
  const clicks = pages.reduce((sum, page) => sum + page.clicks, 0);
  const impressions = pages.reduce((sum, page) => sum + page.impressions, 0);
  const byClicks = [...pages].sort((a, b) => b.clicks - a.clicks);
  const comparable = pages.filter((page) => page.previousClicks !== null);
  const variants = new Map<string, Page[]>();
  for (const page of pages) {
    const key = canonicalPath(page.page);
    variants.set(key, [...(variants.get(key) ?? []), page]);
  }
  const duplicates: PageDuplicate[] = [];
  for (const [path, list] of variants) {
    if (list.length < 2) continue;
    const [main, ...rest] = [...list].sort(
      (a, b) => b.clicks - a.clicks || b.impressions - a.impressions,
    );
    const cells: Partial<Record<DuplicateForm, DuplicateCell>> = {};
    for (const page of list) {
      const form = duplicateFormOf(page.page);
      const cell = (cells[form] ??= {
        urls: 0,
        clicks: 0,
        impressions: 0,
        sample: page.page,
      });
      cell.urls += 1;
      cell.clicks += page.clicks;
      cell.impressions += page.impressions;
    }
    const mainForm = duplicateFormOf(main!.page);
    duplicates.push({
      path,
      cells,
      mainForm,
      action: groupAction(cells, mainForm),
      main: { url: main!.page, clicks: main!.clicks },
      variants: rest.map((page) => ({
        url: page.page,
        clicks: page.clicks,
      })),
      scattered: rest.reduce((sum, page) => sum + page.clicks, 0),
    });
  }
  duplicates.sort(
    (a, b) => b.scattered - a.scattered || b.main.clicks - a.main.clicks,
  );

  return {
    available: coverage.pages.available,
    limitReached: coverage.pages.limitReached,
    visible: pages.length,
    previousVisible: coverage.previousPages.available
      ? coverage.previousPages.rowsReturned
      : null,
    ranks: {
      top3: pages.filter((page) => page.position <= 3).length,
      top10: pages.filter((page) => page.position > 3 && page.position <= 10)
        .length,
      rest: pages.filter((page) => page.position > 10).length,
    },
    withClicks: pages.filter((page) => page.clicks > 0).length,
    impressionsOnly: pages.filter(
      (page) => page.clicks === 0 && page.impressions > 0,
    ).length,
    clicks,
    top10Share: clicks
      ? (byClicks.slice(0, 10).reduce((sum, page) => sum + page.clicks, 0) /
          clicks) *
        100
      : null,
    topPage:
      clicks && byClicks[0]
        ? { page: byClicks[0].page, share: (byClicks[0].clicks / clicks) * 100 }
        : null,
    comparable: comparable.length,
    gaining: comparable.filter((page) => page.clicks > page.previousClicks!)
      .length,
    losing: comparable.filter((page) => page.clicks < page.previousClicks!)
      .length,
    netClicks: comparable.reduce(
      (sum, page) => sum + page.clicks - page.previousClicks!,
      0,
    ),
    withoutPrevious: pages.length - comparable.length,
    withoutPreviousClicks: pages
      .filter((page) => page.previousClicks === null)
      .reduce((sum, page) => sum + page.clicks, 0),
    parameterUrls: pages.filter((page) => page.page.includes("?")).length,
    variantGroups: duplicates.length,
    variantClicks: duplicates.reduce((sum, item) => sum + item.scattered, 0),
    duplicates,
    kinds: group(
      pages,
      (page) => pageKindOf(page.page),
      (key) => KIND_LABEL.get(key) ?? key,
      clicks,
    ),
    locales: group(
      pages,
      (page) => localeOf(page.page),
      (key) => (key ? `/${key}` : rootLabel),
      clicks,
    ),
  };
}
