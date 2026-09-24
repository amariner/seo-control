import { z } from "zod";

/**
 * Contrato de migración V1 -> V2 (P2.1).
 *
 * `docs/continuity/V1_PARITY.md` describe *dónde está* cada capacidad en V2
 * (`missing`, `partial-synthetic`, `implemented`...). Este contrato describe
 * *qué se va a hacer con ella* (`retain`, `redesign`, `merge`, `defer`,
 * `retire`) y con qué evidencia se acepta la migración de cada dataset. Son
 * dos ejes distintos y se mantienen separados a propósito.
 *
 * El dato vive en `docs/continuity/v1-migration-inventory.json`, se valida en
 * `migration.test.ts` y se renderiza a Markdown con `pnpm migration:report`.
 */

export const V1_MIGRATION_SCHEMA_VERSION = "v1-migration.1" as const;

/** Qué se hace con la capacidad V1. */
export const migrationDispositionSchema = z.enum([
  /** Se conserva el comportamiento tal cual (incluidas las redirecciones). */
  "retain",
  /** Se conserva el valor, se rehace la implementación sobre contratos V2. */
  "redesign",
  /** Se funde con otra u otras superficies en un único capítulo V2. */
  "merge",
  /** Se conserva, pero fuera del alcance actual; llega en una fase posterior. */
  "defer",
  /** No se reimplementa. Exige motivo y alternativa explícitos. */
  "retire",
]);

/**
 * Una retirada solo es válida cuando el responsable la aprueba (regla de
 * `ROADMAP.md`). Hasta entonces queda registrada como `proposed`, nunca
 * ejecutada en silencio.
 */
export const migrationApprovalSchema = z.enum(["approved", "proposed"]);

/** Estados de paridad de `docs/continuity/V1_PARITY.md`. */
export const migrationParityStateSchema = z.enum([
  "missing",
  "foundation",
  "partial-synthetic",
  "implemented",
  "verified",
  "redirected",
  "retired-approved",
]);

/** Fase o subfase del roadmap: `P2`, `P3.5`, `P11.3`. */
export const migrationPhaseSchema = z
  .string()
  .regex(/^P(?:[0-9]|1[0-2])(?:\.[0-9])?$/, "Fase inválida (ej. P2, P3.5)");

/** Naturaleza de la superficie V1 catalogada. */
export const migrationSurfaceKindSchema = z.enum([
  /** Ruta montada y navegable en V1. */
  "page",
  /** Redirección permanente a otra ruta V1. */
  "redirect",
  /** Endpoint de utilidad sin UI montada (`import.meta.env.DEV`). */
  "dev-endpoint",
]);

export const v1SurfaceSchema = z
  .object({
    id: z.string().min(1),
    v1Route: z.string().startsWith("/"),
    kind: migrationSurfaceKindSchema,
    /** Qué hace para el equipo SEO, en una frase. */
    capability: z.string().min(10),
    /** De dónde salen los datos: APIs V1, ficheros del repo, SQLite, GA4/GSC/SEMrush. */
    sources: z.array(z.string().min(1)).min(1),
    /** Módulos que transforman el dato antes de pintarlo. */
    transformations: z.array(z.string().min(1)),
    /** Filtros y estado que el usuario controla. */
    filters: z.array(z.string().min(1)),
    /** Exportaciones y salidas descargables. */
    exports: z.array(z.string().min(1)),
    /** Servicios, credenciales o almacenes de los que depende para funcionar. */
    dependencies: z.array(z.string().min(1)),
    disposition: migrationDispositionSchema,
    /** Motivo de la clasificación. Obligatorio y explícito. */
    dispositionReason: z.string().min(20),
    approval: migrationApprovalSchema,
    /** Con qué se sustituye. Obligatorio si se retira o se aplaza. */
    alternative: z.string().min(10).nullable(),
    parityState: migrationParityStateSchema,
    targetPhase: migrationPhaseSchema,
    /** Ruta o capítulo V2 destino; `null` mientras no exista destino decidido. */
    v2Target: z.string().nullable(),
  })
  .superRefine((surface, ctx) => {
    if (
      (surface.disposition === "retire" || surface.disposition === "defer") &&
      !surface.alternative
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["alternative"],
        message: `${surface.v1Route}: una capacidad ${surface.disposition} exige alternativa explícita`,
      });
    }
    if (
      surface.disposition === "retire" &&
      surface.approval === "approved" &&
      surface.parityState !== "retired-approved"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["parityState"],
        message: `${surface.v1Route}: una retirada aprobada debe quedar como retired-approved en la matriz de paridad`,
      });
    }
  });

/** Cómo se compara una métrica migrada contra su origen V1. */
export const reconciliationToleranceSchema = z
  .object({
    /**
     * `exact`: debe coincidir dígito a dígito.
     * `absolute`: diferencia máxima en la unidad de la métrica.
     * `relative`: diferencia máxima en porcentaje sobre el valor V1.
     * `not-comparable`: no existe comparación válida; hay que decir por qué.
     */
    kind: z.enum(["exact", "absolute", "relative", "not-comparable"]),
    value: z.number().nonnegative().nullable(),
    unit: z.string().min(1).nullable(),
    /** Por qué esa tolerancia y no cero. */
    rationale: z.string().min(15),
  })
  .superRefine((tolerance, ctx) => {
    const needsValue =
      tolerance.kind === "absolute" || tolerance.kind === "relative";
    if (needsValue && tolerance.value === null) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: "Una tolerancia absoluta o relativa exige un valor",
      });
    }
    if (!needsValue && tolerance.value !== null) {
      ctx.addIssue({
        code: "custom",
        path: ["value"],
        message: `Una tolerancia ${tolerance.kind} no lleva valor`,
      });
    }
  });

export const reconciliationMetricSchema = z.object({
  name: z.string().min(1),
  /** Valor de control conocido en V1, cuando existe medición previa. */
  v1Baseline: z.union([z.number(), z.string()]).nullable(),
  tolerance: reconciliationToleranceSchema,
});

export const datasetReconciliationSchema = z.object({
  id: z.string().min(1),
  dataset: z.string().min(3),
  /** Fichero, tabla o API de V1 que actúa como origen. */
  v1Origin: z.string().min(3),
  /** Dónde vive en V2 (o dónde vivirá). */
  v2Target: z.string().min(3),
  /** Qué muestra concreta se compara. Sin esto no hay criterio de aceptación. */
  sample: z.string().min(15),
  /** Contra qué se compara esa muestra. */
  comparedAgainst: z.string().min(10),
  metrics: z.array(reconciliationMetricSchema).min(1),
  /** Qué se hace cuando no cuadra. */
  onMismatch: z.string().min(20),
  phase: migrationPhaseSchema,
  status: z.enum(["reconciled", "pending", "not-comparable"]),
});

export const v1MigrationInventorySchema = z.object({
  schemaVersion: z.literal(V1_MIGRATION_SCHEMA_VERSION),
  auditedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  v1Source: z.object({
    repository: z.string().min(3),
    stack: z.string().min(3),
    pages: z.number().int().positive(),
    endpoints: z.number().int().positive(),
  }),
  surfaces: z.array(v1SurfaceSchema).min(1),
  reconciliations: z.array(datasetReconciliationSchema).min(1),
});

export type V1Surface = z.infer<typeof v1SurfaceSchema>;
export type DatasetReconciliation = z.infer<typeof datasetReconciliationSchema>;
export type V1MigrationInventory = z.infer<typeof v1MigrationInventorySchema>;
export type MigrationDisposition = z.infer<typeof migrationDispositionSchema>;

export interface MigrationInventorySummary {
  surfaces: number;
  byDisposition: Record<MigrationDisposition, number>;
  byPhase: Record<string, number>;
  /** Retiradas sin aprobar: bloquean el criterio de salida de P2. */
  pendingRetirements: string[];
  /** Superficies sin destino V2 decidido. */
  withoutV2Target: string[];
  reconciliations: number;
  pendingReconciliations: number;
}

/** Resumen agregado del inventario. Puro: no lee ficheros ni escribe nada. */
export function summarizeMigrationInventory(
  inventory: V1MigrationInventory,
): MigrationInventorySummary {
  const byDisposition: Record<MigrationDisposition, number> = {
    retain: 0,
    redesign: 0,
    merge: 0,
    defer: 0,
    retire: 0,
  };
  const byPhase: Record<string, number> = {};
  const pendingRetirements: string[] = [];
  const withoutV2Target: string[] = [];

  for (const surface of inventory.surfaces) {
    byDisposition[surface.disposition] += 1;
    byPhase[surface.targetPhase] = (byPhase[surface.targetPhase] ?? 0) + 1;
    if (surface.disposition === "retire" && surface.approval !== "approved")
      pendingRetirements.push(surface.v1Route);
    if (surface.v2Target === null) withoutV2Target.push(surface.v1Route);
  }

  return {
    surfaces: inventory.surfaces.length,
    byDisposition,
    byPhase,
    pendingRetirements,
    withoutV2Target,
    reconciliations: inventory.reconciliations.length,
    pendingReconciliations: inventory.reconciliations.filter(
      (item) => item.status === "pending",
    ).length,
  };
}
