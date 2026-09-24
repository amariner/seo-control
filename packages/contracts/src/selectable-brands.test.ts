import { describe, expect, it } from "vitest";
import { getMockDashboard } from "./mock";
import { projectSlugSchema } from "./schemas";
import { BRANDS, BRAND_SLUGS, EXPANSION_PROJECTS, PILOT_PROJECTS, isPilotProject } from "./taxonomy";

/**
 * Las ocho marcas son seleccionables, y ninguna de las seis sin piloto recibe
 * cifras inventadas (D-033).
 *
 * El riesgo concreto que vigilan estas pruebas: el reparto del piloto era
 * `project === "porcelanosa" ? 0.64 : 0.36`, y con la selección abierta ese
 * `else` le habría dado a Krion el 36% de la serie de Noken. Un número
 * plausible, con su delta y su tendencia, indistinguible de uno medido.
 */

describe("marcas seleccionables", () => {
  it("el contrato admite las ocho marcas del grupo", () => {
    expect([...projectSlugSchema.options].sort()).toEqual([...BRAND_SLUGS].sort());
  });

  it("sigue rechazando lo que no es una marca", () => {
    expect(projectSlugSchema.safeParse("conjunto").success).toBe(false);
    expect(projectSlugSchema.safeParse("product-finder").success).toBe(false);
  });

  it("ser seleccionable no es tener serie: solo tres marcas son piloto", () => {
    expect(PILOT_PROJECTS.map((brand) => brand.slug)).toEqual(["porcelanosa", "noken", "xtone"]);
    expect(EXPANSION_PROJECTS).toHaveLength(5);
    expect(isPilotProject("krion")).toBe(false);
    expect(isPilotProject("noken")).toBe(true);
    expect(isPilotProject("no-existe")).toBe(false);
  });
});

describe("una marca sin piloto no recibe analítica inventada", () => {
  it.each(EXPANSION_PROJECTS.map((brand) => brand.slug))("%s no devuelve ninguna métrica", (slug) => {
    const data = getMockDashboard({ project: slug, market: "all", period: "28d" });
    expect(data.metrics).toEqual([]);
    expect(data.markets).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.series).toEqual({});
    expect(data.technicalIssues).toEqual([]);
    expect(data.opportunities).toEqual([]);
  });

  it.each(EXPANSION_PROJECTS.map((brand) => brand.slug))("%s declara sus fuentes sin configurar, no a cero de cobertura medida", (slug) => {
    const data = getMockDashboard({ project: slug, market: "all", period: "28d" });
    expect(data.sources).toHaveLength(7);
    for (const source of data.sources) {
      expect(source.status).toBe("no_configurado");
      expect(source.coverage).toBe(0);
      expect(source.lastValidSnapshot).toBeNull();
      expect(source.cutoff).toBeNull();
    }
  });

  it("la nota de las fuentes nombra la marca y su ola, no un texto genérico", () => {
    const krion = getMockDashboard({ project: "krion", market: "all", period: "28d" });
    expect(krion.sources[0]!.note).toBe("Krion se incorpora en la ola 2 de la expansión.");
    const gamadecor = getMockDashboard({ project: "gamadecor", market: "all", period: "28d" });
    expect(gamadecor.sources[0]!.note).toContain("ola 3");
  });

  it("GEO no cuenta ejecuciones que nadie ha hecho", () => {
    const geo = getMockDashboard({ project: "krion", market: "all", period: "28d" }).geo;
    expect(geo.totalPrompts).toBe(0);
    expect(geo.citedPrompts).toBe(0);
    expect(geo.aiSessions).toBe(0);
  });

  it("sigue declarando la ventana del periodo elegido", () => {
    // La pantalla la muestra en la cabecera: vaciar la analítica no puede
    // vaciar el contexto que explica qué periodo se estaba mirando.
    const data = getMockDashboard({ project: "butech", market: "all", period: "90d" });
    expect(data.window.days).toBe(90);
    expect(data.filters.project).toBe("butech");
  });
});

describe("el piloto conserva su serie", () => {
  it("Xtone es piloto con dato real, pero el sintético no le inventa serie (D-036)", () => {
    const data = getMockDashboard({ project: "xtone", market: "all", period: "28d" });
    expect(isPilotProject("xtone")).toBe(true);
    expect(data.metrics).toEqual([]);
    expect(data.series).toEqual({});
    expect(data.sources[0]!.note).toContain("origen live");
  });

  it.each(["porcelanosa", "noken"] as const)("%s sigue devolviendo métricas y fuentes conectadas", (slug) => {
    const data = getMockDashboard({ project: slug, market: "all", period: "28d" });
    expect(data.metrics.length).toBeGreaterThan(0);
    expect(data.projects).toHaveLength(1);
    expect(data.sources.some((source) => source.status === "correcto")).toBe(true);
  });

  it("el conjunto reparte entre las dos marcas del piloto, no entre las ocho", () => {
    const all = getMockDashboard({ project: "all", market: "all", period: "28d" });
    const sessions = (slug: "all" | "porcelanosa" | "noken") =>
      getMockDashboard({ project: slug, market: "all", period: "28d" }).metrics.find((metric) => metric.key === "organic_sessions")!.value;
    // Si una marca sin piloto arañara parte del reparto, las dos del piloto ya
    // no sumarían el total del conjunto.
    expect(sessions("porcelanosa") + sessions("noken")).toBe(sessions("all"));
    expect(all.projects).toHaveLength(2);
  });

  it("ninguna marca sin piloto aparece en la matriz de proyectos del conjunto", () => {
    const slugs = getMockDashboard({ project: "all", market: "all", period: "28d" }).projects.map((project) => project.slug);
    for (const brand of BRANDS.filter((item) => !item.pilot)) expect(slugs).not.toContain(brand.slug);
  });
});
