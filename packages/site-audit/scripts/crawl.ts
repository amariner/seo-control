import { brandSlugSchema, findBrand } from "@seo/contracts";
import { crawlSite, type CrawlRun } from "../src/crawler";
import { defaultStartUrl } from "../src/sitemap";
import { buildSummary } from "../src/summary";
import { newRunId, saveRun } from "../src/runs";

/**
 * Uso: pnpm crawl -- --project xtone [--max 200] [--start https://…] [--concurrency 2]
 *
 * Crawl local (D-070). Guarda el crawl completo en data/local/crawls (fuera de git)
 * e imprime el resumen. No publica: para eso, `pnpm crawl:publish -- --project xtone`.
 */

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const project = brandSlugSchema.parse(value("--project"));
const brand = findBrand(project)!;
const startUrl = value("--start") ?? (brand.domain ? defaultStartUrl(brand.domain) : null);
if (!startUrl) throw new Error(`${brand.name} no tiene dominio; indica --start.`);
const maxUrls = Number(value("--max") ?? 200);
const concurrency = Number(value("--concurrency") ?? 2);
const runId = newRunId();

console.log(`Crawl ${runId}: ${startUrl}, hasta ${maxUrls} URL, ${concurrency} a la vez.`);
let last = 0;
const run: CrawlRun = await crawlSite({
  project,
  startUrl,
  runId,
  config: { maxUrls, concurrency },
  onProgress: (current) => {
    if (current.pages.length - last >= 10 || current.status !== "running") {
      last = current.pages.length;
      saveRun(current);
      process.stdout.write(`\r  ${current.pages.length}/${maxUrls} URL`);
    }
  },
});
saveRun(run);
console.log(`\nEstado: ${run.status}${run.error ? ` (${run.error})` : ""}.`);
if (run.status === "failed") process.exit(1);

const summary = buildSummary(run);
const t = summary.totals;
console.log(`URL: ${t.crawled} (${t.html} HTML) · 2xx ${t.ok} · 3xx ${t.redirects} · 4xx ${t.clientErrors} · 5xx ${t.serverErrors} · sin respuesta ${t.failed}`);
console.log(`Indexables: ${t.indexable} · noindex ${t.noindex} · bloqueadas por robots ${t.blockedByRobots} · sitemap ${t.crawledInSitemap}/${t.sitemapUrls}`);
console.log(`Respuesta media ${t.avgResponseMs} ms · p90 ${t.p90ResponseMs} ms · con incidencias graves ${t.pagesWithSevere}`);
console.log("\nIncidencias:");
for (const issue of summary.issues) console.log(`  [${issue.severity}] ${issue.label}: ${issue.affected}`);
console.log(`\nGuardado en data/local/crawls/${project}/${runId}.json. Publicar: pnpm crawl:publish -- --project ${project} --run ${runId}`);
