import { describe, expect, it } from "vitest";
import { BRAND_SLUGS, aggregatePortfolio } from "@seo/contracts";
import { LIVE_BRANDS, ga4MarketFilter, gscMarketFilters, reportMarketsOf } from "./live/brands";
import { gscFloor } from "./live/figures";
import { ctrCurve, normalizePath, pageTypeOf, titleOf } from "./live/opportunities";
import { keywordFilters } from "./live/report";
import { createLiveRepository, liveCutoff } from "./live/repository";
import { RepositoryUnavailableError } from "./contract";
import { resolveRepository } from "./resolve";

const porcelanosa = LIVE_BRANDS.find((brand) => brand.slug === "porcelanosa")!;
const noken = LIVE_BRANDS.find((brand) => brand.slug === "noken")!;
const xtone = LIVE_BRANDS.find((brand) => brand.slug === "xtone")!;

describe("origen live (D-034)", () => {
  it("se niega sin credenciales en vez de caer al sintético", () => {
    expect(() => createLiveRepository({})).toThrow(RepositoryUnavailableError);
    expect(() => resolveRepository({ SEO_DATA_SOURCE: "live" })).toThrow(RepositoryUnavailableError);
  });

  it("se declara como dato real sin almacén propio", () => {
    const repository = createLiveRepository({ GOOGLE_CLIENT_ID: "id", GOOGLE_CLIENT_SECRET: "secret", GOOGLE_REFRESH_TOKEN: "token" });
    expect(repository.describe()).toMatchObject({ mode: "live", realData: true, supersededBy: "P3.2" });
  });

  it("cierra la ventana tres días antes de hoy en Europe/Madrid", () => {
    // 23:30 UTC del 22 ya es día 23 en Madrid (UTC+2 en septiembre).
    expect(liveCutoff(new Date("2026-09-22T23:30:00Z"))).toBe("2026-09-20");
    expect(gscFloor("2026-09-20")).toBe("2025-05-22");
  });

  it("define el mercado raíz por exclusión de todos los prefijos hermanos", () => {
    const es = porcelanosa.markets.find((market) => market.code === "ES")!;
    const filter = gscMarketFilters(porcelanosa, es)[0]!;
    expect(filter.operator).toBe("excludingRegex");
    const pattern = new RegExp(filter.expression);
    expect(pattern.test("https://www.porcelanosa.com/uk/tiles/")).toBe(true);
    expect(pattern.test("https://www.porcelanosa.com/it/")).toBe(true);
    expect(pattern.test("https://www.porcelanosa.com/pavimentos/")).toBe(false);
    // «/usa-…» no es el mercado US: el prefijo debe cerrar en barra, query o fin.
    expect(pattern.test("https://www.porcelanosa.com/usados/")).toBe(false);
  });

  it("filtra por prefijo con límite de segmento en GA4 y en GSC", () => {
    const uk = noken.markets.find((market) => market.code === "UK")!;
    const gsc = new RegExp(gscMarketFilters(noken, uk)[0]!.expression);
    expect(gsc.test("https://www.noken.com/en_gb/taps")).toBe(true);
    expect(gsc.test("https://www.noken.com/es/grifos")).toBe(false);
    const ga4 = ga4MarketFilter(noken, uk) as { filter: { stringFilter: { value: string } } };
    const landing = new RegExp(ga4.filter.stringFilter.value);
    expect(landing.test("/en_gb/taps?utm=x")).toBe(true);
    expect(landing.test("/en_gbx")).toBe(false);
    expect(ga4MarketFilter(noken, null)).toBeNull();
  });

  it("no pinta visibilidad ni objetivos cuando la fuente no existe", () => {
    const editorial = { calendarEvents: 0, backlogPieces: 0, planPieces: 0, slots: 0, published: 0, scheduled: 0, inProgress: 0 };
    const analytics = {
      sessions: 100, clicks: 80, conversions: 2, previousSessions: 90, previousYearSessions: 95, previousClicks: 70, previousYearClicks: 75,
      previousConversions: 1, previousYearConversions: 2, targetSessions: 0, targetClicks: 0, targetConversions: 0, visibility: 0,
      attention: "estable" as const, coverage: { ratio: 1, label: "live", quality: "completa" as const, asOf: "2026-09-20" }, markets: [],
    };
    const payload = aggregatePortfolio({
      generatedAt: "2026-09-23T08:00:00.000Z",
      mode: "live",
      filters: { brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" },
      editorialPlanningYear: 2026,
      connectedSources: { ga4: true, gsc: true, semrush: false, siteAudit: false },
      rows: BRAND_SLUGS.map((slug) => ({ slug, analytics: slug === "porcelanosa" ? analytics : null, editorial })),
    });
    expect(payload.totals.map((metric) => metric.key)).not.toContain("visibility");
    expect(payload.totals.every((metric) => metric.target === null)).toBe(true);
    expect(payload.objectives).toEqual([]);
    expect(payload.brands.find((brand) => brand.slug === "porcelanosa")!.sources.v2).toMatchObject({ ga4: true, gsc: true, semrush: false });
    expect(payload.brands.find((brand) => brand.slug === "krion")!.sources.v2).toMatchObject({ ga4: false, gsc: false });
  });
});

describe("Xtone en el origen live (D-036)", () => {
  it("separa Reino Unido y Estados Unidos dentro de /en por país", () => {
    const uk = xtone.markets.find((market) => market.code === "UK")!;
    const us = xtone.markets.find((market) => market.code === "US")!;
    expect(uk.pathPrefix).toBe(us.pathPrefix);
    expect(gscMarketFilters(xtone, uk)).toContainEqual({ dimension: "country", operator: "equals", expression: "gbr" });
    expect(gscMarketFilters(xtone, us)).toContainEqual({ dimension: "country", operator: "equals", expression: "usa" });
    const ga4 = JSON.stringify(ga4MarketFilter(xtone, uk));
    expect(ga4).toContain("United Kingdom");
    expect(ga4).toContain("andGroup");
  });

  it("todas las grafías de la marca son marca; la materia prima no", () => {
    const brand = new RegExp(xtone.brandRegex, "i");
    for (const query of ["xtone", "x tone", "x-tone", "xstone", "x stone", "porcelanosa xtone"]) expect(brand.test(query)).toBe(true);
    for (const query of ["calacatta gold", "verde alpi", "piedra natural"]) expect(brand.test(query)).toBe(false);
  });

  it("las búsquedas de la embajadora no se listan como oportunidad", () => {
    const excluded = new RegExp(xtone.opportunityExcludeRegex!, "i");
    expect(excluded.test("tamara falcó")).toBe(true);
    expect(excluded.test("calacatta viola")).toBe(false);
  });
});

describe("oportunidades desde Search Console (D-036)", () => {
  it("GSC y GA4 comparan la misma ruta aunque difiera la barra final", () => {
    expect(normalizePath("/en/products/")).toBe(normalizePath("/en/products"));
    expect(normalizePath("/Productos/Porcelanico/?utm=x")).toBe("/productos/porcelanico");
    expect(normalizePath("/")).toBe("/");
  });

  it("la curva de CTR es la del sitio y solo cae a la de respaldo sin volumen", () => {
    const curve = ctrCurve([{ clicks: 300, impressions: 1000, position: 1.2 }, { clicks: 1, impressions: 10, position: 7 }]);
    expect(curve(1)).toBeCloseTo(30);
    expect(curve(7)).toBe(2.8);
  });

  it("clasifica la página por su sección, saltando el prefijo de idioma", () => {
    expect(pageTypeOf("/en/products/porcelain/calacatta-gold", xtone.allPrefixes)).toBe("producto_coleccion");
    expect(pageTypeOf("/productos/", xtone.allPrefixes)).toBe("categoria");
    expect(pageTypeOf("/fr/", xtone.allPrefixes)).toBe("home");
    expect(pageTypeOf("/blog/tendencias-2026", xtone.allPrefixes)).toBe("editorial");
    expect(titleOf("/en/products/porcelain/calacatta-gold/")).toBe("Calacatta gold");
  });
});

describe("plan editorial frente a Google (D-037)", () => {
  it("busca todas las palabras, en cualquier orden, con o sin tilde y en singular o plural", () => {
    const filters = keywordFilters("fachada ventilada porcelánico");
    expect(filters).toHaveLength(3);
    const matches = (query: string) => filters.every((filter) => new RegExp(filter.expression.replace("(?i)", ""), "i").test(query));
    expect(matches("fachada ventilada porcelanico")).toBe(true);
    expect(matches("porcelánico en fachada ventilada")).toBe(true);
    expect(matches("fachadas ventiladas porcelánicas")).toBe(true);
    expect(matches("fachada de ladrillo")).toBe(false);
  });

  it("ignora las palabras vacías", () => {
    expect(keywordFilters("encimera para cocina exterior").map((filter) => filter.expression)).toHaveLength(3);
  });
});

describe("mercados del informe (D-039)", () => {
  it("ofrece los principales primero y después los que la V1 medía", () => {
    const markets = reportMarketsOf(xtone);
    expect(markets.filter((item) => item.tier1).map((item) => item.code)).toEqual(["ES", "UK", "US", "FR", "DE"]);
    expect(markets.filter((item) => !item.tier1).map((item) => item.code)).toEqual(["PT", "IT", "PL", "ZH"]);
    expect(new Set(markets.map((item) => item.code)).size).toBe(markets.length);
  });

  it("todo prefijo de un mercado adicional se excluye del mercado raíz", () => {
    for (const brand of LIVE_BRANDS) {
      for (const market of brand.extraMarkets ?? []) expect(brand.allPrefixes).toContain(market.pathPrefix);
    }
  });

  it("un mercado adicional filtra por su sección", () => {
    const pt = reportMarketsOf(xtone).find((item) => item.code === "PT")!;
    const filter = new RegExp(gscMarketFilters(xtone, pt.scope)[0]!.expression);
    expect(filter.test("https://www.xtone-surface.com/pt/produtos/")).toBe(true);
    expect(filter.test("https://www.xtone-surface.com/productos/")).toBe(false);
  });
});
