import type { CrawlRun } from "./crawler";
import type { SitemapFile } from "./sitemap";

/**
 * Estructura de URL deducida de los sitemaps: las rutas declaradas se ramifican
 * por carpeta (`/en/productos/x/` → en › productos › x). Es la arquitectura que
 * el sitio declara, no la que se recorre enlazando.
 */
export type UrlTreeNode = {
  /** Tramo de la ruta; varios unidos con «/» cuando una carpeta solo tiene una hija. */
  name: string;
  /** Ruta completa del nodo (`/en/productos/`). */
  path: string;
  /** URL declarada que coincide con este nodo, si la hay. */
  url: string | null;
  /** Todas las URL que caen en este nodo (con y sin barra final, parámetros aparte). */
  urls: string[];
  /** URL declaradas en el nodo y por debajo. */
  total: number;
  children: UrlTreeNode[];
};

export type UrlTree = { host: string; root: UrlTreeNode; depth: number };

const segmentsOf = (url: URL) => {
  const parts = url.pathname.split("/").filter(Boolean).map((part) => {
    try {
      return decodeURIComponent(part);
    } catch {
      return part;
    }
  });
  if (url.search) parts.push(`${parts.pop() ?? ""}${url.search}`);
  return parts;
};

const sortTree = (node: UrlTreeNode) => {
  node.children.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "es"));
  node.children.forEach(sortTree);
};

/** Une en un nodo las carpetas sin URL propia y con una sola hija («fr/productos»). */
const collapse = (node: UrlTreeNode): UrlTreeNode => {
  node.children = node.children.map(collapse);
  if (node.url === null && node.children.length === 1 && node.children[0]!.children.length) {
    const [child] = node.children as [UrlTreeNode];
    return { ...child, name: `${node.name}/${child.name}` };
  }
  return node;
};

/** Un árbol por host (un sitemap puede declarar URL de otros dominios). */
export function urlTree(urls: Iterable<string>): UrlTree[] {
  const roots = new Map<string, UrlTreeNode>();
  const depth = new Map<string, number>();
  for (const raw of urls) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    const root = roots.get(url.host) ?? { name: url.host, path: "/", url: null, urls: [], total: 0, children: [] };
    roots.set(url.host, root);
    const parts = segmentsOf(url);
    depth.set(url.host, Math.max(depth.get(url.host) ?? 0, parts.length));
    let node = root;
    node.total += 1;
    for (const [index, part] of parts.entries()) {
      let child = node.children.find((item) => item.name === part);
      if (!child) {
        child = { name: part, path: `/${parts.slice(0, index + 1).join("/")}/`, url: null, urls: [], total: 0, children: [] };
        node.children.push(child);
      }
      child.total += 1;
      node = child;
    }
    node.url ??= raw;
    node.urls.push(raw);
  }
  return [...roots.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([host, root]) => {
      sortTree(root);
      root.children = root.children.map(collapse);
      return { host, root, depth: depth.get(host) ?? 0 };
    });
}

/** URL declaradas por un sitemap y, si es un índice, por todos sus descendientes. */
export function sitemapUrls(files: SitemapFile[], url: string): string[] {
  const byUrl = new Map(files.map((file) => [file.url, file]));
  const out = new Set<string>();
  const visit = (current: string, seen: Set<string>) => {
    const file = byUrl.get(current);
    if (!file || seen.has(current)) return;
    seen.add(current);
    for (const item of file.urls) out.add(item);
    for (const child of file.children) visit(child, seen);
  };
  visit(url, new Set());
  return [...out];
}

/**
 * Sitemaps de un crawl. Los crawls anteriores a esta sección solo guardaron la
 * lista de URL: se devuelven los declarados en robots.txt con todas las URL
 * juntas y `detailed: false`.
 */
export function crawlSitemaps(run: CrawlRun): { files: SitemapFile[]; detailed: boolean; notRead: number } {
  if (run.sitemap.sitemaps) return { files: run.sitemap.sitemaps, detailed: true, notRead: run.sitemap.notRead ?? 0 };
  const files: SitemapFile[] = run.robots.sitemaps.map((url, index) => ({ url, parent: null, origin: "robots", kind: "urls", lastmod: null, children: [], urls: index === 0 ? run.sitemap.urls : [] }));
  return { files, detailed: false, notRead: 0 };
}
