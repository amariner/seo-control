import { createHash, randomUUID } from "node:crypto";
import { assertCrawlLimit } from "./preflight";

export type CrawlPage = {
  url: string;
  urlHash: string;
  statusCode: number;
  contentType: string;
  title: string | null;
  canonical: string | null;
  robots: string | null;
  depth: number;
  responseMs: number;
  links: string[];
};

export type CrawlResult = { runId: string; startedAt: string; completedAt: string; pages: CrawlPage[]; errors: Array<{ url: string; error: string }> };

function extract(html: string, base: URL) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1] ?? null;
  const robots = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)/i)?.[1] ?? null;
  const links = [...html.matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)].flatMap((match) => {
    try { const url = new URL(match[1]!, base); url.hash = ""; return url.origin === base.origin ? [url.toString()] : []; }
    catch { return []; }
  });
  return { title, canonical, robots, links: [...new Set(links)] };
}

export async function crawlSite(input: { startUrl: string; maxUrls: number; concurrency?: number; signal?: AbortSignal; onPage?: (page: CrawlPage) => Promise<void> | void }): Promise<CrawlResult> {
  const maxUrls = assertCrawlLimit(input.maxUrls);
  const start = new URL(input.startUrl);
  if (!/^https?:$/.test(start.protocol)) throw new Error("Solo se permiten URLs HTTP o HTTPS");
  const concurrency = Math.max(1, Math.min(8, input.concurrency ?? 4));
  const queue: Array<{ url: string; depth: number }> = [{ url: start.toString(), depth: 0 }];
  const seen = new Set<string>();
  const pages: CrawlPage[] = [];
  const errors: CrawlResult["errors"] = [];
  const startedAt = new Date().toISOString();

  async function visit(item: { url: string; depth: number }) {
    const begun = performance.now();
    try {
      const response = await fetch(item.url, { headers: { "User-Agent": "PorcelanosaSEOAuditBot/2.0 (+internal-authorized-audit)" }, redirect: "follow", signal: input.signal });
      const contentType = response.headers.get("content-type") ?? "";
      const html = contentType.includes("text/html") ? await response.text() : "";
      const parsed = html ? extract(html, new URL(response.url)) : { title: null, canonical: null, robots: null, links: [] as string[] };
      const page: CrawlPage = { url: response.url, urlHash: createHash("sha256").update(response.url).digest("hex"), statusCode: response.status, contentType, title: parsed.title, canonical: parsed.canonical, robots: parsed.robots, depth: item.depth, responseMs: Math.round(performance.now() - begun), links: parsed.links };
      pages.push(page);
      await input.onPage?.(page);
      for (const link of parsed.links) if (!seen.has(link) && queue.length + seen.size < maxUrls * 2) queue.push({ url: link, depth: item.depth + 1 });
    } catch (error) {
      errors.push({ url: item.url, error: error instanceof Error ? error.message : "Error de descarga" });
    }
  }

  while (queue.length && seen.size < maxUrls) {
    if (input.signal?.aborted) break;
    const batch: Array<{ url: string; depth: number }> = [];
    while (batch.length < concurrency && queue.length && seen.size < maxUrls) {
      const item = queue.shift()!;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      batch.push(item);
    }
    await Promise.all(batch.map(visit));
  }
  return { runId: randomUUID(), startedAt, completedAt: new Date().toISOString(), pages, errors };
}
