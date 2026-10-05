import { findBrand, isPilotProject, type BrandSlug } from "@seo/contracts";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { generalPlanRows } from "@seo/editorial-ui";
import { resolveRepository } from "@seo/repository";
import { getPublishedAudit } from "@seo/site-audit/published";
import type { MeasurementMeta } from "./action-tracking";
import { editorialTargetsOf } from "./generate";
import { rootLabelOf } from "./page-analysis";
import { sitemapGapOf } from "./page-structure";
import { actionMetric, projectActionReview, type ReviewInput } from "./project-actions";

export class ReviewInputError extends Error {}

/**
 * El repaso de la pestaña «Acciones» con datos reales, fuera del visor (D-090):
 * mismo informe de marca (GA4 y Search Console), plan editorial curado, crawl
 * publicado y huecos de los sitemaps. Lo usan `pnpm action:track` para el
 * punto de partida y `pnpm action:measure` para el resultado.
 */
export async function liveActionReview({
  brand,
  range = "90d",
  market = "all",
  author,
  env = process.env,
  now = new Date(),
}: {
  brand: BrandSlug;
  range?: string;
  market?: string;
  author: string;
  env?: Record<string, string | undefined>;
  now?: Date;
}) {
  if (!isPilotProject(brand)) throw new ReviewInputError(`${findBrand(brand)?.name ?? brand} no tiene datos analíticos en V2: entra con la expansión de P11.`);
  const repository = resolveRepository(env);
  if (!repository.brandReport)
    throw new ReviewInputError("El origen de datos activo no ofrece informes de marca. Define SEO_DATA_SOURCE=live y las credenciales de GA4 y Search Console en apps/workbench/.env.local.");
  const dataset = getEffectiveEditorialDataset();
  const report = await repository.brandReport({ brand, market, range: { range }, editorial: editorialTargetsOf(dataset, brand) });
  const audit = getPublishedAudit(brand);
  const input: ReviewInput = {
    report,
    pieces: generalPlanRows(dataset, brand),
    audit,
    rootLabel: rootLabelOf(report.markets),
    today: now.toISOString().slice(0, 10),
    sitemapGap: sitemapGapOf(report, audit),
  };
  const meta: MeasurementMeta = {
    cutoff: report.cutoff,
    window: { start: report.window.start, end: report.window.end },
    range: report.window.preset,
    market: report.market,
    crawl: audit?.completedAt ?? null,
    measuredAt: now.toISOString(),
    measuredBy: author,
  };
  return {
    input,
    sections: projectActionReview(input),
    metricFor: (key: string) => actionMetric(key, input),
    meta,
    failed: report.sources.filter((source) => !source.ok),
  };
}
