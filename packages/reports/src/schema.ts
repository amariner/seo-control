import { z } from "zod";
import { BRAND_REPORT_VERSION, brandReportSchema, brandSlugSchema, siteAuditSummarySchema } from "@seo/contracts";
import { parsePeriod } from "./periods";

/**
 * Contrato de los informes publicados (D-076).
 *
 * Un solo fichero, `data/published/reports.json`, reúne por informe
 * (`<marca>:<periodo>`) dos cosas que escribe solo el workbench:
 *
 * - `snapshot`: la versión congelada de un periodo cerrado (el índice guarda
 *   sus datos básicos y el contenido va en `snapshots/<marca>/<periodo>.json`,
 *   que el visor lee de disco solo al abrir ese informe). Guarda las
 *   entradas del informe (el informe de marca de GA4/GSC, el plan editorial y
 *   el resumen del crawl en ese momento), no las diapositivas: las reglas de
 *   redacción pueden mejorar sin volver a pedir datos, y las cifras quedan
 *   fijas hasta que alguien pida regenerar.
 * - `curation`: las puntualizaciones del equipo SEO: apartados, cifras,
 *   tablas o filas que no se muestran, una nota por apartado y acciones
 *   propias en el plan. Se aplican también al informe en vivo del mismo
 *   periodo.
 *
 * El visor lo empaqueta en el build (como el resumen del crawl) y nunca lo
 * escribe; llega a producción con commit y despliegue.
 */

export const reportIdSchema = z
  .string()
  .regex(/^[a-z-]+:\d{4}-(Q[1-4]|0[1-9]|1[0-2])$/)
  .refine((id) => brandSlugSchema.safeParse(id.split(":")[0]).success && parsePeriod(id.split(":")[1]!) !== null, "Informe desconocido");

export const reportActionPrioritySchema = z.enum(["urgente", "alta", "media", "baja"]);

export const reportSlideCurationSchema = z.object({
  hidden: z.boolean().optional(),
  /** Puntualización del equipo SEO, visible en la diapositiva. */
  note: z.string().trim().max(1200).optional(),
  hideReading: z.boolean().optional(),
  /** Cifras ocultas, por su etiqueta. */
  hiddenMetrics: z.array(z.string()).optional(),
  /** Tablas ocultas, por su título. */
  hiddenLists: z.array(z.string()).optional(),
  /** Filas ocultas: `<título de la tabla>␟<primera celda>`. */
  hiddenRows: z.array(z.string()).optional(),
});
export type ReportSlideCuration = z.infer<typeof reportSlideCurationSchema>;

export const reportTeamActionSchema = z.object({
  priority: reportActionPrioritySchema,
  title: z.string().trim().min(3).max(200),
  why: z.string().trim().max(400).default(""),
});
export type ReportTeamAction = z.infer<typeof reportTeamActionSchema>;

export const reportCurationSchema = z.object({
  slides: z.record(z.string(), reportSlideCurationSchema).default({}),
  actions: z.array(reportTeamActionSchema).max(12).default([]),
  updatedAt: z.string(),
  updatedBy: z.string(),
});
export type ReportCuration = z.infer<typeof reportCurationSchema>;

export const reportSnapshotSchema = z.object({
  /** Versión del contrato del informe de marca con la que se generó. */
  reportVersion: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  report: brandReportSchema,
  pieces: z.array(z.record(z.string(), z.unknown())),
  audit: siteAuditSummarySchema.nullable(),
  rootLabel: z.string().optional(),
  today: z.string(),
});
export type ReportSnapshot = z.infer<typeof reportSnapshotSchema>;

/** Lo que el índice guarda de una versión congelada; el contenido va en su propio fichero. */
export const snapshotMetaSchema = z.object({
  reportVersion: z.string(),
  generatedAt: z.string(),
  generatedBy: z.string(),
  cutoff: z.string(),
  /** Ruta relativa a `data/published/`. */
  file: z.string().regex(/^snapshots\/[a-z-]+\/\d{4}-(Q[1-4]|0[1-9]|1[0-2])\.json$/),
  /** Huella del fichero, para saber si lo subido es lo que se generó. */
  sha256: z.string(),
});
export type SnapshotMeta = z.infer<typeof snapshotMetaSchema>;

export const publishedReportSchema = z.object({
  snapshot: snapshotMetaSchema.optional(),
  curation: reportCurationSchema.optional(),
});
export type PublishedReport = z.infer<typeof publishedReportSchema>;

export const publishedReportsSchema = z.object({
  schemaVersion: z.literal(1),
  updatedAt: z.string(),
  reports: z.record(z.string(), publishedReportSchema),
});
export type PublishedReports = z.infer<typeof publishedReportsSchema>;

export const emptyPublishedReports = (): PublishedReports => ({ schemaVersion: 1, updatedAt: new Date(0).toISOString(), reports: {} });

export const snapshotFileOf = (id: string) => {
  const [brand, period] = id.split(":");
  return `snapshots/${brand}/${period}.json`;
};

export const reportIdOf = (brand: string, period: string) => `${brand}:${period}`;

/** La versión congelada se generó con otro contrato del informe de marca. */
export const isStaleSnapshot = (snapshot: Pick<ReportSnapshot, "reportVersion">) => snapshot.reportVersion !== BRAND_REPORT_VERSION;

export const ROW_KEY_SEPARATOR = "␟";
export const rowKeyOf = (list: string, firstCell: string) => `${list}${ROW_KEY_SEPARATOR}${firstCell}`;
