import { BRAND_REPORT_VERSION, findBrand, isPilotProject, type BrandSlug, type EditorialDataset } from "@seo/contracts";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { fromPlanSheet, generalPlanRows } from "@seo/editorial-ui";
import { resolveRepository } from "@seo/repository";
import { getPublishedAudit } from "@seo/site-audit/published";
import { rootLabelOf } from "./page-analysis";
import { parsePeriod } from "./periods";
import { reportIdOf, reportSnapshotSchema, type ReportSnapshot } from "./schema";

/**
 * Piezas de la marca con la búsqueda objetivo que el informe cruza con Google
 * (compartido con el visor). Con hoja «Plan editorial» (D-050) la hoja es el
 * plan completo; si no, plan y backlog V1.
 */
export function editorialTargetsOf(dataset: EditorialDataset, slug: BrandSlug) {
  const sheet = fromPlanSheet(dataset, slug);
  return (sheet ? dataset.plan : [...dataset.plan, ...dataset.backlog])
    .filter((piece) => piece.brand.slug === slug)
    .map((piece) => ({
      id: piece.id,
      month: piece.month ? `${piece.month.year}-${String(piece.month.month).padStart(2, "0")}` : null,
      title: piece.title ?? piece.keyword ?? "Pieza sin título",
      type: piece.typeLiteral || piece.type,
      status: piece.statusLiteral || piece.status,
      keyword: piece.keyword,
      current: sheet,
    }));
}

export class ReportGenerationError extends Error {}

/**
 * Genera la versión congelada de un informe (D-076): pide el informe de marca
 * del periodo a GA4 y Search Console reales y guarda también el plan
 * editorial curado y el resumen de crawl publicado de ese momento.
 *
 * Se niega a congelar datos incompletos: si una fuente falla o el corte del
 * dato no cubre el periodo entero, lanza un error en lugar de guardar un
 * informe que parecería completo.
 */
export async function generateSnapshot({
  brand,
  period: periodId,
  author,
  env = process.env,
  now = new Date(),
}: {
  brand: BrandSlug;
  period: string;
  author: string;
  env?: Record<string, string | undefined>;
  now?: Date;
}): Promise<{ id: string; snapshot: ReportSnapshot }> {
  const period = parsePeriod(periodId);
  if (!period) throw new ReportGenerationError(`Periodo desconocido: ${periodId}`);
  if (!isPilotProject(brand))
    throw new ReportGenerationError(`${findBrand(brand)?.name ?? brand} no tiene datos analíticos en V2: entra con la expansión de P11.`);
  const today = now.toISOString().slice(0, 10);
  if (period.end >= today) throw new ReportGenerationError(`El periodo ${period.label} aún no ha terminado.`);

  const repository = resolveRepository(env);
  if (!repository.brandReport)
    throw new ReportGenerationError(
      "El origen de datos activo no ofrece informes de marca. Define SEO_DATA_SOURCE=live y las credenciales de GA4 y Search Console en apps/workbench/.env.local.",
    );

  const dataset = getEffectiveEditorialDataset();
  const report = await repository.brandReport({
    brand,
    market: "all",
    range: { range: "custom", from: period.start, to: period.end },
    editorial: editorialTargetsOf(dataset, brand),
  });

  const failed = report.sources.filter((source) => !source.ok);
  if (failed.length)
    throw new ReportGenerationError(
      `No se congela: ${failed.map((source) => `${source.source.toUpperCase()} no ha respondido (${source.note})`).join("; ")}. Vuelve a intentarlo más tarde.`,
    );
  if (report.window.start !== period.start || report.window.end !== period.end)
    throw new ReportGenerationError(
      `No se congela: el dato llega hasta el ${report.cutoff} y el informe cubriría ${report.window.start} – ${report.window.end} en vez del ${period.label} completo.`,
    );

  const snapshot = reportSnapshotSchema.parse({
    reportVersion: BRAND_REPORT_VERSION,
    generatedAt: now.toISOString(),
    generatedBy: author,
    report,
    pieces: generalPlanRows(dataset, brand),
    audit: getPublishedAudit(brand),
    rootLabel: rootLabelOf(report.markets),
    today,
  });
  return { id: reportIdOf(brand, period.id), snapshot };
}
