import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { editorialImportReportSchema, type EditorialDataset, type EditorialImportReport, type EditorialSourceKey } from "@seo/contracts";
import { normalizeEditorialSources, type RawSource } from "./normalize";

/**
 * Importador idempotente de los cuatro snapshots editoriales V1.
 *
 * - Archiva cada fichero original tal cual (procedencia), con manifiesto de hashes.
 * - Genera el dataset normalizado y el informe de importación.
 * - Si la huella de las entradas coincide con la última importación, no reescribe
 *   nada salvo que se fuerce; los IDs derivados son deterministas en cualquier caso.
 */

export const V1_SOURCE_FILES: Record<EditorialSourceKey, string> = {
  "calendario-2026": "calendario-2026.json",
  "conjunto-backlog": "conjunto-backlog.json",
  conjunto: "conjunto.json",
  "conjunto-propuestas": "conjunto-propuestas.json",
};

export const sha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");

export type ImportPaths = {
  /** Carpeta V1 `src/data/plan-editorial`. */
  sourceDir: string;
  /** Carpeta de archivo forense (`packages/editorial/data/archive/v1`). */
  archiveDir: string;
  /** Carpeta del dataset normalizado (`packages/editorial/data/normalized`). */
  normalizedDir: string;
};

export type ImportResult =
  | { status: "unchanged"; fingerprint: string; report: EditorialImportReport }
  | { status: "imported"; fingerprint: string; dataset: EditorialDataset; written: string[] };

const PACKAGE_ROOT = resolve(import.meta.dirname, "..");

export const DEFAULT_PATHS: ImportPaths = {
  sourceDir: resolve(PACKAGE_ROOT, "../../../seo-dashboard/src/data/plan-editorial"),
  archiveDir: resolve(PACKAGE_ROOT, "data/archive/v1"),
  normalizedDir: resolve(PACKAGE_ROOT, "data/normalized"),
};

async function exists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function readV1Sources(sourceDir: string) {
  const sources: RawSource[] = [];
  const missing: string[] = [];
  for (const [key, fileName] of Object.entries(V1_SOURCE_FILES) as Array<[EditorialSourceKey, string]>) {
    const path = join(sourceDir, fileName);
    if (!(await exists(path))) {
      missing.push(fileName);
      continue;
    }
    sources.push({ key, fileName, text: await readFile(path, "utf8") });
  }
  return { sources, missing };
}

export function fingerprintSources(sources: RawSource[]) {
  const hashes = sources.map((source) => [source.key, sha256(source.text)] as const).sort(([a], [b]) => a.localeCompare(b));
  return sha256(hashes.map(([key, hash]) => `${key}:${hash}`).join("\n"));
}

export async function readPreviousReport(normalizedDir: string) {
  const path = join(normalizedDir, "import-report.json");
  if (!(await exists(path))) return null;
  try {
    return editorialImportReportSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return null;
  }
}

export async function importV1Editorial(paths: ImportPaths = DEFAULT_PATHS, options: { now?: Date; force?: boolean } = {}): Promise<ImportResult> {
  const now = options.now ?? new Date();
  const { sources, missing } = await readV1Sources(paths.sourceDir);
  if (!sources.length) throw new Error(`No se encontró ningún snapshot V1 en ${paths.sourceDir}`);
  const fingerprint = fingerprintSources(sources);
  const previous = await readPreviousReport(paths.normalizedDir);
  if (previous && previous.inputFingerprint === fingerprint && !options.force) {
    return { status: "unchanged", fingerprint, report: previous };
  }

  const dataset = normalizeEditorialSources(sources, { sha256, importedAt: now.toISOString() });
  if (missing.length) dataset.report.warnings.unshift(`Ficheros V1 ausentes: ${missing.join(", ")}.`);

  await mkdir(paths.archiveDir, { recursive: true });
  await mkdir(paths.normalizedDir, { recursive: true });
  const written: string[] = [];
  for (const source of sources) {
    const target = join(paths.archiveDir, source.fileName);
    await writeFile(target, source.text, "utf8");
    written.push(target);
  }
  const manifest = {
    schemaVersion: dataset.schemaVersion,
    importedAt: dataset.generatedAt,
    inputFingerprint: fingerprint,
    origin: "SEO Dashboard V1 · src/data/plan-editorial",
    note: "Copias literales de los snapshots V1. Solo procedencia: nunca se sirven al navegador ni se editan.",
    files: dataset.report.archives.map((archive) => ({ key: archive.key, fileName: archive.fileName, sha256: archive.sha256, byteLength: archive.byteLength, expectedCount: archive.expectedCount, importedCount: archive.importedCount, status: archive.status })),
  };
  const manifestPath = join(paths.archiveDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  written.push(manifestPath);
  const datasetPath = join(paths.normalizedDir, "editorial-dataset.json");
  await writeFile(datasetPath, `${JSON.stringify(dataset, null, 1)}\n`, "utf8");
  written.push(datasetPath);
  const reportPath = join(paths.normalizedDir, "import-report.json");
  await writeFile(reportPath, `${JSON.stringify(dataset.report, null, 2)}\n`, "utf8");
  written.push(reportPath);
  return { status: "imported", fingerprint, dataset, written };
}
