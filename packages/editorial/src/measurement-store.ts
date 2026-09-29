import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { editorialMeasurementStoreSchema, type EditorialDataset, type EditorialMeasurementStore } from "@seo/contracts";

/**
 * Mediciones editoriales reales (P3.5, D-079). Las escribe el workbench (o
 * `pnpm editorial:measure`) con Search Console; el visor solo las lee, igual
 * que la curación: fichero versionado que llega con commit y despliegue.
 */
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const RELATIVE = "packages/editorial/data/measurement/editorial-measurements.json";
export const DEFAULT_MEASUREMENT_PATH = resolve(PACKAGE_ROOT, "data/measurement/editorial-measurements.json");

function measurementPath(): string {
  return [process.env.EDITORIAL_MEASUREMENT_PATH, DEFAULT_MEASUREMENT_PATH, resolve(process.cwd(), RELATIVE), resolve(process.cwd(), "../..", RELATIVE)]
    .filter((candidate): candidate is string => Boolean(candidate))
    .find((candidate) => existsSync(/*turbopackIgnore: true*/ candidate)) ?? DEFAULT_MEASUREMENT_PATH;
}

export function readMeasurementStore(): EditorialMeasurementStore | null {
  const path = measurementPath();
  if (!existsSync(/*turbopackIgnore: true*/ path)) return null;
  const parsed = editorialMeasurementStoreSchema.safeParse(JSON.parse(readFileSync(/*turbopackIgnore: true*/ path, "utf8")));
  // Un fichero que ya no cumple el contrato no tumba el plan: se ignora y el plan sale sin medición.
  return parsed.success ? parsed.data : null;
}

export function writeMeasurementStore(store: EditorialMeasurementStore, path = DEFAULT_MEASUREMENT_PATH): void {
  const parsed = editorialMeasurementStoreSchema.parse(store);
  mkdirSync(dirname(path), { recursive: true });
  const pieces = Object.fromEntries(Object.entries(parsed.pieces).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(path, `${JSON.stringify({ ...parsed, pieces }, null, 1)}\n`, "utf8");
}

/** Sustituye las mediciones de cada pieza medida; las demás quedan como estaban. */
export function applyMeasurements(dataset: EditorialDataset, store: EditorialMeasurementStore | null): EditorialDataset {
  if (!store) return dataset;
  const withMeasurements = <T extends { id: string; measurements: unknown[] }>(piece: T): T =>
    store.pieces[piece.id] ? { ...piece, measurements: store.pieces[piece.id]! } : piece;
  return { ...dataset, plan: dataset.plan.map(withMeasurements), backlog: dataset.backlog.map(withMeasurements) };
}
