import { z } from "zod";

/**
 * Contrato del baseline de reconciliación V1 -> V2 (P2.4).
 *
 * `migration.ts` describe qué se hace con cada capacidad y con qué tolerancia
 * se aceptará su dataset. Este contrato describe el **resultado medido** de
 * ejecutar esos acuerdos: qué ficheros de V1 se leyeron, con qué hash, qué
 * cifras dieron y si el destino V2 existía ya.
 *
 * La distinción que sostiene todo el fichero es la de `reconciliationStateSchema`:
 * medir el lado V1 no es haber alcanzado paridad. Un baseline congelado sirve
 * para que la migración de P3, P5, P6 y P8 se valide contra un número
 * registrado con hash en el repositorio, en vez de contra una V1 que puede
 * haber cambiado por el camino.
 *
 * El dato vive en `docs/continuity/v1-reconciliation-baseline.json`, lo escribe
 * `pnpm reconcile:capture` y lo verifica `pnpm reconcile:check`.
 */

export const RECONCILIATION_SCHEMA_VERSION = 1 as const;

export const reconciliationStateSchema = z.enum([
  /** Los dos lados existen, se miden y coinciden. Es el único estado que prueba paridad de dato. */
  "reconciled",
  /** El lado V1 está medido y hasheado; el destino V2 todavía no existe. */
  "baseline-frozen",
  /** No hay artefacto que medir: la fuente V1 solo existe como consulta en vivo. */
  "blocked",
  /** La fuente nunca salió del navegador de cada persona: no hay nada contra lo que reconciliar. */
  "not-comparable",
]);

/** Huella de un fichero de V1. `missing` distingue «no estaba» de «no se midió». */
export const reconciliationFileSchema = z.union([
  z.object({
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    bytes: z.number().int().nonnegative(),
  }),
  z.object({ path: z.string().min(1), missing: z.literal(true) }),
]);

/** Medidas de un lado. `__total` es la única clave derivada admitida. */
export const reconciliationMeasuresSchema = z.record(z.string(), z.union([z.number(), z.string(), z.null()]));

export const reconciliationSideSchema = z.object({
  files: z.array(reconciliationFileSchema),
  measures: reconciliationMeasuresSchema,
});

export const reconciliationV2SideSchema = z.object({
  source: z.string().min(1),
  measures: reconciliationMeasuresSchema,
  /** Hash con el que el importador archivó cada fuente V1, cuando lo registra. */
  archiveHashes: z.record(z.string(), z.string().regex(/^[a-f0-9]{64}$/)).optional(),
});

export const reconciliationDatasetSchema = z
  .object({
    id: z.string().min(1),
    dataset: z.string().min(1),
    phase: z.string().regex(/^P\d+(\.\d+)?$/),
    state: reconciliationStateSchema,
    /** Obligatorio cuando no hay nada que medir: por qué, no solo que no se pudo. */
    blockedReason: z.string().nullable(),
    v1: reconciliationSideSchema,
    v2: reconciliationV2SideSchema.nullable(),
  })
  .refine((dataset) => dataset.state !== "reconciled" || dataset.v2 !== null, {
    message: "Un dataset reconciliado necesita lado V2 medido: sin él no hay nada que comparar.",
    path: ["v2"],
  })
  .refine((dataset) => !(dataset.state === "blocked" || dataset.state === "not-comparable") || Boolean(dataset.blockedReason), {
    message: "Un dataset sin medición debe explicar por qué no hay artefacto que medir.",
    path: ["blockedReason"],
  })
  .refine((dataset) => dataset.state !== "baseline-frozen" || dataset.v1.files.length > 0, {
    message: "Un baseline congelado sin ficheros medidos no congela nada.",
    path: ["v1", "files"],
  });

export const v1ReconciliationBaselineSchema = z.object({
  schemaVersion: z.literal(RECONCILIATION_SCHEMA_VERSION),
  capturedAt: z.string().datetime(),
  v1Source: z.string().min(1),
  note: z.string().min(40),
  datasets: z.array(reconciliationDatasetSchema).min(1),
});

export type ReconciliationState = z.infer<typeof reconciliationStateSchema>;
export type ReconciliationDataset = z.infer<typeof reconciliationDatasetSchema>;
export type V1ReconciliationBaseline = z.infer<typeof v1ReconciliationBaselineSchema>;

/** Recuento por estado, para el informe y para el estado del proyecto. */
export function summarizeReconciliation(baseline: V1ReconciliationBaseline) {
  const byState = Object.fromEntries(reconciliationStateSchema.options.map((state) => [state, 0])) as Record<ReconciliationState, number>;
  let filesMeasured = 0;
  for (const dataset of baseline.datasets) {
    byState[dataset.state] += 1;
    filesMeasured += dataset.v1.files.filter((file) => !("missing" in file)).length;
  }
  return { total: baseline.datasets.length, byState, filesMeasured };
}
