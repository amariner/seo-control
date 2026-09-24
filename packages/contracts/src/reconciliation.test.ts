import { describe, expect, it } from "vitest";
import baselineData from "../../../docs/continuity/v1-reconciliation-baseline.json";
import inventoryData from "../../../docs/continuity/v1-migration-inventory.json";
import { reconciliationDatasetSchema, summarizeReconciliation, v1ReconciliationBaselineSchema } from "./reconciliation";
import { v1MigrationInventorySchema } from "./migration";

/**
 * Valida el baseline real contra su contrato. La ejecución (leer la V1, hashear
 * y comparar) vive en `scripts/reconcile.mjs`, porque este paquete no lee
 * ficheros del disco de V1; aquí se comprueba que lo capturado es coherente y
 * que sigue cubriendo todos los contratos del inventario.
 */
const baseline = v1ReconciliationBaselineSchema.parse(baselineData);
const inventory = v1MigrationInventorySchema.parse(inventoryData);

const dataset = (id: string) => baseline.datasets.find((item) => item.id === id);

describe("baseline de reconciliación V1 (P2.4)", () => {
  it("cubre exactamente los contratos del inventario, sin sobras ni faltas", () => {
    expect(baseline.datasets.map((item) => item.id).sort()).toEqual(inventory.reconciliations.map((item) => item.id).sort());
  });

  it("respeta la fase destino que declara cada contrato", () => {
    for (const contract of inventory.reconciliations) {
      expect(dataset(contract.id)?.phase, contract.id).toBe(contract.phase);
    }
  });

  it("el dataset editorial es el único reconciliado, y con los dos lados medidos", () => {
    const reconciled = baseline.datasets.filter((item) => item.state === "reconciled");
    expect(reconciled.map((item) => item.id)).toEqual(["editorial-snapshots"]);
    const editorial = reconciled[0]!;
    expect(editorial.v2).not.toBeNull();
    expect(editorial.v2!.measures).toMatchObject({ calendarEvents: 39, backlog: 115, plan: 146, slots: 34, proposals: 68, themeBlocks: 6 });
    expect(Object.keys(editorial.v2!.archiveHashes ?? {})).toHaveLength(4);
  });

  it("cada hash archivado por el importador coincide con el del fichero medido en V1", () => {
    const editorial = dataset("editorial-snapshots")!;
    for (const [key, hash] of Object.entries(editorial.v2!.archiveHashes ?? {})) {
      const file = editorial.v1.files.find((item) => item.path.endsWith(`${key}.json`));
      expect(file, key).toBeDefined();
      expect("sha256" in file! ? file.sha256 : null, key).toBe(hash);
    }
  });

  it("ningún baseline congelado se presenta como paridad alcanzada", () => {
    for (const item of baseline.datasets.filter((entry) => entry.state === "baseline-frozen")) {
      expect(item.v2, item.id).toBeNull();
      expect(item.v1.files.length, item.id).toBeGreaterThan(0);
    }
  });

  it("lo que no se puede medir explica por qué", () => {
    const unmeasurable = baseline.datasets.filter((item) => item.state === "blocked" || item.state === "not-comparable");
    expect(unmeasurable.map((item) => item.id).sort()).toEqual(["ga4-daily", "gsc-daily", "tasks-local-state"]);
    for (const item of unmeasurable) {
      expect(item.blockedReason, item.id).toBeTruthy();
      expect(item.blockedReason!.length, item.id).toBeGreaterThan(40);
      expect(item.v1.files, item.id).toEqual([]);
    }
  });

  it("conserva las cifras que P2.1 afirmó y el runner comprobó", () => {
    expect(dataset("crawl-snapshots")!.v1.measures).toMatchObject({
      "antic-colonial/2026-08-06_6ac4d506": 2395,
      "butech/2026-06-04_2e037c08": 2258,
      "ecommerce/2026-05-08_f615952e": 7055,
      "krion/2026-08-07_4d07e7fd": 4424,
      "noken/2026-05-14_32c63899": 916,
      "noken/2026-05-14_e4143782": 10471,
    });
    expect(dataset("canibalizaciones-snapshot")!.v1.measures).toMatchObject({ sitios: 7, mercados: 7, paresCanibalizacion: 21 });
    expect(dataset("prompts-geo-inventory")!.v1.measures).toMatchObject({ us: 8, uk: 6, fr: 5, es: 5, __total: 24 });
  });

  it("mide los quince ficheros de SEMrush que existen, no la muestra de cuatro que P2.1 describió", () => {
    const semrush = dataset("semrush-cache")!;
    expect(semrush.v1.files).toHaveLength(15);
    expect(semrush.v1.measures.__total).toBe(328);
    // El fallo que encontró el runner: Porcelanosa nunca tuvo caché de UK (D-026).
    expect(semrush.v1.files.some((file) => file.path.includes("semrush-porcelanosa-uk"))).toBe(false);
    expect(semrush.v1.measures["porcelanosa-uk"]).toBeUndefined();
    expect(semrush.v1.measures["porcelanosa-es"]).toBe(48);
  });

  it("todo fichero medido lleva hash y tamaño", () => {
    for (const item of baseline.datasets) {
      for (const file of item.v1.files) {
        expect("missing" in file, `${item.id} · ${file.path}`).toBe(false);
      }
    }
  });
});

describe("el contrato rechaza un baseline incoherente", () => {
  const valid = {
    id: "prueba",
    dataset: "Dataset de prueba",
    phase: "P3",
    state: "baseline-frozen" as const,
    blockedReason: null,
    v1: { files: [{ path: "a.json", sha256: "a".repeat(64), bytes: 10 }], measures: { filas: 3 } },
    v2: null,
  };

  it("acepta el registro base", () => {
    expect(reconciliationDatasetSchema.safeParse(valid).success).toBe(true);
  });

  it("no admite un reconciliado sin lado V2", () => {
    expect(reconciliationDatasetSchema.safeParse({ ...valid, state: "reconciled" }).success).toBe(false);
  });

  it("no admite un bloqueado sin motivo escrito", () => {
    expect(reconciliationDatasetSchema.safeParse({ ...valid, state: "blocked", v1: { files: [], measures: {} } }).success).toBe(false);
  });

  it("no admite un baseline congelado sin ficheros medidos", () => {
    expect(reconciliationDatasetSchema.safeParse({ ...valid, v1: { files: [], measures: {} } }).success).toBe(false);
  });

  it("no admite un hash que no sea sha256", () => {
    expect(reconciliationDatasetSchema.safeParse({ ...valid, v1: { ...valid.v1, files: [{ path: "a.json", sha256: "corto", bytes: 10 }] } }).success).toBe(false);
  });
});

describe("summarizeReconciliation", () => {
  it("cuenta el estado real de la migración de datos", () => {
    const summary = summarizeReconciliation(baseline);
    expect(summary.total).toBe(8);
    expect(summary.byState).toMatchObject({ reconciled: 1, "baseline-frozen": 4, blocked: 2, "not-comparable": 1 });
    expect(summary.filesMeasured).toBe(28);
  });
});
