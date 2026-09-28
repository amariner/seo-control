import { SITE_AUDIT_LIMITS, SITE_AUDIT_SCHEMA_VERSION, siteAuditSummarySchema, type SiteAuditSummary } from "@seo/contracts";
import type { CrawlRun } from "./crawler";
import { auditRun, isIndexable, SEVERE, severityOf } from "./issues";

const path = (url: string) => {
  const parsed = new URL(url);
  return `${decodeURI(parsed.pathname)}${parsed.search}`;
};

const tally = <K extends string | number>(values: K[]) => {
  const map = new Map<K, number>();
  for (const value of values) map.set(value, (map.get(value) ?? 0) + 1);
  return [...map].sort((a, b) => (a[0] < b[0] ? -1 : 1));
};

/**
 * Resumen publicable de un crawl (D-070): lo único que viaja al visor. Topes en
 * `SITE_AUDIT_LIMITS`; con más páginas que el tope, la tabla prioriza las de
 * peor severidad y después las más cercanas a la portada.
 */
export function buildSummary(run: CrawlRun, publishedAt = new Date().toISOString()): SiteAuditSummary {
  if (run.status === "running" || !run.completedAt) throw new Error("El crawl aún no ha terminado.");
  const { byPage, issues } = auditRun(run);
  const pages = run.pages;
  const htmlPages = pages.filter((page) => page.facts !== null);
  const okTimes = pages.filter((page) => page.status === 200).map((page) => page.responseMs).sort((a, b) => a - b);
  const severeCount = (url: string) => (byPage.get(url) ?? []).filter((id) => SEVERE.has(severityOf(id))).length;
  const rank = { critica: 0, alta: 1, media: 2, baja: 3 } as const;
  const worst = (url: string) => Math.min(4, ...(byPage.get(url) ?? []).map((id) => rank[severityOf(id)]));
  const rows = pages
    .map((page) => ({ page, worst: worst(page.url), severe: severeCount(page.url), total: byPage.get(page.url)?.length ?? 0 }))
    .sort((a, b) => a.worst - b.worst || b.severe - a.severe || a.page.depth - b.page.depth || b.total - a.total || a.page.url.localeCompare(b.page.url));
  const sitemapSet = new Set(run.sitemap.urls);

  return siteAuditSummarySchema.parse({
    schemaVersion: SITE_AUDIT_SCHEMA_VERSION,
    project: run.project,
    domain: run.domain,
    startUrl: run.startUrl,
    runId: run.runId,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    durationMs: Date.parse(run.completedAt) - Date.parse(run.startedAt),
    config: {
      maxUrls: run.config.maxUrls,
      concurrency: run.config.concurrency,
      respectRobots: run.config.respectRobots,
      userAgent: run.config.userAgent,
      selection: "Recorrido en anchura desde la portada: con tope, quedan las URL a menos clics de la portada. Respeta robots.txt; el sitemap solo mide cobertura.",
    },
    totals: {
      crawled: pages.length,
      html: htmlPages.length,
      ok: pages.filter((page) => page.status >= 200 && page.status < 300).length,
      redirects: pages.filter((page) => page.status >= 300 && page.status < 400).length,
      clientErrors: pages.filter((page) => page.status >= 400 && page.status < 500).length,
      serverErrors: pages.filter((page) => page.status >= 500).length,
      failed: pages.filter((page) => page.status === 0).length,
      indexable: pages.filter(isIndexable).length,
      noindex: htmlPages.filter((page) => (byPage.get(page.url) ?? []).includes("noindex")).length,
      blockedByRobots: run.blockedByRobots.length,
      sitemapUrls: run.sitemap.urls.length,
      crawledInSitemap: pages.filter((page) => sitemapSet.has(page.url)).length,
      pagesWithSevere: pages.filter((page) => severeCount(page.url) > 0).length,
      avgResponseMs: okTimes.length ? Math.round(okTimes.reduce((sum, value) => sum + value, 0) / okTimes.length) : 0,
      p90ResponseMs: okTimes.length ? okTimes[Math.min(okTimes.length - 1, Math.floor(okTimes.length * 0.9))]! : 0,
    },
    statusDistribution: tally(pages.map((page) => page.status)).map(([status, count]) => ({ status, count })),
    depthDistribution: tally(pages.map((page) => page.depth)).map(([depth, count]) => ({ depth, count })),
    languages: tally(htmlPages.map((page) => (page.facts!.lang ?? "sin lang").toLowerCase())).map(([lang, count]) => ({ lang, count })).sort((a, b) => b.count - a.count),
    issues: issues.map(({ urls, ...issue }) => ({ ...issue, affected: urls.length, sample: urls.slice(0, SITE_AUDIT_LIMITS.samplesPerIssue).map(path) })),
    pages: rows.slice(0, SITE_AUDIT_LIMITS.pages).map(({ page }) => ({
      path: path(page.url),
      status: page.status,
      depth: page.depth,
      indexable: isIndexable(page),
      inSitemap: page.inSitemap,
      title: page.facts?.title ?? null,
      titleLength: page.facts?.title?.length ?? 0,
      descriptionLength: page.facts?.description?.length ?? 0,
      h1Count: page.facts?.h1.length ?? 0,
      wordCount: page.facts?.wordCount ?? 0,
      responseMs: page.responseMs,
      lang: page.facts?.lang ?? null,
      issues: byPage.get(page.url) ?? [],
    })),
    pagesTruncated: rows.length > SITE_AUDIT_LIMITS.pages,
    publishedAt,
  });
}
