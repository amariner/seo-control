import { brandSlugSchema, type EditorialMeasurementStore } from "@seo/contracts";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { writeMeasurementStore } from "@seo/editorial/measurement-store";
import { liveCutoff, measureEditorialPieces } from "@seo/repository";

/**
 * Mide las piezas publicadas del plan con Search Console real y guarda el
 * resultado (P3.5, D-079). Lo usan el botón del workbench y
 * `pnpm editorial:measure`. Reescribe el fichero entero: la medición es un
 * cálculo sobre el dato de hoy, no un historial.
 */
export async function runEditorialMeasurement({ author, env = process.env, now = new Date() }: { author: string; env?: Record<string, string | undefined>; now?: Date }) {
  if (!env.GOOGLE_REFRESH_TOKEN && !env.GSC_SERVICE_ACCOUNT_JSON)
    throw new Error("Faltan las credenciales de Search Console en apps/workbench/.env.local.");
  const dataset = getEffectiveEditorialDataset();
  const pieces = [...dataset.plan, ...dataset.backlog].map((piece) => ({
    id: piece.id,
    brand: brandSlugSchema.safeParse(piece.brand.slug).success ? brandSlugSchema.parse(piece.brand.slug) : null,
    status: piece.status,
    publicationDate: piece.publicationDate,
    url: piece.url,
    keyword: piece.keyword,
  }));
  const cutoff = liveCutoff(now);
  const run = await measureEditorialPieces({ env, pieces, cutoff, now });
  const store: EditorialMeasurementStore = {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    generatedBy: author,
    source: "gsc",
    cutoff,
    pieces: run.pieces,
    skipped: run.skipped,
  };
  writeMeasurementStore(store);
  return { store, requests: run.requests };
}
