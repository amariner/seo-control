import published from "../data/published/reports.json";
import { readSnapshotFile } from "./files";
import { parsePublishedReports } from "./parse";
import { reportIdOf, type PublishedReport, type ReportSnapshot } from "./schema";

/**
 * Informes publicados en el visor (D-076). El índice (puntualizaciones y datos
 * básicos de cada versión congelada) se empaqueta en el build, como el
 * resumen del crawl; el contenido de una versión se lee de disco solo al abrir
 * ese informe. Solo servidor y solo lectura: lo escribe el workbench y llega a
 * producción con commit y despliegue.
 */
let cached: ReturnType<typeof parsePublishedReports> | null = null;

export function getPublishedReports() {
  cached ??= parsePublishedReports(published);
  return cached;
}

export function getPublishedReport(id: string): PublishedReport | null {
  return getPublishedReports().reports[id] ?? null;
}

export function getPublishedSnapshot(brand: string, period: string): ReportSnapshot | null {
  const meta = getPublishedReport(reportIdOf(brand, period))?.snapshot;
  return meta ? readSnapshotFile(meta) : null;
}
