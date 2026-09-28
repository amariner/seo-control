import type { SiteAuditCategory, SiteAuditSeverity } from "@seo/contracts";
import type { CrawledPage, CrawlRun } from "./crawler";

/**
 * Catálogo de comprobaciones on-page (D-070). Cada una dice qué mide y por qué
 * importa; los umbrales son los habituales del sector y están aquí, a la vista.
 * No hay puntuación opaca: el panel cuenta páginas afectadas por severidad.
 */

export const THRESHOLDS = { titleMax: 60, titleMin: 30, descriptionMax: 160, descriptionMin: 70, thinWords: 200, slowMs: 1500, heavyBytes: 500_000 } as const;

type Context = {
  byUrl: Map<string, CrawledPage>;
  titleCount: Map<string, number>;
  descriptionCount: Map<string, number>;
  multilingual: boolean;
  sitemapKnown: boolean;
};

type Check = {
  id: string;
  label: string;
  severity: SiteAuditSeverity;
  category: SiteAuditCategory;
  description: string;
  test: (page: CrawledPage, ctx: Context) => boolean;
};

const html = (page: CrawledPage) => page.status === 200 && page.facts !== null;
const noindex = (page: CrawledPage) => /noindex/i.test(`${page.facts?.robotsMeta ?? ""} ${page.xRobotsTag ?? ""}`);

/** Indexable: HTML 200, sin noindex y con canonical propio (o sin canonical). */
export function isIndexable(page: CrawledPage): boolean {
  return html(page) && !noindex(page) && (!page.facts!.canonical || page.facts!.canonical === page.url);
}

const linksTo = (page: CrawledPage, ctx: Context, predicate: (target: CrawledPage) => boolean) =>
  (page.facts?.internalLinks ?? []).some((link) => {
    const target = ctx.byUrl.get(link);
    return target ? predicate(target) : false;
  });

export const CHECKS: Check[] = [
  { id: "http_4xx", label: "Error 4xx", severity: "critica", category: "rastreo", description: "La URL, enlazada desde el propio sitio, responde con error de cliente (404, 410…).", test: (p) => p.status >= 400 && p.status < 500 },
  { id: "http_5xx", label: "Error 5xx o sin respuesta", severity: "critica", category: "rastreo", description: "El servidor falla o no responde a tiempo: Google deja de rastrear si se repite.", test: (p) => p.status >= 500 || p.status === 0 },
  { id: "redirect_internal", label: "Redirección enlazada", severity: "media", category: "rastreo", description: "La URL redirige; se llegó a ella por un enlace interno que debería apuntar al destino final.", test: (p) => p.status >= 300 && p.status < 400 },
  { id: "noindex", label: "Marcada como noindex", severity: "alta", category: "indexacion", description: "Meta robots o cabecera X-Robots-Tag con noindex: no aparecerá en Google. Revisar si es intencionado.", test: (p) => html(p) && noindex(p) },
  { id: "canonical_other", label: "Canonical a otra URL", severity: "media", category: "indexacion", description: "La página cede su posicionamiento a otra URL mediante el canonical.", test: (p) => html(p) && !noindex(p) && Boolean(p.facts!.canonical) && p.facts!.canonical !== p.url },
  { id: "canonical_missing", label: "Sin canonical", severity: "baja", category: "indexacion", description: "Sin etiqueta canonical, Google elige la URL representativa por su cuenta.", test: (p) => html(p) && !p.facts!.canonical },
  { id: "sitemap_non_indexable", label: "En el sitemap y no indexable", severity: "media", category: "indexacion", description: "El sitemap debe listar solo URL indexables con respuesta 200.", test: (p, c) => c.sitemapKnown && p.inSitemap && !isIndexable(p) },
  { id: "not_in_sitemap", label: "Indexable y fuera del sitemap", severity: "baja", category: "indexacion", description: "Página indexable que el sitemap no declara: se descubre peor.", test: (p, c) => c.sitemapKnown && isIndexable(p) && !p.inSitemap },
  { id: "title_missing", label: "Sin title", severity: "alta", category: "contenido", description: "El title es la señal on-page principal y el titular del resultado en Google.", test: (p) => html(p) && !p.facts!.title },
  { id: "title_duplicate", label: "Title duplicado", severity: "media", category: "contenido", description: "Varias páginas indexables comparten title: compiten entre sí y Google reescribe el titular.", test: (p, c) => isIndexable(p) && Boolean(p.facts!.title) && (c.titleCount.get(p.facts!.title!.toLowerCase()) ?? 0) > 1 },
  { id: "title_too_long", label: `Title de más de ${THRESHOLDS.titleMax} caracteres`, severity: "baja", category: "contenido", description: "Google corta el titular hacia los 60 caracteres.", test: (p) => html(p) && (p.facts!.title?.length ?? 0) > THRESHOLDS.titleMax },
  { id: "title_too_short", label: `Title de menos de ${THRESHOLDS.titleMin} caracteres`, severity: "baja", category: "contenido", description: "Un title muy corto desaprovecha la keyword y el contexto de la página.", test: (p) => html(p) && Boolean(p.facts!.title) && p.facts!.title!.length < THRESHOLDS.titleMin },
  { id: "description_missing", label: "Sin meta description", severity: "media", category: "contenido", description: "Sin description, Google improvisa el fragmento del resultado y baja el CTR.", test: (p) => isIndexable(p) && !p.facts!.description },
  { id: "description_duplicate", label: "Meta description duplicada", severity: "baja", category: "contenido", description: "Varias páginas indexables comparten description.", test: (p, c) => isIndexable(p) && Boolean(p.facts!.description) && (c.descriptionCount.get(p.facts!.description!.toLowerCase()) ?? 0) > 1 },
  { id: "description_too_long", label: `Description de más de ${THRESHOLDS.descriptionMax} caracteres`, severity: "baja", category: "contenido", description: "Google corta el fragmento hacia los 160 caracteres.", test: (p) => isIndexable(p) && (p.facts!.description?.length ?? 0) > THRESHOLDS.descriptionMax },
  { id: "description_too_short", label: `Description de menos de ${THRESHOLDS.descriptionMin} caracteres`, severity: "baja", category: "contenido", description: "Una description muy corta no vende el clic.", test: (p) => isIndexable(p) && Boolean(p.facts!.description) && p.facts!.description!.length < THRESHOLDS.descriptionMin },
  { id: "h1_missing", label: "Sin H1", severity: "alta", category: "contenido", description: "El H1 declara el tema de la página para usuarios y buscadores.", test: (p) => isIndexable(p) && p.facts!.h1.filter(Boolean).length === 0 },
  { id: "h1_multiple", label: "Varios H1", severity: "baja", category: "contenido", description: "Más de un H1 diluye cuál es el tema principal.", test: (p) => isIndexable(p) && p.facts!.h1.length > 1 },
  { id: "thin_content", label: `Menos de ${THRESHOLDS.thinWords} palabras`, severity: "media", category: "contenido", description: "Contenido escaso: difícil que posicione por algo más que la marca.", test: (p) => isIndexable(p) && p.facts!.wordCount < THRESHOLDS.thinWords },
  { id: "img_missing_alt", label: "Imágenes sin alt", severity: "baja", category: "contenido", description: "Imágenes sin atributo alt: pierden búsqueda de imágenes y accesibilidad.", test: (p) => html(p) && p.facts!.imagesWithoutAlt > 0 },
  { id: "broken_links", label: "Enlaza a URL con error", severity: "alta", category: "enlazado", description: "La página enlaza a URL internas que devuelven 4xx o 5xx.", test: (p, c) => html(p) && linksTo(p, c, (t) => t.status >= 400 || t.status === 0) },
  { id: "links_to_redirects", label: "Enlaza a redirecciones", severity: "baja", category: "enlazado", description: "Enlaces internos que pasan por una redirección: gastan rastreo y autoridad.", test: (p, c) => html(p) && linksTo(p, c, (t) => t.status >= 300 && t.status < 400) },
  { id: "lang_missing", label: "Sin atributo lang", severity: "baja", category: "internacional", description: "El atributo lang del HTML declara el idioma de la página.", test: (p) => html(p) && !p.facts!.lang },
  { id: "hreflang_missing", label: "Sin hreflang en sitio multidioma", severity: "media", category: "internacional", description: "El sitio publica varios idiomas, pero esta página no enlaza sus versiones.", test: (p, c) => c.multilingual && isIndexable(p) && p.facts!.hreflang.length === 0 },
  { id: "hreflang_no_xdefault", label: "Hreflang sin x-default", severity: "baja", category: "internacional", description: "Falta la versión por defecto para usuarios de otros idiomas.", test: (p) => html(p) && p.facts!.hreflang.length > 0 && !p.facts!.hreflang.some((item) => item.lang === "x-default") },
  { id: "hreflang_no_self", label: "Hreflang sin autorreferencia", severity: "baja", category: "internacional", description: "El grupo hreflang debe incluir la propia URL.", test: (p) => isIndexable(p) && p.facts!.hreflang.length > 0 && !p.facts!.hreflang.some((item) => item.href === p.url) },
  { id: "slow_response", label: `Respuesta de más de ${THRESHOLDS.slowMs / 1000} s`, severity: "media", category: "rendimiento", description: "Tiempo hasta recibir el HTML completo, medido desde el equipo local: orientativo, no es Core Web Vitals.", test: (p) => p.status === 200 && p.responseMs > THRESHOLDS.slowMs },
  { id: "html_heavy", label: "HTML de más de 500 KB", severity: "baja", category: "rendimiento", description: "Un HTML muy pesado retrasa el renderizado y el rastreo.", test: (p) => html(p) && p.bytes > THRESHOLDS.heavyBytes },
];

const SEVERITY_ORDER: Record<SiteAuditSeverity, number> = { critica: 0, alta: 1, media: 2, baja: 3 };

export type AuditResult = {
  /** Incidencias por URL, en el orden del catálogo. */
  byPage: Map<string, string[]>;
  issues: Array<Omit<Check, "test"> & { urls: string[] }>;
};

export function auditRun(run: Pick<CrawlRun, "pages" | "sitemap">): AuditResult {
  const count = (values: Array<string | null | undefined>) => {
    const map = new Map<string, number>();
    for (const value of values) if (value) map.set(value.toLowerCase(), (map.get(value.toLowerCase()) ?? 0) + 1);
    return map;
  };
  const indexable = run.pages.filter(isIndexable);
  const ctx: Context = {
    byUrl: new Map(run.pages.map((page) => [page.url, page])),
    titleCount: count(indexable.map((page) => page.facts!.title)),
    descriptionCount: count(indexable.map((page) => page.facts!.description)),
    multilingual: run.pages.some((page) => (page.facts?.hreflang.length ?? 0) > 1),
    sitemapKnown: run.sitemap.urls.length > 0,
  };
  const byPage = new Map<string, string[]>(run.pages.map((page) => [page.url, []]));
  const issues = CHECKS.map(({ test, ...check }) => {
    const urls = run.pages.filter((page) => test(page, ctx)).map((page) => page.url);
    for (const url of urls) byPage.get(url)!.push(check.id);
    return { ...check, urls };
  })
    .filter((issue) => issue.urls.length > 0)
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || b.urls.length - a.urls.length);
  return { byPage, issues };
}

export const SEVERE: ReadonlySet<SiteAuditSeverity> = new Set(["critica", "alta"]);
export const severityOf = (id: string) => CHECKS.find((check) => check.id === id)?.severity ?? "baja";
