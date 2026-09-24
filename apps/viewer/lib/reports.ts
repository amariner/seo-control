import { getMockReportArchive } from "@seo/contracts/mock";
import { parseReportFilters, reportFilterQuery, type ReportArchiveEntry, type ReportFilters } from "@seo/contracts";

/**
 * Acceso al archivo histórico de informes (P2.3). Como el resto de los accesos
 * del visor, la firma no cambiará en P3: solo se sustituye el generador
 * sintético por el repositorio de PostgreSQL.
 */
export function getReportArchive(filters: ReportFilters) {
  return getMockReportArchive(filters);
}

/** Un informe con su cadena de versiones completa, sin depender de los filtros. */
export function findReport(id: string): ReportArchiveEntry | null {
  const archive = getMockReportArchive({ project: "all", type: "all", status: "all", year: "all" });
  return archive.entries.find((entry) => entry.id === id) ?? null;
}

export function reportFiltersFromUrl(request: Request): ReportFilters {
  return parseReportFilters(Object.fromEntries(new URL(request.url).searchParams));
}

/** Enlace profundo al archivo con un cambio de filtro; el resto del estado se conserva. */
export function reportsHref(filters: ReportFilters, changes: Partial<ReportFilters> = {}) {
  const query = reportFilterQuery({ ...filters, ...changes });
  return query ? `/reports?${query}` : "/reports";
}
