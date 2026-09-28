import type { CrawledPage, CrawlRun } from "./crawler";
import { auditRun, CHECKS, isIndexable } from "./issues";

/**
 * Exploración del crawl completo en el workbench (D-071): todas las URL con sus
 * datos y la ficha de cada una. Lee el crawl local entero; nada de esto se
 * publica en el visor.
 */

export type UrlRow = {
  url: string;
  path: string;
  status: number;
  redirectTo: string | null;
  indexable: boolean;
  /** Por qué no es indexable, en palabras; `null` si lo es. */
  notIndexableReason: string | null;
  depth: number;
  inSitemap: boolean;
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  h1: string | null;
  h1Count: number;
  canonical: string | null;
  lang: string | null;
  hreflangCount: number;
  wordCount: number;
  inlinks: number;
  outlinks: number;
  externalLinks: number;
  images: number;
  imagesWithoutAlt: number;
  schemaTypes: string[];
  responseMs: number;
  bytes: number;
  issues: string[];
};

const RANK = { critica: 0, alta: 1, media: 2, baja: 3 } as const;

const pathOf = (url: string) => {
  const parsed = new URL(url);
  return `${decodeURI(parsed.pathname)}${parsed.search}`;
};

export function notIndexableReason(page: CrawledPage): string | null {
  if (isIndexable(page)) return null;
  if (page.status === 0) return `Sin respuesta${page.error ? `: ${page.error}` : ""}`;
  if (page.status >= 300 && page.status < 400) return `Redirige (${page.status})${page.redirectTo ? ` a ${page.redirectTo}` : ""}`;
  if (page.status !== 200) return `Responde ${page.status}`;
  if (!page.facts) return `No es HTML (${page.contentType ?? "tipo desconocido"})`;
  if (/noindex/i.test(`${page.facts.robotsMeta ?? ""} ${page.xRobotsTag ?? ""}`)) return page.xRobotsTag && /noindex/i.test(page.xRobotsTag) ? `Cabecera X-Robots-Tag: ${page.xRobotsTag}` : `Meta robots: ${page.facts.robotsMeta}`;
  return `Canonical a otra URL: ${page.facts.canonical}`;
}

/** Enlaces internos entrantes por URL, contados sobre las páginas rastreadas. */
function inlinkIndex(run: CrawlRun): Map<string, string[]> {
  const index = new Map<string, string[]>();
  for (const page of run.pages) for (const link of page.facts?.internalLinks ?? []) if (link !== page.url) index.set(link, [...(index.get(link) ?? []), page.url]);
  return index;
}

export function urlRows(run: CrawlRun): UrlRow[] {
  const { byPage } = auditRun(run);
  const inlinks = inlinkIndex(run);
  return run.pages.map((page) => ({
    url: page.url,
    path: pathOf(page.url),
    status: page.status,
    redirectTo: page.redirectTo,
    indexable: isIndexable(page),
    notIndexableReason: notIndexableReason(page),
    depth: page.depth,
    inSitemap: page.inSitemap,
    title: page.facts?.title ?? null,
    titleLength: page.facts?.title?.length ?? 0,
    description: page.facts?.description ?? null,
    descriptionLength: page.facts?.description?.length ?? 0,
    h1: page.facts?.h1[0] ?? null,
    h1Count: page.facts?.h1.length ?? 0,
    canonical: page.facts?.canonical ?? null,
    lang: page.facts?.lang ?? null,
    hreflangCount: page.facts?.hreflang.length ?? 0,
    wordCount: page.facts?.wordCount ?? 0,
    inlinks: inlinks.get(page.url)?.length ?? 0,
    outlinks: page.facts?.internalLinks.length ?? 0,
    externalLinks: page.facts?.externalLinks ?? 0,
    images: page.facts?.images ?? 0,
    imagesWithoutAlt: page.facts?.imagesWithoutAlt ?? 0,
    schemaTypes: page.facts?.schemaTypes ?? [],
    responseMs: page.responseMs,
    bytes: page.bytes,
    issues: byPage.get(page.url) ?? [],
  }));
}

/** Enlace de la ficha: estado si se rastreó; si no, si robots.txt lo bloquea o quedó fuera del tope. */
export type LinkedUrl = { url: string; status: number | null; crawled: boolean; blocked: boolean };

/** Ficha de una URL: la página, sus incidencias explicadas y sus enlaces entrantes y salientes. */
export function urlReport(run: CrawlRun, url: string) {
  const page = run.pages.find((item) => item.url === url);
  if (!page) return null;
  const byUrl = new Map(run.pages.map((item) => [item.url, item]));
  const { byPage } = auditRun(run);
  const blocked = new Set(run.blockedByRobots);
  const describe = (target: string): LinkedUrl => {
    const found = byUrl.get(target);
    return { url: target, status: found?.status ?? null, crawled: Boolean(found), blocked: blocked.has(target) };
  };
  return {
    page,
    row: urlRows(run).find((item) => item.url === url)!,
    issues: (byPage.get(url) ?? [])
      .map((id) => {
        const { test: _test, ...check } = CHECKS.find((item) => item.id === id)!;
        return check;
      })
      .sort((a, b) => RANK[a.severity] - RANK[b.severity]),
    inlinks: (inlinkIndex(run).get(url) ?? []).map(describe),
    outlinks: (page.facts?.internalLinks ?? []).map(describe),
    redirectedFrom: run.pages.filter((item) => item.redirectTo === url).map((item) => item.url),
    blockedByRobots: run.blockedByRobots.includes(url),
  };
}
