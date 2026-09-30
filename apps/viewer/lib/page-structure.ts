import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import { urlTree, type UrlTreeNode } from "@seo/site-audit/sitemap-tree";

/**
 * Estructura del sitio en la pestaña «Páginas» (D-087): sigue los sitemaps del
 * último crawl publicado. Un grupo por sitemap (en el orden del índice) y,
 * dentro, sus URL ramificadas por carpeta con los clics, impresiones y
 * posición (ponderada por impresiones) de la muestra de Search Console. Las
 * páginas con datos en Search Console que no declara ningún sitemap van en un
 * grupo aparte. Sin sitemaps publicados no hay estructura.
 */

type Page = BrandReport["pages"][number];

export type StructureNode = {
  name: string;
  path: string;
  /** URL de la página que es este nodo, si existe. */
  url: string | null;
  /** Páginas (rutas distintas) en el nodo y por debajo. */
  pages: number;
  /** De ellas, con clics en la muestra de Search Console. */
  withClicks: number;
  clicks: number;
  impressions: number;
  /** Posición media ponderada por impresiones; `null` sin impresiones. */
  position: number | null;
  /** Cuota de los clics de la muestra, en %. */
  share: number;
  children: StructureNode[];
};

export type StructureGroup = {
  /** URL del sitemap; `null` en el grupo «fuera de los sitemaps». */
  sitemap: string | null;
  label: string;
  lastmod: string | null;
  /** Totales del grupo y ramas de primer nivel (la portada, si está, como una página más). */
  root: StructureNode;
};

export type PageStructure = {
  available: boolean;
  groups: StructureGroup[];
  outside: StructureGroup | null;
  totals: { declared: number; declaredWithClicks: number; outsidePages: number; outsideClicks: number; unreadable: number };
  sitemap: { completedAt: string; index: string | null; files: number; truncated: boolean; detailed: boolean } | null;
};

/** Misma forma que `normalizeUrl` del crawler: sin fragmento y host en minúsculas. */
const normalize = (value: string) => {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
};
const fileLabel = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? url);
  } catch {
    return url;
  }
};
const byClicks = (a: StructureNode, b: StructureNode) => b.clicks - a.clicks || b.impressions - a.impressions || b.pages - a.pages || a.name.localeCompare(b.name, "es");

export function pageStructure(report: BrandReport, audit: SiteAuditSummary | null): PageStructure {
  const sitemap = audit?.sitemap?.files.some((file) => file.urls.length) ? audit.sitemap : null;
  // La misma ruta con y sin barra final es la misma página: se cruza sin la barra.
  const key = (url: string) => url.replace(/\/(?=$|\?)/, "");
  const metrics = new Map<string, Page[]>();
  for (const page of report.pages) {
    const url = normalize(page.page);
    if (url) metrics.set(key(url), [...(metrics.get(key(url)) ?? []), page]);
  }
  const pagesOf = (urls: string[]) => [...new Set(urls.map(key))].flatMap((item) => metrics.get(item) ?? []);
  const sampleClicks = report.pages.reduce((sum, page) => sum + page.clicks, 0);
  const share = (clicks: number) => (sampleClicks ? (clicks / sampleClicks) * 100 : 0);

  const annotate = (node: UrlTreeNode): StructureNode => {
    const own = pagesOf(node.urls);
    const children = node.children.map(annotate).sort(byClicks);
    const clicks = own.reduce((sum, page) => sum + page.clicks, 0) + children.reduce((sum, child) => sum + child.clicks, 0);
    const impressions = own.reduce((sum, page) => sum + page.impressions, 0) + children.reduce((sum, child) => sum + child.impressions, 0);
    const weighted = own.reduce((sum, page) => sum + page.position * page.impressions, 0) + children.reduce((sum, child) => sum + (child.position ?? 0) * child.impressions, 0);
    return {
      name: node.name,
      path: node.path,
      url: node.url,
      pages: (node.urls.length ? 1 : 0) + children.reduce((sum, child) => sum + child.pages, 0),
      withClicks: (own.some((page) => page.clicks > 0) ? 1 : 0) + children.reduce((sum, child) => sum + child.withClicks, 0),
      clicks,
      impressions,
      position: impressions ? weighted / impressions : null,
      share: share(clicks),
      children,
    };
  };

  /** Árbol de un conjunto de URL: la portada baja a primer nivel y, con varios hosts, cada uno es una rama. */
  const group = (urls: string[], sitemapUrl: string | null, label: string, lastmod: string | null): StructureGroup => {
    const trees = urlTree(urls);
    const branches = trees.flatMap((tree) => {
      const root = annotate(tree.root);
      const home = tree.root.urls.length ? annotate({ ...tree.root, name: "/ (portada)", children: [] }) : null;
      const branch = [...(home ? [home] : []), ...root.children];
      return trees.length > 1 ? [{ ...root, name: tree.host, url: null, children: branch }] : branch;
    });
    const children = branches.sort(byClicks);
    const clicks = children.reduce((sum, child) => sum + child.clicks, 0);
    const impressions = children.reduce((sum, child) => sum + child.impressions, 0);
    return {
      sitemap: sitemapUrl,
      label,
      lastmod,
      root: {
        name: label,
        path: "/",
        url: sitemapUrl,
        pages: children.reduce((sum, child) => sum + child.pages, 0),
        withClicks: children.reduce((sum, child) => sum + child.withClicks, 0),
        clicks,
        impressions,
        position: impressions ? children.reduce((sum, child) => sum + (child.position ?? 0) * child.impressions, 0) / impressions : null,
        share: share(clicks),
        children,
      },
    };
  };

  if (!sitemap || !audit) return { available: false, groups: [], outside: null, totals: { declared: 0, declaredWithClicks: 0, outsidePages: 0, outsideClicks: 0, unreadable: 0 }, sitemap: null };

  const groups = sitemap.files
    .filter((file) => file.urls.length)
    .map((file) => group([...new Set(file.urls.map((url) => normalize(url) ?? url))], file.url, fileLabel(file.url), file.lastmod));
  const declared = new Set(sitemap.files.flatMap((file) => file.urls.map((url) => key(normalize(url) ?? url))));
  const outsideUrls = [...metrics.entries()].filter(([item]) => !declared.has(item)).map(([, pages]) => normalize(pages[0]!.page)!);
  const outside = outsideUrls.length ? group(outsideUrls, null, "Fuera de los sitemaps", null) : null;
  const declaredWithClicks = [...declared].filter((item) => (metrics.get(item) ?? []).some((page) => page.clicks > 0)).length;
  const index = sitemap.files.find((file) => file.kind === "indice" && !file.parent)?.url ?? null;

  return {
    available: groups.length > 0,
    groups,
    outside,
    totals: { declared: declared.size, declaredWithClicks, outsidePages: outside?.root.pages ?? 0, outsideClicks: outside?.root.clicks ?? 0, unreadable: sitemap.files.filter((file) => file.kind === "ilegible").length },
    sitemap: { completedAt: audit.completedAt, index, files: groups.length, truncated: sitemap.truncated, detailed: sitemap.detailed },
  };
}
