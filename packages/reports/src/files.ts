import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { reportSnapshotSchema, type ReportSnapshot, type SnapshotMeta } from "./schema";

/**
 * Dónde viven los informes publicados en disco (D-076). Como la curación
 * editorial: en un build de Next `import.meta.url` apunta al chunk, así que
 * se prueban la ruta del paquete y las dos raíces posibles desde el
 * directorio de trabajo (monorepo o `apps/<app>`). En el visor desplegado los
 * ficheros entran con `outputFileTracingIncludes`.
 */
const RELATIVE = "packages/reports/data/published";
const PACKAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../data/published");

export function publishedDir(): string {
  return [process.env.REPORTS_DIR, PACKAGE_DIR, resolve(process.cwd(), RELATIVE), resolve(process.cwd(), "../..", RELATIVE)]
    .filter((candidate): candidate is string => Boolean(candidate))
    .find((candidate) => existsSync(/*turbopackIgnore: true*/ resolve(candidate, "reports.json"))) ?? PACKAGE_DIR;
}

export const PUBLISHED_RELATIVE = RELATIVE;

/** Contenido de una versión congelada, o `null` si falta o ya no cumple el contrato. */
export function readSnapshotFile(meta: SnapshotMeta): ReportSnapshot | null {
  const path = resolve(publishedDir(), meta.file);
  if (!existsSync(/*turbopackIgnore: true*/ path)) return null;
  const parsed = reportSnapshotSchema.safeParse(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
  return parsed.success ? parsed.data : null;
}
