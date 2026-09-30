import type { EditorialPlanRow } from "@seo/editorial-ui";
import { applyCuration } from "./curate";
import { buildProjectReport, type ProjectReportInput } from "./project-report";
import type { ReportCuration, ReportSnapshot } from "./schema";

export * from "./periods";
export * from "./schema";
export * from "./curate";
export * from "./parse";
export * from "./project-report";
export * from "./project-actions";
export * from "./archive";
export * from "./export";

/**
 * Diapositivas de un informe con las puntualizaciones del equipo (D-076).
 * Mismo camino para el informe en vivo y para la versión congelada.
 */
export function buildCuratedReport(input: Omit<ProjectReportInput, "teamActions">, curation?: ReportCuration) {
  return applyCuration(buildProjectReport({ ...input, teamActions: curation?.actions }), curation);
}

export function snapshotInput(snapshot: ReportSnapshot): Omit<ProjectReportInput, "teamActions"> {
  return {
    report: snapshot.report,
    pieces: snapshot.pieces as unknown as EditorialPlanRow[],
    audit: snapshot.audit,
    rootLabel: snapshot.rootLabel,
    today: snapshot.today,
  };
}
