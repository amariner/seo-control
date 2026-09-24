import { describe, expect, it } from "vitest";
import { BRAND_SLUGS, parsePortfolioFilters, type PortfolioFilters } from "@seo/contracts";
import { brandToggleHref, getPortfolio, portfolioFiltersFromUrl, portfolioHref } from "./portfolio";
import { describeDataSource } from "./data";

/**
 * Pruebas de la visión transversal en el visor (P2.2). Verifican lo que solo se
 * puede comprobar aquí: que la analítica sintética y el dataset editorial real
 * se cruzan sin perder marcas, y que el estado de filtros viaja íntegro entre
 * pantalla, enlace y API.
 */

const allBrands: PortfolioFilters = { brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" };

describe("getPortfolio", () => {
  /**
   * `getPortfolio` es asíncrono desde P3.1: pasa por el adapter de repositorio,
   * que en P3.2 hará consultas reales. Se comparte una sola promesa en vez de
   * recalcular el payload en cada prueba.
   */
  const payload = getPortfolio(allBrands);

  it("cruza las ocho marcas aunque solo dos tengan analítica", async () => {
    const data = await payload;
    expect(data.brands).toHaveLength(8);
    expect(data.brands.map((brand) => brand.slug)).toEqual([...BRAND_SLUGS]);
    expect(data.brands.filter((brand) => brand.analytics !== null).map((brand) => brand.slug)).toEqual(["porcelanosa", "noken"]);
  });

  it("trae actividad editorial real de marcas sin analítica", async () => {
    const data = await payload;
    const withoutAnalytics = data.brands.filter((brand) => brand.analytics === null);
    expect(withoutAnalytics).toHaveLength(6);
    const pieces = withoutAnalytics.reduce((total, brand) => total + brand.editorial.backlogPieces + brand.editorial.planPieces, 0);
    expect(pieces).toBeGreaterThan(0);
  });

  it("el plan editorial cuadra con el dataset importado de V1", async () => {
    const data = await payload;
    const backlog = data.brands.reduce((total, brand) => total + brand.editorial.backlogPieces, 0);
    const plan = data.brands.reduce((total, brand) => total + brand.editorial.planPieces, 0);
    const events = data.brands.reduce((total, brand) => total + brand.editorial.calendarEvents, 0);
    expect(backlog).toBe(115);
    expect(plan).toBe(146);
    expect(events).toBe(39);
    expect(data.editorialPlanningYear).toBe(2026);
  });

  it("declara que la analítica todavía es sintética", async () => {
    expect((await payload).mode).toBe("synthetic");
  });

  it("una marca fuera de la selección no aparece en el payload", async () => {
    const only = await getPortfolio({ ...allBrands, brands: ["porcelanosa"] });
    expect(only.brands.map((brand) => brand.slug)).toEqual(["porcelanosa"]);
    expect(only.coverage.brandsPending).toEqual([]);
  });
});

describe("origen de datos (P3.1)", () => {
  it("el visor lee por el adapter y declara el origen activo", () => {
    const origin = describeDataSource();
    expect(origin.mode).toBe("synthetic");
    expect(origin.realData).toBe(false);
    expect(origin.connectedSources).toEqual([]);
    expect(origin.supersededBy).toBe("P3.2");
    // El aviso que ve el usuario sale de aquí, no del JSX.
    expect(origin.disclosure).toContain("sintético");
  });

  it("el payload y el origen coinciden en que nada es real todavía", async () => {
    const data = await getPortfolio(allBrands);
    expect(data.mode).toBe("synthetic");
    expect(describeDataSource().realData).toBe(false);
  });
});

describe("estado de filtros compartible", () => {
  it("portfolioHref conserva el resto del estado al cambiar un filtro", () => {
    const filters: PortfolioFilters = { brands: ["noken"], market: "FR", period: "90d", compare: "previousYear" };
    expect(portfolioHref(filters, { period: "28d" })).toBe("/portfolio?brands=noken&market=FR&compare=previousYear");
  });

  it("la vista sin filtros no arrastra query string", () => {
    expect(portfolioHref(allBrands)).toBe("/portfolio");
  });

  it("brandToggleHref añade y quita marcas sobre el enlace actual", () => {
    const filters: PortfolioFilters = { ...allBrands, brands: ["porcelanosa"] };
    expect(brandToggleHref(filters, "noken")).toBe("/portfolio?brands=porcelanosa%2Cnoken");
    expect(brandToggleHref({ ...allBrands, brands: ["porcelanosa", "noken"] }, "porcelanosa")).toBe("/portfolio?brands=noken");
  });

  it("la API lee exactamente el mismo estado que la pantalla", () => {
    const href = portfolioHref({ brands: ["krion", "xtone"], market: "DE", period: "12m", compare: "previousYear" });
    const fromScreen = parsePortfolioFilters(Object.fromEntries(new URL(`https://ejemplo.local${href}`).searchParams));
    const fromApi = portfolioFiltersFromUrl(new Request(`https://ejemplo.local/api/v1${href}`));
    expect(fromApi).toEqual(fromScreen);
    expect(fromApi).toEqual({ brands: ["krion", "xtone"], market: "DE", period: "12m", compare: "previousYear" });
  });
});
