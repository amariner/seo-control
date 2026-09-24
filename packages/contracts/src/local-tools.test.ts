import { describe, expect, it } from "vitest";
import inventoryData from "../../../docs/continuity/v1-migration-inventory.json";
import { LOCAL_TOOLS, localToolSummary, localToolsByState, localToolSchema } from "./local-tools";

/**
 * El catálogo de herramientas locales solo sirve si no puede mentir. Estas
 * pruebas comprueban las dos formas de mentir que importan: prometer una
 * herramienta que no se puede ejecutar, e inventar un origen de V1 que el
 * inventario auditado en P2.1 no cataloga.
 *
 * El inventario se importa como módulo, igual que en `migration.test.ts`: este
 * paquete no depende de Node ni lee ficheros.
 */
const INVENTORY = inventoryData as { surfaces: Array<{ v1Route: string; targetPhase: string | null }> };

describe("catálogo de herramientas locales", () => {
  it("cada entrada cumple el contrato", () => {
    for (const tool of LOCAL_TOOLS) expect(() => localToolSchema.parse(tool)).not.toThrow();
    expect(new Set(LOCAL_TOOLS.map((tool) => tool.key)).size).toBe(LOCAL_TOOLS.length);
  });

  it("una herramienta disponible declara con qué se ejecuta y no arrastra fase pendiente", () => {
    const available = LOCAL_TOOLS.filter((tool) => tool.state === "disponible");
    expect(available.length).toBeGreaterThan(0);
    for (const tool of available) {
      expect(tool.entryPoint, `${tool.key} se declara disponible sin punto de entrada`).toBeTruthy();
      expect(tool.blocker).toBeNull();
      expect(tool.phase).toBeNull();
    }
  });

  it("una herramienta bloqueada dice qué la bloquea y en qué fase se resuelve", () => {
    for (const tool of LOCAL_TOOLS.filter((item) => item.state === "bloqueada")) {
      expect(tool.blocker, `${tool.key} está bloqueada sin motivo`).toBeTruthy();
      expect(tool.phase).toMatch(/^P\d+$/);
      expect(tool.entryPoint, `${tool.key} está bloqueada y ofrece punto de entrada`).toBeNull();
    }
  });

  it("una herramienta pendiente no ofrece punto de entrada y sí una fase", () => {
    for (const tool of LOCAL_TOOLS.filter((item) => item.state === "pendiente")) {
      expect(tool.entryPoint).toBeNull();
      expect(tool.phase).toMatch(/^P\d+$/);
    }
  });

  it("ninguna herramienta inventa un origen de V1: todos están en el inventario de P2.1", () => {
    const routes = new Set(INVENTORY.surfaces.map((surface) => surface.v1Route));
    for (const tool of LOCAL_TOOLS) {
      if (tool.v1Origin === null) continue;
      expect(routes.has(tool.v1Origin), `${tool.key} apunta a ${tool.v1Origin}, que no está catalogado`).toBe(true);
    }
  });

  it("la fase de destino coincide con la que fijó el inventario", () => {
    const byRoute = new Map(INVENTORY.surfaces.map((surface) => [surface.v1Route, surface.targetPhase]));
    for (const tool of LOCAL_TOOLS) {
      if (tool.v1Origin === null || tool.phase === null) continue;
      const expected = byRoute.get(tool.v1Origin);
      // El inventario fija la fase de la superficie; la herramienta no puede
      // adelantarla por su cuenta.
      expect(tool.phase, `${tool.key} dice ${tool.phase} y el inventario ${expected}`).toBe(expected);
    }
  });

  it("el resumen reparte todas las herramientas sin solapar estados", () => {
    const summary = localToolSummary();
    expect(summary.disponibles + summary.bloqueadas + summary.pendientes + summary.retiradasPropuestas).toBe(summary.total);
    expect(summary.total).toBe(LOCAL_TOOLS.length);
    expect(summary.deV1).toBeGreaterThan(summary.total - summary.deV1);
  });

  it("agrupa por estado empezando por lo usable hoy", () => {
    const groups = localToolsByState();
    expect(groups.map((group) => group.state)).toEqual(["disponible", "bloqueada", "pendiente", "retirada-propuesta"]);
    expect(groups.flatMap((group) => group.tools)).toHaveLength(LOCAL_TOOLS.length);
  });

  it("la retirada propuesta sigue sin aprobar y lo dice", () => {
    const retired = LOCAL_TOOLS.filter((tool) => tool.state === "retirada-propuesta");
    expect(retired).toHaveLength(1);
    expect(retired[0]!.blocker).toContain("sin aprobar");
    expect(retired[0]!.note).toContain("D-014");
  });
});
