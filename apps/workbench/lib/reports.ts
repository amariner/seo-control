import { BRANDS, type Brand } from "@seo/contracts";
import {
  buildProjectReport,
  closedQuarters,
  curationCount,
  isStaleSnapshot,
  lastClosedMonth,
  reportIdOf,
  snapshotInput,
  type ReportPeriod,
  type PublishedReport,
} from "@seo/reports";
import { readReports, readSnapshot, syncStates, type SyncState } from "@seo/reports/store";

/**
 * Catálogo de informes del workbench (D-076): las ocho marcas por el mes
 * cerrado y los cuatro últimos trimestres cerrados. Las marcas fuera del
 * piloto analítico aparecen igual, sin acciones: no hay dato que congelar
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

export function reportPeriods(today = new Date().toISOString().slice(0, 10)) {
  return { quarters: closedQuarters(today, 4), month: lastClosedMonth(today) };
}

export function reportCatalog(today?: string) {
  const { quarters, month } = reportPeriods(today);
  const store = readReports();
  const states = syncStates();
  const rows: CatalogRow[] = BRANDS.flatMap((brand) =>
    [...quarters, month].map((period) => {
      const id = reportIdOf(brand.slug, period.id);
      const published = store.reports[id] ?? null;
      return {
        id,
        brand,
        period,
        published,
        notes: curationCount(published?.curation),
        sync: published ? (states.get(id) ?? "new") : states.has(id) ? "pending" : null,
        stale: published?.snapshot ? isStaleSnapshot(published.snapshot) : false,
      };
    }),
  );
  // Lo que está en el fichero pero ya no entra en el catálogo (trimestres antiguos) no se pierde de vista.
  const listed = new Set(rows.map((row) => row.id));
  const archived = Object.keys(store.reports).filter((id) => !listed.has(id));
  return { rows, quarters, month, archived, invalid: store.invalid };
}

/** Diapositivas sin puntualizaciones (todo lo que se puede mostrar u ocultar) de una versión congelada. */
export function editableReport(id: string) {
  const snapshot = readSnapshot(id);
  if (!snapshot) return null;
  const curation = readReports().reports[id]?.curation;
  const slides = buildProjectReport({ ...snapshotInput(snapshot), teamActions: curation?.actions });
  return { snapshot, curation, slides };
}

export function viewerReportUrl(brand: string, period: string, pdf = false) {
  return `${VIEWER_URL}/projects/${brand}/informe?periodo=${period}${pdf ? "&pdf=1" : ""}`;
}
