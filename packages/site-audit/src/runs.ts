import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE_AUDIT_SCHEMA_VERSION, publishedSiteAuditsSchema, type BrandSlug, type PublishedSiteAudits, type SiteAuditSummary } from "@seo/contracts";
import type { CrawlRun } from "./crawler";

/**
 * Crawls en el equipo local (D-070). El crawl completo vive en
 * `data/local/crawls/<proyecto>/<runId>.json`, fuera de git; junto a él, un
 * `.meta.json` pequeño para listar sin leer el crawl entero. Publicar escribe
 * solo el resumen en `packages/site-audit/data/published/site-audits.json`,
 * que el visor empaqueta en el siguiente despliegue.
 */

function repoRoot(): string {
  const candidates = [process.cwd(), resolve(process.cwd(), ".."), resolve(process.cwd(), "../.."), resolve(dirname(fileURLToPath(import.meta.url)), "../../..")];
  return candidates.find((candidate) => existsSync(/*turbopackIgnore: true*/ resolve(candidate, "pnpm-workspace.yaml"))) ?? process.cwd();
}

export const crawlsDir = () => process.env.SITE_AUDIT_RUNS_DIR ?? resolve(repoRoot(), "data/local/crawls");
export const publishedPath = () => resolve(repoRoot(), "packages/site-audit/data/published/site-audits.json");

export type RunMeta = Pick<CrawlRun, "runId" | "project" | "domain" | "startUrl" | "startedAt" | "completedAt" | "status" | "error"> & { maxUrls: number; crawled: number; queued: number; published: boolean };

const atomicWrite = (path: string, text: string) => {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  writeFileSync(temp, text, "utf8");
  renameSync(temp, path);
};

export function newRunId(now = new Date()): string {
  return `${now.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")}-${Math.random().toString(16).slice(2, 6)}`;
}

export function saveRun(run: CrawlRun): void {
  const base = resolve(crawlsDir(), run.project, run.runId);
  const published = readPublished().audits[run.project]?.runId === run.runId;
  const meta: RunMeta = { runId: run.runId, project: run.project, domain: run.domain, startUrl: run.startUrl, startedAt: run.startedAt, completedAt: run.completedAt, status: run.status, error: run.error, maxUrls: run.config.maxUrls, crawled: run.pages.length, queued: run.queuedWhenDone, published };
  atomicWrite(`${base}.meta.json`, `${JSON.stringify(meta)}\n`);
  // El crawl completo solo se reescribe al terminar o cada pocas páginas (lo decide quien llama).
  atomicWrite(`${base}.json`, JSON.stringify(run));
}

export function listRuns(project?: BrandSlug): RunMeta[] {
  const root = crawlsDir();
  if (!existsSync(/*turbopackIgnore: true*/ root)) return [];
  const published = readPublished().audits;
  return readdirSync(/*turbopackIgnore: true*/ root)
    .filter((dir) => !project || dir === project)
    .flatMap((dir) =>
      readdirSync(/*turbopackIgnore: true*/ resolve(root, dir))
        .filter((file) => file.endsWith(".meta.json"))
        .map((file) => JSON.parse(readFileSync(/*turbopackIgnore: true*/ resolve(root, dir, file), "utf8")) as RunMeta),
    )
    .map((meta) => ({ ...meta, published: published[meta.project]?.runId === meta.runId }))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function loadRun(project: string, runId: string): CrawlRun | null {
  if (!/^[a-z-]+$/.test(project) || !/^[\w-]+$/.test(runId)) return null;
  const path = resolve(crawlsDir(), project, `${runId}.json`);
  return existsSync(/*turbopackIgnore: true*/ path) ? (JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")) as CrawlRun) : null;
}

export function readPublished(): PublishedSiteAudits {
  const path = publishedPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) return { schemaVersion: SITE_AUDIT_SCHEMA_VERSION, audits: {} };
  return publishedSiteAuditsSchema.parse(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
}

/** Sustituye el resumen publicado del proyecto. Devuelve el tamaño del fichero para vigilar el peso. */
export function publishSummary(summary: SiteAuditSummary): { path: string; bytes: number } {
  const current = readPublished();
  const next: PublishedSiteAudits = { schemaVersion: SITE_AUDIT_SCHEMA_VERSION, audits: { ...current.audits, [summary.project]: summary } };
  const text = `${JSON.stringify(next, null, 1)}\n`;
  atomicWrite(publishedPath(), text);
  return { path: publishedPath(), bytes: Buffer.byteLength(text) };
}
