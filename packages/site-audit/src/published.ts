import { publishedSiteAuditsSchema, type BrandSlug, type PublishedSiteAudits, type SiteAuditSummary } from "@seo/contracts";
import published from "../data/published/site-audits.json";

/**
 * Resúmenes de crawl publicados (D-070), empaquetados en el build del visor.
 * Se validan una vez por proceso. Solo servidor: el navegador recibe lo que
 * la página renderiza.
 */
let cached: PublishedSiteAudits | null = null;

export function getPublishedAudit(project: BrandSlug): SiteAuditSummary | null {
  cached ??= publishedSiteAuditsSchema.parse(published);
  return cached.audits[project] ?? null;
}
