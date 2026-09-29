import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { PUBLISHED_RELATIVE, publishedDir, readSnapshotFile } from "./files";
import { parsePublishedReports } from "./parse";
import { reportCurationSchema, snapshotFileOf, type PublishedReports, type ReportCuration, type ReportSnapshot } from "./schema";

/**
 * Escritura de los informes publicados (D-076). Solo la usan el workbench y
 * el script `pnpm report:generate`; el visor lee el mismo fichero empaquetado
 * (`./published`). Sin caché: el workbench ve cada cambio al instante.
 */

const RELATIVE = `${PUBLISHED_RELATIVE}/reports.json`;

function reportsPath(): string {
  return resolve(publishedDir(), "reports.json");
}

/** Raíz del repositorio: la carpeta que contiene `packages/reports`. */
export function repositoryRoot(): string {
  return resolve(publishedDir(), "../../../..");
}

export function readReports() {
  const path = reportsPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) return parsePublishedReports({});
  return parsePublishedReports(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
}

function writeReports(store: PublishedReports): void {
  const path = reportsPath();
  mkdirSync(dirname(path), { recursive: true });
  // Claves ordenadas: el diff que se sube al visor es estable y legible.
  const reports = Object.fromEntries(Object.entries(store.reports).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, updatedAt: new Date().toISOString(), reports }, null, 1)}\n`, "utf8");
}

/**
 * Guarda una versión congelada. Sin las consultas de Search Console
 * (`searchQueries`): el informe no las usa y son la mitad del fichero.
 */
export function saveSnapshot(id: string, snapshot: ReportSnapshot): void {
  const file = snapshotFileOf(id);
  const content = `${JSON.stringify({ ...snapshot, report: { ...snapshot.report, searchQueries: [] } })}\n`;
  const path = resolve(publishedDir(), file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf8");
  const { invalid: _invalid, ...store } = readReports();
  store.reports[id] = {
    ...store.reports[id],
    snapshot: {
      reportVersion: snapshot.reportVersion,
      generatedAt: snapshot.generatedAt,
      generatedBy: snapshot.generatedBy,
      cutoff: snapshot.report.cutoff,
      file,
      sha256: createHash("sha256").update(content, "utf8").digest("hex"),
    },
  };
  writeReports(store);
}

export function readSnapshot(id: string): ReportSnapshot | null {
  const meta = readReports().reports[id]?.snapshot;
  return meta ? readSnapshotFile(meta) : null;
}

export function removeSnapshot(id: string): void {
  const { invalid: _invalid, ...store } = readReports();
  const item = store.reports[id];
  if (!item) return;
  const { snapshot, ...rest } = item;
  if (snapshot) rmSync(resolve(publishedDir(), snapshot.file), { force: true });
  if (rest.curation) store.reports[id] = rest;
  else delete store.reports[id];
  writeReports(store);
}

/** Guarda las puntualizaciones; si quedan vacías, las quita. */
export function saveCuration(id: string, curation: ReportCuration): void {
  const parsed = reportCurationSchema.parse(curation);
  const { invalid: _invalid, ...store } = readReports();
  const empty = parsed.actions.length === 0 && Object.values(parsed.slides).every((item) => Object.values(item).every((value) => value === undefined || value === false || (Array.isArray(value) && value.length === 0) || value === ""));
  const item = { ...store.reports[id] };
  if (empty) delete item.curation;
  else item.curation = parsed;
  if (item.snapshot || item.curation) store.reports[id] = item;
  else delete store.reports[id];
  writeReports(store);
}

/**
 * Estado de sincronización frente al último commit (HEAD). El visor desplegado
 * sale de un commit, así que «igual que HEAD» es lo máximo que se puede saber
 * en local; lo que no está en HEAD seguro que no ha llegado al visor.
 */
export type SyncState = "synced" | "pending" | "new";

export function syncStates(): Map<string, SyncState> {
  const current = readReports().reports;
  let committed: Record<string, unknown> = {};
  try {
    const raw = execFileSync("git", ["show", `HEAD:${RELATIVE}`], { cwd: repositoryRoot(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    committed = parsePublishedReports(JSON.parse(raw)).reports;
  } catch {
    committed = {};
  }
  const states = new Map<string, SyncState>();
  const ids = new Set([...Object.keys(current), ...Object.keys(committed)]);
  for (const id of ids) {
    const now = current[id];
    const before = committed[id];
    if (!before) states.set(id, "new");
    else states.set(id, JSON.stringify(now ?? null) === JSON.stringify(before) ? "synced" : "pending");
  }
  return states;
}

/** Autor local para las revisiones: `git config user.name`, o «workbench». */
export function localAuthor(): string {
  try {
    return execFileSync("git", ["config", "user.name"], { cwd: repositoryRoot(), encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim() || "workbench";
  } catch {
    return "workbench";
  }
}
