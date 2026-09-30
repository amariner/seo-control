import { BRANDS, type Brand } from "@seo/contracts";
import { closedQuarters, curationCount, isStaleSnapshot, reportIdOf, type ReportPeriod, type PublishedReport } from "@seo/reports";
import { readReports, syncStates, type SyncState } from "@seo/reports/store";

/**
 * Catálogo de informes del workbench (D-076, D-082): las ocho marcas en una
 * sola tabla, solo por el último trimestre cerrado, que es el que el equipo
 * revisa y comenta. Solo lectura: congelar, puntualizar y subir se piden en
 * el chat del asistente (`pnpm report:generate`, `pnpm report:curate`). Las
 * marcas fuera del piloto analítico aparecen igual: no hay dato que congelar
 * hasta P11, y eso también es información de control.
 */

export const VIEWER_URL = process.env.VIEWER_URL ?? "http://localhost:3000";

export type CatalogRow = {
  id: string;
  brand: Brand;
  period: ReportPeriod;
  published: PublishedReport | null;
  notes: number;
  sync: SyncState | null;
  stale: boolean;
};

export function reportCatalog(today = new Date().toISOString().slice(0, 10)) {
  const quarter = closedQuarters(today, 1)[0]!;
  const store = readReports();
  const states = syncStates();
  const rows: CatalogRow[] = BRANDS.map((brand) => {
    const id = reportIdOf(brand.slug, quarter.id);
    const published = store.reports[id] ?? null;
    return {
      id,
      brand,
      period: quarter,
      published,
      notes: curationCount(published?.curation),
      sync: published ? (states.get(id) ?? "new") : states.has(id) ? "pending" : null,
      stale: published?.snapshot ? isStaleSnapshot(published.snapshot) : false,
    };
  });
  // Lo que está en el fichero pero no es el último trimestre (trimestres y meses anteriores) no se pierde de vista.
  const listed = new Set(rows.map((row) => row.id));
  const archived = Object.keys(store.reports).filter((id) => !listed.has(id));
  // Pendientes de subir de cualquier periodo, no solo de la tabla.
  const pending = [...states].filter(([, state]) => state !== "synced").map(([id]) => id);
  return { rows, quarter, pending, archived, invalid: store.invalid };
}

export function viewerReportUrl(brand: string, period: string, pdf = false) {
  return `${VIEWER_URL}/projects/${brand}/informe?periodo=${period}${pdf ? "&pdf=1" : ""}`;
}
