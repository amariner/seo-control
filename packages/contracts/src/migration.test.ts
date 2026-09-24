import { describe, expect, it } from "vitest";
import inventoryData from "../../../docs/continuity/v1-migration-inventory.json";
import {
  summarizeMigrationInventory,
  v1MigrationInventorySchema,
  v1SurfaceSchema,
} from "./migration";

/**
 * Valida el inventario real contra el contrato. Las comprobaciones cruzadas con
 * `V1_PARITY.md` y `ROADMAP.md` viven en `scripts/migration-report.mjs --check`,
 * porque este paquete no depende de Node ni lee ficheros.
 */
const inventory = v1MigrationInventorySchema.parse(inventoryData);

describe("inventario de migración V1 (P2.1)", () => {
  it("cataloga fuentes y clasificación motivada de cada superficie", () => {
    for (const surface of inventory.surfaces) {
      expect(surface.sources.length, surface.v1Route).toBeGreaterThan(0);
      expect(surface.dispositionReason.length, surface.v1Route).toBeGreaterThan(
        19,
      );
    }
  });

  it("no permite una retirada ni un aplazamiento sin alternativa", () => {
    for (const surface of inventory.surfaces) {
      if (surface.disposition === "retire" || surface.disposition === "defer") {
        expect(surface.alternative, surface.v1Route).not.toBeNull();
      }
    }
  });

  it("rechaza una retirada sin alternativa aunque el resto del registro sea válido", () => {
    const valid = inventory.surfaces.find(
      (surface) => surface.disposition === "retire",
    );
    expect(valid).toBeDefined();
    expect(
      v1SurfaceSchema.safeParse({ ...valid, alternative: null }).success,
    ).toBe(false);
  });

  it("exige valor a las tolerancias absolutas y relativas, y lo prohíbe al resto", () => {
    for (const reconciliation of inventory.reconciliations) {
      for (const metric of reconciliation.metrics) {
        const needsValue =
          metric.tolerance.kind === "absolute" ||
          metric.tolerance.kind === "relative";
        expect(
          metric.tolerance.value !== null,
          `${reconciliation.id} · ${metric.name}`,
        ).toBe(needsValue);
      }
    }
  });

  it("da a cada dataset una muestra, una comparación y una salida ante desviación", () => {
    for (const reconciliation of inventory.reconciliations) {
      expect(reconciliation.metrics.length, reconciliation.id).toBeGreaterThan(
        0,
      );
      expect(reconciliation.sample.length, reconciliation.id).toBeGreaterThan(
        14,
      );
      expect(
        reconciliation.onMismatch.length,
        reconciliation.id,
      ).toBeGreaterThan(19);
    }
  });

  it("marca como no comparable lo que no tiene origen en servidor", () => {
    const tasks = inventory.reconciliations.find(
      (item) => item.id === "tasks-local-state",
    );
    expect(tasks?.status).toBe("not-comparable");
    expect(
      tasks?.metrics.every(
        (metric) => metric.tolerance.kind === "not-comparable",
      ),
    ).toBe(true);
  });

  it("resume el inventario y señala las retiradas pendientes de aprobar", () => {
    const summary = summarizeMigrationInventory(inventory);
    expect(summary.surfaces).toBe(inventory.surfaces.length);
    expect(
      Object.values(summary.byDisposition).reduce(
        (total, count) => total + count,
        0,
      ),
    ).toBe(summary.surfaces);
    // Las dos retiradas propuestas siguen abiertas: P2 no cierra mientras lo estén.
    expect(summary.pendingRetirements).toEqual([
      "/api/cita-tienda-flow.json",
      "/api/cita-tienda-es.json",
    ]);
  });
});
