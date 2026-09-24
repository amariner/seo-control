import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { LEGACY_ROUTES, findLegacyRoute } from "./legacy-routes";

/**
 * Compatibilidad de navegación con V1 (P2.3).
 *
 * La redirección vive en `next.config.ts` y su explicación en
 * `legacy-routes.ts`. Si alguien añade una y olvida la otra, el enlace antiguo
 * acaba en un destino que no cubre la capacidad y nadie lo dice. Estas pruebas
 * leen el config como texto —es la única forma de aseverarlo sin arrancar
 * Next— y exigen que las dos listas coincidan.
 */

const CONFIG = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../next.config.ts"), "utf8");

type Redirect = { source: string; destination: string; permanent: boolean };

const declared: Redirect[] = [...CONFIG.matchAll(/\{ source: "([^"]+)", destination: "([^"]+)", permanent: (true|false) \}/g)].map(
  (match) => ({ source: match[1]!, destination: match[2]!, permanent: match[3] === "true" }),
);

describe("redirecciones de compatibilidad con V1", () => {
  it("encuentra las redirecciones declaradas en next.config.ts", () => {
    expect(declared.length).toBeGreaterThanOrEqual(5);
  });

  it("cada ruta de V1 catalogada tiene su redirección declarada, y es permanente", () => {
    for (const route of LEGACY_ROUTES) {
      const redirect = declared.find((item) => item.source === route.v1Route);
      expect(redirect, `falta la redirección de ${route.v1Route} en next.config.ts`).toBeDefined();
      expect(redirect?.permanent, `${route.v1Route} debería ser 308: es una ruta retirada de V1`).toBe(true);
      expect(redirect?.destination.startsWith(route.destination)).toBe(true);
    }
  });

  it("un destino parcial arrastra el ?from= que lo hace declararse en pantalla", () => {
    for (const route of LEGACY_ROUTES.filter((item) => item.kind === "partial")) {
      const redirect = declared.find((item) => item.source === route.v1Route);
      expect(redirect?.destination).toBe(`${route.destination}?from=${route.key}`);
    }
  });

  it("todo destino parcial explica qué falta y en qué fase llega", () => {
    for (const route of LEGACY_ROUTES.filter((item) => item.kind === "partial")) {
      expect(route.missing, `${route.v1Route} es parcial y no dice qué falta`).toBeTruthy();
      expect(route.phase).toMatch(/^P\d+$/);
    }
  });

  it("un destino equivalente no arrastra aviso ni fase pendiente", () => {
    for (const route of LEGACY_ROUTES.filter((item) => item.kind === "equivalent")) {
      expect(route.missing).toBeNull();
      expect(route.phase).toBeNull();
      expect(findLegacyRoute(route.key)).toBeNull();
    }
  });

  it("solo avisa de las rutas catalogadas como parciales", () => {
    expect(findLegacyRoute("pilar-contenidos")?.v1Route).toBe("/tracking/pilar-contenidos");
    expect(findLegacyRoute("insights-llm")?.v1Route).toBe("/insights/llm");
    expect(findLegacyRoute("inventada")).toBeNull();
    expect(findLegacyRoute(undefined)).toBeNull();
    expect(findLegacyRoute(["insights-llm", "otra"])?.key).toBe("insights-llm");
  });
});
