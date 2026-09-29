import { publishedReportSchema, reportCurationSchema, snapshotMetaSchema, type PublishedReports } from "./schema";

/**
 * Lectura tolerante del índice publicado: una entrada que ya no cumple el
 * contrato pierde solo la parte inválida; nunca tumba el resto.
 */
export function parsePublishedReports(raw: unknown): PublishedReports & { invalid: string[] } {
  const input = (raw ?? {}) as { updatedAt?: unknown; reports?: Record<string, unknown> };
  const invalid: string[] = [];
  const reports: PublishedReports["reports"] = {};
  for (const [id, value] of Object.entries(input.reports ?? {})) {
    const whole = publishedReportSchema.safeParse(value);
    if (whole.success) {
      reports[id] = whole.data;
      continue;
    }
    invalid.push(id);
    const item = (value ?? {}) as { snapshot?: unknown; curation?: unknown };
    const curation = reportCurationSchema.safeParse(item.curation);
    const snapshot = snapshotMetaSchema.safeParse(item.snapshot);
    reports[id] = {
      ...(curation.success ? { curation: curation.data } : {}),
      ...(snapshot.success ? { snapshot: snapshot.data } : {}),
    };
  }
  return {
    schemaVersion: 1,
    updatedAt: typeof input.updatedAt === "string" ? input.updatedAt : new Date(0).toISOString(),
    reports,
    invalid,
  };
}
