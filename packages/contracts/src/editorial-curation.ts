import { z } from "zod";
import { intentSchema } from "./schemas";
import { editorialLinkSchema, editorialPieceSchema, editorialPieceTypeSchema, editorialStatusSchema } from "./editorial";

/**
 * Curación editorial (P1.4): capa de escritura exclusiva del workbench sobre el
 * dataset importado de V1 (D-008). `applyCuration` en `@seo/editorial` la fusiona
 * con el dataset importado para producir el dataset efectivo que sirve el visor,
 * que sigue siendo de solo lectura y nunca escribe este almacén.
 *
 * Cada registro guarda el estado curado actual (`current`) y su historial
 * (`history`) para que "versionar" sea real: ninguna edición sustituye la anterior
 * sin dejar rastro.
 */

export const EDITORIAL_CURATION_SCHEMA_VERSION = "editorial-curation.v1" as const;

/** Campos que el workbench puede curar sobre una pieza. Todos nulos = sin curar. */
export const editorialCurationFieldsSchema = z.object({
  status: editorialStatusSchema.nullable(),
  type: editorialPieceTypeSchema.nullable(),
  year: z.number().int().min(2000).max(2100).nullable(),
  month: z.number().int().min(1).max(12).nullable(),
  writingDate: z.string().date().nullable(),
  publicationDate: z.string().date().nullable(),
  intent: intentSchema.nullable(),
  cluster: z.string().nullable(),
  objective: z.string().nullable(),
  hypothesis: z.string().nullable(),
  impact: z.number().int().min(1).max(5).nullable(),
  effort: z.number().int().min(1).max(5).nullable(),
  owner: z.string().nullable(),
  author: z.string().nullable(),
  reviewer: z.string().nullable(),
  successKpi: z.string().nullable(),
  links: z.array(editorialLinkSchema),
});
export type EditorialCurationFields = z.infer<typeof editorialCurationFieldsSchema>;

export const EMPTY_CURATION_FIELDS: EditorialCurationFields = {
  status: null,
  type: null,
  year: null,
  month: null,
  writingDate: null,
  publicationDate: null,
  intent: null,
  cluster: null,
  objective: null,
  hypothesis: null,
  impact: null,
  effort: null,
  owner: null,
  author: null,
  reviewer: null,
  successKpi: null,
  links: [],
};

const revisionMeta = {
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().nullable(),
  note: z.string().nullable(),
};

export const editorialPieceCurationRevisionSchema = z.object({ ...editorialCurationFieldsSchema.shape, ...revisionMeta });
export type EditorialPieceCurationRevision = z.infer<typeof editorialPieceCurationRevisionSchema>;

export const editorialPieceCurationRecordSchema = z.object({
  pieceId: z.string(),
  current: editorialPieceCurationRevisionSchema,
  history: z.array(editorialPieceCurationRevisionSchema),
});
export type EditorialPieceCurationRecord = z.infer<typeof editorialPieceCurationRecordSchema>;

export const editorialSlotCurationRevisionSchema = z.object({ selectedProposalId: z.string().nullable(), ...revisionMeta });
export type EditorialSlotCurationRevision = z.infer<typeof editorialSlotCurationRevisionSchema>;

export const editorialSlotCurationRecordSchema = z.object({
  slotId: z.string(),
  current: editorialSlotCurationRevisionSchema,
  history: z.array(editorialSlotCurationRevisionSchema),
});
export type EditorialSlotCurationRecord = z.infer<typeof editorialSlotCurationRecordSchema>;

/** Sustituye la relación heurística evento -> pieza (marca + mes) por un vínculo real curado. */
export const editorialEventCurationRevisionSchema = z.object({ pieceId: z.string().nullable(), ...revisionMeta });
export type EditorialEventCurationRevision = z.infer<typeof editorialEventCurationRevisionSchema>;

export const editorialEventCurationRecordSchema = z.object({
  eventId: z.string(),
  current: editorialEventCurationRevisionSchema,
  history: z.array(editorialEventCurationRevisionSchema),
});
export type EditorialEventCurationRecord = z.infer<typeof editorialEventCurationRecordSchema>;

export const editorialCurationStoreSchema = z.object({
  schemaVersion: z.literal(EDITORIAL_CURATION_SCHEMA_VERSION),
  updatedAt: z.string().datetime(),
  pieces: z.record(z.string(), editorialPieceCurationRecordSchema),
  slots: z.record(z.string(), editorialSlotCurationRecordSchema),
  events: z.record(z.string(), editorialEventCurationRecordSchema),
  /** Piezas creadas íntegramente en el workbench (sin fila V1 de origen). Siempre `kind: "backlog"`. */
  createdPieces: z.array(editorialPieceSchema),
});
export type EditorialCurationStore = z.infer<typeof editorialCurationStoreSchema>;

export function emptyCurationStore(now: string): EditorialCurationStore {
  return { schemaVersion: EDITORIAL_CURATION_SCHEMA_VERSION, updatedAt: now, pieces: {}, slots: {}, events: {}, createdPieces: [] };
}
