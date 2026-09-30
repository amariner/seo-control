/**
 * Lectura de sitemaps (D-070): índices anidados y `urlset`, con topes para que
 * un sitemap enorme no dispare el tiempo ni la memoria. Solo se usan para saber
 * qué URL declara el sitio (cobertura), no para elegir qué rastrear.
 */

const LOC = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi;
const ENTRY = /<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/gi;
const LASTMOD = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/i;

/** Cómo se llegó a un sitemap raíz: declarado en robots.txt, indicado a mano o probado en la ruta habitual. */
export type SitemapOrigin = "robots" | "indicado" | "ruta-habitual";

/**
 * Un fichero de sitemap leído (o intentado). Los índices guardan sus sitemaps
 * hijos; los `urlset`, las URL que declaran (sin topes por fichero: el tope es
 * el global de `readSitemaps`).
 */
export type SitemapFile = {
  url: string;
  /** Índice que lo declara; `null` en los raíz. */
  parent: string | null;
  origin: SitemapOrigin | null;
  kind: "indice" | "urls" | "ilegible";
  /** `<lastmod>` con el que lo declara su índice. */
  lastmod: string | null;
  children: string[];
  urls: string[];
};

export type SitemapRoot = { url: string; origin: SitemapOrigin };

const decode = (value: string) => value.replace(/&amp;/g, "&");

export async function readSitemaps(
  entries: Array<string | SitemapRoot>,
  fetchText: (url: string) => Promise<string | null>,
  { maxFiles = 60, maxUrls = 50_000 } = {},
): Promise<{ urls: Set<string>; files: number; sitemaps: SitemapFile[]; notRead: number }> {
  const urls = new Set<string>();
  const queue: Array<{ url: string; parent: string | null; origin: SitemapOrigin | null; lastmod: string | null }> = entries.map((entry) =>
    typeof entry === "string" ? { url: entry, parent: null, origin: "robots", lastmod: null } : { url: entry.url, parent: null, origin: entry.origin, lastmod: null },
  );
  const seen = new Set<string>();
  const sitemaps: SitemapFile[] = [];
  while (queue.length && seen.size < maxFiles && urls.size < maxUrls) {
    const item = queue.shift()!;
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    const file: SitemapFile = { url: item.url, parent: item.parent, origin: item.origin, kind: "ilegible", lastmod: item.lastmod, children: [], urls: [] };
    sitemaps.push(file);
    const text = await fetchText(item.url);
    if (!text) continue;
    if (/<sitemapindex/i.test(text)) {
      file.kind = "indice";
      // Índices sin envoltorio `<sitemap>` (mal formados): cada `<loc>` cuenta como hijo.
      const bodies = [...text.matchAll(ENTRY)].map((match) => match[1]!);
      for (const body of bodies.length ? bodies : [...text.matchAll(LOC)].map((match) => match[0])) {
        const loc = [...body.matchAll(LOC)][0]?.[1];
        if (!loc) continue;
        const child = decode(loc);
        file.children.push(child);
        queue.push({ url: child, parent: item.url, origin: null, lastmod: body.match(LASTMOD)?.[1] ?? null });
      }
    } else {
      file.kind = "urls";
      for (const match of text.matchAll(LOC)) {
        if (urls.size >= maxUrls) break;
        const url = normalizeUrl(decode(match[1]!)) ?? decode(match[1]!);
        file.urls.push(url);
        urls.add(url);
      }
    }
  }
  const notRead = new Set(queue.map((item) => item.url).filter((url) => !seen.has(url))).size;
  return { urls, files: seen.size, sitemaps, notRead };
}

/** URL canónica para comparar: sin fragmento y con el host en minúsculas. */
export function normalizeUrl(value: string, base?: string): string | null {
  try {
    const url = new URL(value, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return null;
  }
}

/** Portada por defecto de un proyecto: `www.` solo si el dominio no trae ya subdominio (store.porcelanosa.com). */
export const defaultStartUrl = (domain: string) => `https://${domain.split(".").length > 2 ? domain : `www.${domain}`}/`;
