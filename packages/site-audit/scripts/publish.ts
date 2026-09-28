import { brandSlugSchema } from "@seo/contracts";
import { buildSummary } from "../src/summary";
import { listRuns, loadRun, publishSummary } from "../src/runs";

/**
 * Uso: pnpm crawl:publish -- --project xtone [--run <runId>]
 *
 * Escribe el resumen del crawl (por defecto, el último completo del proyecto) en
 * packages/site-audit/data/published/site-audits.json. Llega al visor con el
 * siguiente commit y despliegue (D-070).
 */

const args = process.argv.slice(2);
const value = (flag: string) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const project = brandSlugSchema.parse(value("--project"));
const runId = value("--run") ?? listRuns(project).find((meta) => meta.status === "complete")?.runId;
if (!runId) throw new Error(`No hay crawls completos de ${project}.`);
const run = loadRun(project, runId);
if (!run) throw new Error(`No existe el crawl ${runId}.`);
const summary = buildSummary(run);
const { path, bytes } = publishSummary(summary);
console.log(`Publicado ${runId} (${summary.totals.crawled} URL, ${summary.issues.length} tipos de incidencia) en ${path} · ${(bytes / 1024).toFixed(1)} KB.`);
console.log("Llega al visor con el commit y `vercel deploy --prod`.");
