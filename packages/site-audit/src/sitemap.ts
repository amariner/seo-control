/**
 * Lectura de sitemaps (D-070): índices anidados y `urlset`, con topes para que
 * un sitemap enorme no dispare el tiempo ni la memoria. Solo se usan para saber
 * qué URL declara el sitio (cobertura), no para elegir qué rastrear.
 */

const LOC = /<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi;

export async function readSitemaps(entries: string[], fetchText: (url: string) => Promise<string | null>, { maxFiles = 60, maxUrls = 50_000 } = {}): Promise<{ urls: Set<string>; files: number }> {
  const urls = new Set<string>();
  const queue = [...entries];
  const seen = new Set<string>();
  while (queue.length && seen.size < maxFiles && urls.size < maxUrls) {
    const file = queue.shift()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = await fetchText(file);
    if (!text) continue;
    const locs = [...text.matchAll(LOC)].map((match) => match[1]!.replace(/&amp;/g, "&"));
    if (/<sitemapindex/i.test(text)) queue.push(...locs);
    else for (const loc of locs) if (urls.size < maxUrls) urls.add(normalizeUrl(loc) ?? loc);
  }
  return { urls, files: seen.size };
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
