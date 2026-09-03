import { z } from "zod";
import { intentSchema, marketCodeSchema } from "./schemas";

/**
 * Contrato editorial V2 (P1.2).
 *
 * Modela el calendario editorial general de las ocho marcas del grupo. Los
 * cuatro snapshots de V1 se importan por separado (D-006) y conservan su
 * literal original como procedencia; los campos normalizados conviven con los
 * literales para que ninguna curación posterior pierda información.
 */

export const EDITORIAL_SCHEMA_VERSION = "editorial.v1" as const;

export const editorialBrandSlugSchema = z.enum([
  "porcelanosa",
  "noken",
  "ecommerce",
  "butech",
  "antic-colonial",
  "krion",
  "xtone",
  "gamadecor",
]);

export const EDITORIAL_BRANDS = [
  { slug: "porcelanosa", name: "Porcelanosa", code: "PORCE", pilot: true },
  { slug: "noken", name: "Noken", code: "NOKEN", pilot: true },
  { slug: "ecommerce", name: "Ecommerce", code: "ECOM", pilot: false },
  { slug: "butech", name: "Butech", code: "BUTECH", pilot: false },
  { slug: "antic-colonial", name: "Antic Colonial", code: "AC", pilot: false },
  { slug: "krion", name: "Krion", code: "KRION", pilot: false },
  { slug: "xtone", name: "XTONE", code: "XTONE", pilot: false },
  { slug: "gamadecor", name: "Gamadecor", code: "GD", pilot: false },
] as const satisfies ReadonlyArray<{ slug: z.infer<typeof editorialBrandSlugSchema>; name: string; code: string; pilot: boolean }>;

/** Fuentes V1 preservadas. La clave es estable y aparece en cada registro. */
export const editorialSourceKeySchema = z.enum(["calendario-2026", "conjunto-backlog", "conjunto", "conjunto-propuestas"]);

/** Procedencia de una pieza: las cuatro fuentes V1 o "workbench" para piezas creadas directamente en V2 (P1.4). */
export const editorialProvenanceSourceSchema = z.union([editorialSourceKeySchema, z.literal("workbench")]);

export const editorialStatusSchema = z.enum([
  "backlog",
  "aceptado",
  "redactando",
  "revision",
  "programado",
  "publicado",
  "descartado",
  "desconocido",
]);

export const editorialPieceTypeSchema = z.enum([
  "nuevo",
  "reedicion",
  "migrar",
  "migrar_y_reeditar",
  "importar_trendbook",
  "refrescar_store",
  "auto_gsc",
  "sin_tipo",
  "otro",
]);

export const editorialLanguageSchema = z.enum(["es", "en", "fr", "de"]);

/** Marca normalizada sin perder el literal de la fuente ("Porcelanosa - Trendbook"). */
export const editorialBrandRefSchema = z.object({
  slug: editorialBrandSlugSchema.nullable(),
  /** Línea o sublínea de la marca cuando el literal la incluye (Trendbook, Categorías…). */
  line: z.string().nullable(),
  literal: z.string(),
});

export const editorialMonthSchema = z.object({
  year: z.number().int().min(2000).max(2100).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  /** "date" si procede de una fecha real, "estimate" si del literal "07 Julio", "calendar" si se heredó del año del calendario. */
  yearSource: z.enum(["date", "estimate", "calendar", "none"]),
  literal: z.string(),
});

/** El brief nunca se trunca ni se resume; se verifica por longitud normalizada y hash. */
export const editorialBriefSchema = z.object({
  text: z.string(),
  normalizedLength: z.number().int().nonnegative(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Ventana de medición posterior a la publicación (D-007). Vacía hasta P1.4/P6. */
export const editorialMeasurementSchema = z.object({
  windowDays: z.union([z.literal(28), z.literal(90), z.literal(180)]),
  status: z.enum(["pendiente", "en_curso", "medido", "no_aplicable"]),
  baseline: z.number().nullable(),
  result: z.number().nullable(),
  metricKey: z.string().nullable(),
  measuredAt: z.string().date().nullable(),
  interpretation: z.string().nullable(),
});

export const editorialProvenanceSchema = z.object({
  source: editorialProvenanceSourceSchema,
  /** Posición en el fichero original. Solo procedencia; nunca clave. */
  sourceIndex: z.number().int().nonnegative(),
  sourceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  importedAt: z.string().datetime(),
  /** Número de colisión cuando varias filas comparten clave de identidad. 1 = sin colisión. */
  identityOrdinal: z.number().int().positive(),
});

export const editorialLinkKindSchema = z.enum(["insight", "action", "query", "page", "cluster", "report", "result"]);
export const editorialLinkSchema = z.object({ kind: editorialLinkKindSchema, id: z.string() });
export type EditorialLink = z.infer<typeof editorialLinkSchema>;

export const editorialPieceSchema = z.object({
  id: z.string().regex(/^ed-(bk|pl)-[a-f0-9]{16}(-\d+)?$/),
  kind: z.enum(["backlog", "plan"]),
  provenance: editorialProvenanceSchema,
  status: editorialStatusSchema,
  statusLiteral: z.string(),
  type: editorialPieceTypeSchema,
  typeLiteral: z.string(),
  brand: editorialBrandRefSchema,
  market: marketCodeSchema.nullable(),
  marketLiteral: z.string(),
  language: editorialLanguageSchema.nullable(),
  month: editorialMonthSchema,
  writingDate: z.string().date().nullable(),
  publicationDate: z.string().date().nullable(),
  /** Avisos de parseo (formatos de fecha no estándar, URL inválida…). */
  warnings: z.array(z.string()),
  theme: z.string().nullable(),
  subtheme: z.string().nullable(),
  keyword: z.string().nullable(),
  title: z.string().nullable(),
  url: z.string().nullable(),
  brief: editorialBriefSchema.nullable(),
  // Extensión V2: nulos hasta curación en workbench.
  intent: intentSchema.nullable(),
  cluster: z.string().nullable(),
  objective: z.string().nullable(),
  hypothesis: z.string().nullable(),
  impact: z.number().int().min(1).max(5).nullable(),
  effort: z.number().int().min(1).max(5).nullable(),
  owner: z.string().nullable(),
  author: z.string().nullable(),
  reviewer: z.string().nullable(),
  dependencies: z.array(z.string()),
  successKpi: z.string().nullable(),
  measurements: z.array(editorialMeasurementSchema),
  /** Enlaces a insight, acción, query, URL o informe. Bidireccionalidad en P1.4. */
  links: z.array(editorialLinkSchema),
});

export const editorialCalendarEventSchema = z.object({
  id: z.string().regex(/^ed-ev-[a-f0-9]{16}(-\d+)?$/),
  provenance: editorialProvenanceSchema,
  date: z.string().date(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  typeLiteral: z.string(),
  brand: editorialBrandRefSchema,
  /** Número de secuencia dentro del mes ("1", "2") cuando la fuente lo indica. */
  sequence: z.string().nullable(),
  label: z.string(),
  /** Pieza planificada vinculada tras la curación. Nulo hasta decisión editorial. */
  pieceId: z.string().nullable(),
});

export const editorialThemeBlockSchema = z.object({
  id: z.string().regex(/^ed-th-[a-f0-9]{16}$/),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  monthName: z.string(),
  theme: z.string(),
  subthemes: z.array(z.string()),
});

export const editorialProposalSchema = z.object({
  id: z.string().regex(/^ed-pr-[a-f0-9]{16}(-\d+)?$/),
  slotId: z.string(),
  ordinal: z.number().int().positive(),
  subtheme: z.string().nullable(),
  keyword: z.string().nullable(),
  searchVolume: z.number().nullable(),
  titles: z.array(z.string()),
  angle: z.string().nullable(),
  format: z.enum(["rework", "nuevo", "otro"]),
  formatLiteral: z.string(),
  type: editorialPieceTypeSchema,
  typeLiteral: z.string(),
  url: z.string().nullable(),
  /** Marcada por prensa/SEO al elegir una alternativa. Nula hasta curación. */
  selected: z.boolean().nullable(),
});

export const editorialSlotSchema = z.object({
  id: z.string().regex(/^ed-sl-[a-f0-9]{16}(-\d+)?$/),
  provenance: editorialProvenanceSchema,
  status: editorialStatusSchema,
  statusLiteral: z.string(),
  brand: editorialBrandRefSchema,
  market: marketCodeSchema.nullable(),
  marketLiteral: z.string(),
  month: editorialMonthSchema,
  publicationDate: z.string().date().nullable(),
  theme: z.string().nullable(),
  /** Literal del hueco en V1. No es único (28 valores para 34 huecos). */
  slotLiteral: z.string(),
  typeLiteral: z.string(),
  proposals: z.array(editorialProposalSchema),
  selectedProposalId: z.string().nullable(),
  warnings: z.array(z.string()),
});

export const editorialSourceArchiveSchema = z.object({
  key: editorialSourceKeySchema,
  fileName: z.string(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  byteLength: z.number().int().nonnegative(),
  schema: z.string(),
  importedAt: z.string().datetime(),
  expectedCount: z.number().int().nonnegative(),
  importedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  status: z.enum(["ok", "count-mismatch", "rejections"]),
});

export const editorialRejectionSchema = z.object({
  source: editorialSourceKeySchema,
  sourceIndex: z.number().int().nonnegative(),
  reason: z.string(),
  excerpt: z.string(),
});

export const editorialImportReportSchema = z.object({
  schemaVersion: z.literal(EDITORIAL_SCHEMA_VERSION),
  importedAt: z.string().datetime(),
  /** Hash del conjunto de hashes de archivo; permite detectar re-importaciones idénticas. */
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  archives: z.array(editorialSourceArchiveSchema),
  rejections: z.array(editorialRejectionSchema),
  warnings: z.array(z.string()),
  brandAliases: z.array(z.object({ literal: z.string(), slug: editorialBrandSlugSchema.nullable(), line: z.string().nullable(), occurrences: z.number().int().positive() })),
  brandsWithoutEvents: z.array(editorialBrandSlugSchema),
  emptyFields: z.record(z.string(), z.record(z.string(), z.number().int().nonnegative())),
  duplicates: z.record(z.string(), z.object({ keywords: z.number().int(), titles: z.number().int(), urls: z.number().int() })),
  briefs: z.record(z.string(), z.object({ count: z.number().int(), totalChars: z.number().int(), totalNormalizedChars: z.number().int() })),
  identityCollisions: z.number().int().nonnegative(),
});

export const editorialBrandSummarySchema = z.object({
  slug: editorialBrandSlugSchema,
  name: z.string(),
  code: z.string(),
  pilot: z.boolean(),
  calendarEvents: z.number().int().nonnegative(),
  backlogPieces: z.number().int().nonnegative(),
  planPieces: z.number().int().nonnegative(),
  slots: z.number().int().nonnegative(),
});

export const editorialDatasetSchema = z.object({
  schemaVersion: z.literal(EDITORIAL_SCHEMA_VERSION),
  generatedAt: z.string().datetime(),
  mode: z.enum(["v1-import", "curated", "synthetic"]),
  planningYear: z.number().int(),
  brands: z.array(editorialBrandSummarySchema).length(8),
  calendar: z.object({
    events: z.array(editorialCalendarEventSchema),
    themes: z.array(editorialThemeBlockSchema),
  }),
  backlog: z.array(editorialPieceSchema),
  plan: z.array(editorialPieceSchema),
  slots: z.array(editorialSlotSchema),
  report: editorialImportReportSchema,
});

export type EditorialBrandSlug = z.infer<typeof editorialBrandSlugSchema>;
export type EditorialSourceKey = z.infer<typeof editorialSourceKeySchema>;
export type EditorialProvenanceSource = z.infer<typeof editorialProvenanceSourceSchema>;
export type EditorialStatus = z.infer<typeof editorialStatusSchema>;
export type EditorialPieceType = z.infer<typeof editorialPieceTypeSchema>;
export type EditorialBrandRef = z.infer<typeof editorialBrandRefSchema>;
export type EditorialPiece = z.infer<typeof editorialPieceSchema>;
export type EditorialCalendarEvent = z.infer<typeof editorialCalendarEventSchema>;
export type EditorialThemeBlock = z.infer<typeof editorialThemeBlockSchema>;
export type EditorialProposal = z.infer<typeof editorialProposalSchema>;
export type EditorialSlot = z.infer<typeof editorialSlotSchema>;
export type EditorialSourceArchive = z.infer<typeof editorialSourceArchiveSchema>;
export type EditorialImportReport = z.infer<typeof editorialImportReportSchema>;
export type EditorialDataset = z.infer<typeof editorialDatasetSchema>;

/** Etiquetas visibles en español para estados y tipos normalizados. */
export const EDITORIAL_STATUS_LABELS: Record<EditorialStatus, string> = {
  backlog: "Backlog",
  aceptado: "Aceptado",
  redactando: "Redactando",
  revision: "En revisión",
  programado: "Programado",
  publicado: "Publicado",
  descartado: "Descartado",
  desconocido: "Sin estado",
};

export const EDITORIAL_TYPE_LABELS: Record<EditorialPieceType, string> = {
  nuevo: "Nuevo",
  reedicion: "Reedición",
  migrar: "Migrar",
  migrar_y_reeditar: "Migrar y reeditar",
  importar_trendbook: "Importar de Trendbook",
  refrescar_store: "Refrescar (store)",
  auto_gsc: "Auto (GSC)",
  sin_tipo: "Sin tipo",
  otro: "Otro",
};

export const MONTH_NAMES_ES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"] as const;
