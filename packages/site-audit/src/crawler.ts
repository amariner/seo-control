import type { BrandSlug } from "@seo/contracts";
import { parsePage, type PageFacts } from "./parse";
import { parseRobots, type Robots } from "./robots";
import { normalizeUrl, readSitemaps, type SitemapFile, type SitemapRoot } from "./sitemap";

export const USER_AGENT = "PorcelanosaSEOAuditBot/2.0 (+internal-authorized-audit)";
export const RUN_SCHEMA_VERSION = "site-audit-run.v1" as const;

/** Una URL rastreada. `facts` solo en respuestas HTML 200. */
export type CrawledPage = {
  url: string;
  status: number;
  /** 0 en `status` = sin respuesta; aquí el motivo. */
  error: string | null;
  /** Destino si la respuesta fue una redirección (se sigue como URL propia). */
  redirectTo: string | null;
  contentType: string | null;
  xRobotsTag: string | null;
  responseMs: number;
  bytes: number;
  depth: number;
  inSitemap: boolean;
  facts: PageFacts | null;
};

export type CrawlConfig = { maxUrls: number; concurrency: number; delayMs: number; timeoutMs: number; respectRobots: boolean; userAgent: string };

export type CrawlRun = {
  schemaVersion: typeof RUN_SCHEMA_VERSION;
  runId: string;
  project: BrandSlug;
  domain: string;
  startUrl: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "complete" | "stopped" | "failed";
  error: string | null;
  config: CrawlConfig;
  robots: { found: boolean; sitemaps: string[]; crawlDelayMs: number | null };
  /**
   * `sitemaps`: cada fichero leído con su índice padre y sus URL; `notRead`:
   * sitemaps declarados que quedaron fuera del tope de ficheros. Ausentes en
   * crawls anteriores a la sección «Sitemaps encontrados».
   */
  sitemap: { files: number; urls: string[]; sitemaps?: SitemapFile[]; notRead?: number };
  /** URL descubiertas que robots.txt no permite rastrear (no se piden). */
  blockedByRobots: string[];
  pages: CrawledPage[];
  /** URL en cola (al terminar: el sitio es mayor que el tope). */
  queuedWhenDone: number;
};

export const DEFAULT_CONFIG: CrawlConfig = { maxUrls: 200, concurrency: 2, delayMs: 300, timeoutMs: 20_000, respectRobots: true, userAgent: USER_AGENT };

/** Extensiones que no son páginas: se descartan sin pedirlas. */
const ASSET = /\.(?:jpe?g|png|gif|webp|avif|svg|ico|pdf|zip|rar|gz|mp4|webm|mp3|wav|docx?|xlsx?|pptx?|dwg|css|js|json|xml|txt|woff2?|ttf|eot)$/i;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(url: string, config: CrawlConfig, signal?: AbortSignal) {
  const started = performance.now();
  const timeout = AbortSignal.timeout(config.timeoutMs);
  const response = await fetch(url, {
    redirect: "manual",
    headers: { "user-agent": config.userAgent, accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5", "accept-language": "es,en;q=0.8" },
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  });
  const contentType = response.headers.get("content-type");
  const html = response.status === 200 && /html/i.test(contentType ?? "");
  const body = html ? await response.text() : (await response.body?.cancel(), "");
  return { response, contentType, body, responseMs: Math.round(performance.now() - started) };
}

/**
 * Crawl local de las URL principales de un sitio (D-070). Recorre en anchura
 * desde la portada: con un tope menor que el sitio, quedan las páginas a menos
 * clics de la portada, que son las que el propio sitio destaca. Respeta
 * robots.txt, no sale del host, sigue redirecciones como URL propias y lee el
 * sitemap solo para medir cobertura. Educado por defecto: 2 peticiones a la vez
 * y pausa entre peticiones (o el `Crawl-delay` del sitio, hasta 5 s).
 */
export async function crawlSite(input: { project: BrandSlug; startUrl: string; runId: string; config?: Partial<CrawlConfig>; sitemaps?: string[]; signal?: AbortSignal; onProgress?: (run: CrawlRun) => void }): Promise<CrawlRun> {
  const config = { ...DEFAULT_CONFIG, ...input.config };
  if (!Number.isInteger(config.maxUrls) || config.maxUrls < 1 || config.maxUrls > 50_000) throw new Error("El crawl debe limitarse entre 1 y 50.000 URLs.");
  config.concurrency = Math.min(Math.max(1, Math.floor(config.concurrency)), 8);
  const start = normalizeUrl(input.startUrl);
  if (!start) throw new Error("URL de inicio no válida.");
  const origin = new URL(start);
  const run: CrawlRun = {
    schemaVersion: RUN_SCHEMA_VERSION,
    runId: input.runId,
    project: input.project,
    domain: origin.hostname,
    startUrl: start,
    startedAt: new Date().toISOString(),
    completedAt: null,
    status: "running",
    error: null,
    config,
    robots: { found: false, sitemaps: [], crawlDelayMs: null },
    sitemap: { files: 0, urls: [] },
    blockedByRobots: [],
    pages: [],
    queuedWhenDone: 0,
  };
  const progress = () => input.onProgress?.(run);

  const fetchText = async (url: string) => {
    try {
      const response = await fetch(url, { headers: { "user-agent": config.userAgent }, signal: AbortSignal.timeout(config.timeoutMs) });
      return response.ok ? await response.text() : null;
    } catch {
      return null;
    }
  };

  try {
    const robotsText = await fetchText(new URL("/robots.txt", origin).toString());
    const robots: Robots = parseRobots(robotsText ?? "", config.userAgent);
    run.robots = { found: robotsText !== null, sitemaps: robots.sitemaps, crawlDelayMs: robots.crawlDelayMs };
    const delay = Math.min(Math.max(config.delayMs, robots.crawlDelayMs ?? 0), 5_000);
    // Raíces: las de robots.txt más las indicadas; sin ninguna, se prueban las rutas habituales.
    const roots: SitemapRoot[] = [...robots.sitemaps.map((url) => ({ url, origin: "robots" as const })), ...(input.sitemaps ?? []).map((url) => ({ url, origin: "indicado" as const }))];
    if (!roots.length) roots.push(...["/sitemap_index.xml", "/sitemap.xml"].map((path) => ({ url: new URL(path, origin).toString(), origin: "ruta-habitual" as const })));
    const sitemap = await readSitemaps(roots, fetchText);
    // Una ruta habitual que no existe no es un sitemap encontrado.
    const sitemaps = sitemap.sitemaps.filter((file) => !(file.origin === "ruta-habitual" && file.kind === "ilegible"));
    run.sitemap = { files: sitemaps.length, urls: [...sitemap.urls], sitemaps, notRead: sitemap.notRead };
    progress();

    const queue: Array<{ url: string; depth: number }> = [{ url: start, depth: 0 }];
    const seen = new Set([start]);
    const blocked = new Set<string>();
    const enqueue = (raw: string, depth: number) => {
      const url = normalizeUrl(raw);
      if (!url || seen.has(url)) return;
      const parsed = new URL(url);
      if (parsed.hostname !== origin.hostname || ASSET.test(parsed.pathname)) return;
      seen.add(url);
      if (config.respectRobots && !robots.isAllowed(parsed)) {
        blocked.add(url);
        return;
      }
      queue.push({ url, depth });
    };

    let inFlight = 0;
    const worker = async () => {
      while (run.pages.length < config.maxUrls && !input.signal?.aborted) {
        // Cola vacía pero otro trabajador aún puede descubrir enlaces: se espera en vez de salir.
        if (!queue.length) {
          if (!inFlight) break;
          await sleep(50);
          continue;
        }
        const next = queue.shift()!;
        inFlight += 1;
        const page: CrawledPage = { url: next.url, status: 0, error: null, redirectTo: null, contentType: null, xRobotsTag: null, responseMs: 0, bytes: 0, depth: next.depth, inSitemap: sitemap.urls.has(next.url), facts: null };
        run.pages.push(page);
        try {
          const { response, contentType, body, responseMs } = await request(next.url, config, input.signal);
          page.status = response.status;
          page.contentType = contentType;
          page.xRobotsTag = response.headers.get("x-robots-tag");
          page.responseMs = responseMs;
          page.bytes = Buffer.byteLength(body);
          const location = response.headers.get("location");
          if (response.status >= 300 && response.status < 400 && location) {
            page.redirectTo = normalizeUrl(location, next.url);
            if (page.redirectTo) enqueue(page.redirectTo, next.depth);
          }
          if (body) {
            page.facts = parsePage(body, next.url);
            for (const link of page.facts.internalLinks) enqueue(link, next.depth + 1);
          }
        } catch (error) {
          page.error = error instanceof Error ? (error.name === "TimeoutError" ? "Tiempo de espera agotado" : error.message) : String(error);
        }
        inFlight -= 1;
        run.queuedWhenDone = queue.length;
        progress();
        // La cola es FIFO y se alimenta por niveles: el orden ya es por profundidad.
        await sleep(delay);
      }
    };
    await Promise.all(Array.from({ length: config.concurrency }, worker));
    run.blockedByRobots = [...blocked];
    run.queuedWhenDone = queue.length;
    run.status = input.signal?.aborted ? "stopped" : "complete";
  } catch (error) {
    run.status = "failed";
    run.error = error instanceof Error ? error.message : String(error);
  }
  run.completedAt = new Date().toISOString();
  progress();
  return run;
}
