import { describe, expect, it } from "vitest";
import { getMockPortfolio } from "./mock";
import {
  aggregatePortfolio,
  parsePortfolioFilters,
  portfolioFilterQuery,
  togglePortfolioBrand,
  type BrandEditorialActivity,
  type PortfolioFilters,
} from "./portfolio";
import { BRANDS, BRAND_SLUGS, expansionWaves, type BrandSlug } from "./taxonomy";
import { EDITORIAL_BRANDS } from "./editorial";

const emptyEditorial: BrandEditorialActivity = { calendarEvents: 0, backlogPieces: 0, planPieces: 0, slots: 0, published: 0, scheduled: 0, inProgress: 0 };
const editorialByBrand = Object.fromEntries(BRAND_SLUGS.map((slug) => [slug, emptyEditorial])) as Record<BrandSlug, BrandEditorialActivity>;

const allBrands: PortfolioFilters = { brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" };

describe("taxonomía canónica de marcas", () => {
  it("EDITORIAL_BRANDS se deriva de BRANDS y no puede divergir", () => {
    expect(BRANDS).toHaveLength(8);
    expect(EDITORIAL_BRANDS.map((brand) => brand.slug)).toEqual(BRANDS.map((brand) => brand.slug));
    expect(EDITORIAL_BRANDS.map((brand) => brand.name)).toEqual(BRANDS.map((brand) => brand.name));
    expect(BRANDS.filter((brand) => brand.pilot).map((brand) => brand.slug)).toEqual(["porcelanosa", "noken", "xtone"]);
  });

  it("la secuencia de expansión se deriva de `wave` y cubre las cinco marcas no piloto", () => {
    const waves = expansionWaves();
    expect(waves.map((item) => item.wave)).toEqual([1, 2, 3]);
    expect(waves.flatMap((item) => item.brands.map((brand) => brand.slug))).toEqual([
      "ecommerce",
      "butech",
      "antic-colonial",
      "krion",
      "gamadecor",
    ]);
    // Ninguna marca del piloto entra en la secuencia de expansión.
    expect(waves.flatMap((item) => item.brands).some((brand) => brand.pilot)).toBe(false);
    // Los nombres salen de la taxonomía: escribirlos a mano ya había producido
    // «L'Antic Colonial» donde el canónico es «Antic Colonial».
    expect(waves[1]!.brands.map((brand) => brand.name)).toEqual(["Antic Colonial", "Krion"]);
  });
});

describe("parsePortfolioFilters", () => {
  it("una selección vacía o desconocida equivale a las ocho marcas", () => {
    expect(parsePortfolioFilters({}).brands).toEqual([...BRAND_SLUGS]);
    expect(parsePortfolioFilters({ brands: "" }).brands).toEqual([...BRAND_SLUGS]);
    expect(parsePortfolioFilters({ brands: "marca-inexistente" }).brands).toEqual([...BRAND_SLUGS]);
  });

  it("descarta marcas desconocidas sin romper el resto del enlace compartido", () => {
    expect(parsePortfolioFilters({ brands: "noken,marca-inexistente,krion" }).brands).toEqual(["noken", "krion"]);
  });

  it("normaliza el orden: dos enlaces con las mismas marcas dan el mismo resultado", () => {
    expect(parsePortfolioFilters({ brands: "krion,noken" })).toEqual(parsePortfolioFilters({ brands: "noken,krion" }));
    expect(parsePortfolioFilters({ brands: "xtone,porcelanosa" }).brands).toEqual(["porcelanosa", "xtone"]);
  });

  it("aplica valores por defecto seguros a mercado, periodo y comparativa", () => {
    const filters = parsePortfolioFilters({ market: "XX", period: "999d", compare: "loquesea" });
    expect(filters.market).toBe("all");
    expect(filters.period).toBe("28d");
    expect(filters.compare).toBe("previous");
    expect(parsePortfolioFilters({ market: "FR", period: "90d", compare: "previousYear" })).toMatchObject({ market: "FR", period: "90d", compare: "previousYear" });
  });

  it("tolera parámetros repetidos quedándose con el primero", () => {
    expect(parsePortfolioFilters({ brands: ["noken", "krion"], market: ["FR", "DE"] })).toMatchObject({ brands: ["noken"], market: "FR" });
  });
});

describe("portfolioFilterQuery", () => {
  it("omite los valores por defecto para que la URL compartida sea limpia", () => {
    expect(portfolioFilterQuery(allBrands)).toBe("");
  });

  it("hace ida y vuelta con parsePortfolioFilters", () => {
    const filters: PortfolioFilters = { brands: ["porcelanosa", "krion"], market: "FR", period: "90d", compare: "previousYear" };
    const query = portfolioFilterQuery(filters);
    expect(query).toBe("brands=porcelanosa%2Ckrion&market=FR&period=90d&compare=previousYear");
    expect(parsePortfolioFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });
});

describe("togglePortfolioBrand", () => {
  it("añade y quita conservando el orden canónico", () => {
    const one: PortfolioFilters = { ...allBrands, brands: ["noken"] };
    expect(togglePortfolioBrand(one, "porcelanosa").brands).toEqual(["porcelanosa", "noken"]);
    expect(togglePortfolioBrand({ ...allBrands, brands: ["porcelanosa", "noken"] }, "noken").brands).toEqual(["porcelanosa"]);
  });

  it("nunca deja la selección vacía: quitar la última marca vuelve a las ocho", () => {
    expect(togglePortfolioBrand({ ...allBrands, brands: ["noken"] }, "noken").brands).toEqual([...BRAND_SLUGS]);
  });
});

describe("aggregatePortfolio", () => {
  const analytics = (sessions: number, visibility: number, market: "ES" | "FR") => ({
    sessions,
    clicks: sessions * 2,
    conversions: Math.round(sessions * 0.01),
    previousSessions: sessions - 100,
    previousYearSessions: sessions - 200,
    previousClicks: (sessions - 100) * 2,
    previousYearClicks: (sessions - 200) * 2,
    previousConversions: Math.round((sessions - 100) * 0.01),
    previousYearConversions: Math.round((sessions - 200) * 0.01),
    targetSessions: sessions + 50,
    targetClicks: sessions * 2 + 50,
    targetConversions: Math.round(sessions * 0.01) + 5,
    visibility,
    attention: "estable" as const,
    coverage: { ratio: 1, label: "test", quality: "completa" as const, asOf: "2026-08-30" },
    markets: [{ code: market, name: market, sessions, clicks: sessions * 2, conversions: Math.round(sessions * 0.01), previousSessions: sessions - 100, previousYearSessions: sessions - 200, visibility, contributingBrands: 1 }],
  });

  const payload = aggregatePortfolio({
    generatedAt: "2026-09-02T08:15:00.000Z",
    mode: "synthetic",
    filters: { brands: ["porcelanosa", "noken", "krion"], market: "all", period: "28d", compare: "previous" },
    editorialPlanningYear: 2026,
    rows: [
      { slug: "porcelanosa", analytics: analytics(1000, 50, "ES"), editorial: { ...emptyEditorial, planPieces: 12, published: 4 } },
      { slug: "noken", analytics: analytics(1000, 30, "FR"), editorial: { ...emptyEditorial, planPieces: 6, published: 1 } },
      { slug: "krion", analytics: null, editorial: { ...emptyEditorial, planPieces: 3 } },
    ],
  });

  it("los totales son exactamente la suma de las marcas con serie", () => {
    const sessions = payload.totals.find((metric) => metric.key === "organic_sessions")!;
    expect(sessions.value).toBe(2000);
    expect(sessions.previous).toBe(1800);
    expect(sessions.previousYear).toBe(1600);
    expect(sessions.target).toBe(2100);
  });

  it("clics y conversiones se suman de las marcas, no se estiman desde las sesiones", () => {
    const clicks = payload.totals.find((metric) => metric.key === "organic_clicks")!;
    expect(clicks.value).toBe(4000);
    expect(clicks.previous).toBe(3600);
    expect(clicks.previousYear).toBe(3200);
    const conversions = payload.totals.find((metric) => metric.key === "macro_conversions")!;
    expect(conversions.value).toBe(20);
    expect(conversions.previous).toBe(18);
    expect(conversions.previousYear).toBe(16);
  });

  it("no inventa cifras para una marca sin fuente en V2", () => {
    const krion = payload.brands.find((brand) => brand.slug === "krion")!;
    expect(krion.analytics).toBeNull();
    expect(krion.shareOfSessions).toBeNull();
    expect(krion.analyticsState).toBe("pendiente-migracion");
    expect(krion.analyticsPendingReason).toContain("Porcelanosa, Noken y Xtone");
    expect(krion.editorial.planPieces).toBe(3);
  });

  it("declara la cobertura real del agregado", () => {
    expect(payload.coverage).toMatchObject({ brandsSelected: 3, brandsWithAnalytics: 2, brandsPending: ["krion"] });
    expect(payload.coverage.ratio).toBeCloseTo(2 / 3);
    expect(payload.totals[0]!.coverage.quality).toBe("parcial");
    expect(payload.totals[0]!.coverage.label).toBe("2 de 3 marcas con serie analítica");
  });

  it("la suma de mercados coincide con el total de sesiones", () => {
    expect(payload.markets.reduce((total, row) => total + row.sessions, 0)).toBe(2000);
    expect(payload.markets.map((row) => row.code)).toEqual(["ES", "FR"]);
    expect(payload.markets.every((row) => row.contributingBrands === 1)).toBe(true);
  });

  it("las cuotas de las marcas medidas suman el 100%", () => {
    const shares = payload.brands.map((brand) => brand.shareOfSessions).filter((share): share is number => share !== null);
    expect(shares).toEqual([50, 50]);
    expect(shares.reduce((total, share) => total + share, 0)).toBe(100);
  });

  it("promedia la visibilidad ponderando por sesiones, no por número de marcas", () => {
    expect(payload.totals.find((metric) => metric.key === "visibility")!.value).toBe(40);
    expect(payload.totals.find((metric) => metric.key === "visibility")!.coverage.label).toContain("media ponderada por sesiones");
  });

  it("los objetivos se derivan de los totales con su progreso explicable", () => {
    const objective = payload.objectives.find((item) => item.key === "organic_sessions")!;
    expect(objective.target).toBe(2100);
    expect(objective.gap).toBe(100);
    expect(objective.progress).toBeCloseTo(2000 / 2100);
    expect(objective.status).toBe("en-riesgo");
  });

  it("explica el conjunto con notas derivadas y ordenadas, no con prosa libre", () => {
    expect(payload.narrative.length).toBeGreaterThan(0);
    expect(payload.narrative.length).toBeLessThanOrEqual(5);
    const magnitudes = payload.narrative.map((note) => note.magnitude);
    expect([...magnitudes].sort((a, b) => b - a)).toEqual(magnitudes);
    expect(payload.narrative.some((note) => note.kind === "cobertura")).toBe(true);
    expect(payload.narrative.find((note) => note.kind === "cobertura")?.evidence[0]?.value).toBe("Krion");
    expect(payload.narrative.every((note) => note.evidence.length > 0)).toBe(true);
  });

  it("es determinista: el mismo input produce el mismo payload", () => {
    const again = aggregatePortfolio({
      generatedAt: "2026-09-02T08:15:00.000Z",
      mode: "synthetic",
      filters: { brands: ["porcelanosa", "noken", "krion"], market: "all", period: "28d", compare: "previous" },
      editorialPlanningYear: 2026,
      rows: [
        { slug: "porcelanosa", analytics: analytics(1000, 50, "ES"), editorial: { ...emptyEditorial, planPieces: 12, published: 4 } },
        { slug: "noken", analytics: analytics(1000, 30, "FR"), editorial: { ...emptyEditorial, planPieces: 6, published: 1 } },
        { slug: "krion", analytics: null, editorial: { ...emptyEditorial, planPieces: 3 } },
      ],
    });
    expect(again).toEqual(payload);
  });

  it("sin ninguna marca medida no hay mercados ni objetivos, y la cobertura es insuficiente", () => {
    const empty = aggregatePortfolio({
      generatedAt: "2026-09-02T08:15:00.000Z",
      mode: "synthetic",
      filters: { brands: ["krion", "xtone"], market: "all", period: "28d", compare: "previous" },
      editorialPlanningYear: 2026,
      rows: [
        { slug: "krion", analytics: null, editorial: emptyEditorial },
        { slug: "xtone", analytics: null, editorial: emptyEditorial },
      ],
    });
    expect(empty.markets).toEqual([]);
    expect(empty.objectives).toEqual([]);
    expect(empty.totals.every((metric) => metric.value === 0)).toBe(true);
    expect(empty.coverage.ratio).toBe(0);
    expect(empty.totals[0]!.coverage.quality).toBe("insuficiente");
  });
});

describe("getMockPortfolio", () => {
  it("cada marca del piloto cuadra con la suma de sus mercados", () => {
    const payload = getMockPortfolio(allBrands, editorialByBrand);
    for (const brand of payload.brands) {
      if (!brand.analytics) continue;
      expect(brand.analytics.sessions).toBe(brand.analytics.markets.reduce((total, market) => total + market.sessions, 0));
      expect(brand.analytics.clicks).toBe(brand.analytics.markets.reduce((total, market) => total + market.clicks, 0));
    }
    expect(payload.markets.reduce((total, row) => total + row.sessions, 0)).toBe(payload.totals[0]!.value);
  });

  it("solo el piloto trae serie; las otras seis marcas quedan declaradas como pendientes", () => {
    const payload = getMockPortfolio(allBrands, editorialByBrand);
    expect(payload.brands.filter((brand) => brand.analytics !== null).map((brand) => brand.slug)).toEqual(["porcelanosa", "noken"]);
    expect(payload.coverage.brandsPending).toHaveLength(6);
    expect(payload.mode).toBe("synthetic");
  });

  it("filtrar por mercado estrecha el agregado sin descuadrarlo", () => {
    const all = getMockPortfolio(allBrands, editorialByBrand);
    const fr = getMockPortfolio({ ...allBrands, market: "FR" }, editorialByBrand);
    expect(fr.markets.map((row) => row.code)).toEqual(["FR"]);
    expect(fr.totals[0]!.value).toBeLessThan(all.totals[0]!.value);
    expect(fr.totals[0]!.value).toBe(fr.markets[0]!.sessions);
  });

  it("filtrar por marca reduce el total a esa marca", () => {
    const noken = getMockPortfolio({ ...allBrands, brands: ["noken"] }, editorialByBrand);
    expect(noken.brands).toHaveLength(1);
    expect(noken.coverage).toMatchObject({ brandsSelected: 1, brandsWithAnalytics: 1, brandsPending: [] });
    expect(noken.totals[0]!.value).toBe(noken.brands[0]!.analytics!.sessions);
  });

  it("cada marca del piloto se mueve a su propio ritmo", () => {
    const payload = getMockPortfolio(allBrands, editorialByBrand);
    const [porcelanosa, noken] = payload.brands.filter((brand) => brand.analytics !== null);
    const change = (brand: typeof porcelanosa) => (brand!.analytics!.sessions - brand!.analytics!.previousSessions) / brand!.analytics!.previousSessions;
    expect(change(porcelanosa)).not.toBeCloseTo(change(noken), 3);
    expect(change(noken)).toBeGreaterThan(change(porcelanosa));
  });

  it("un periodo más largo escala el agregado", () => {
    const short = getMockPortfolio(allBrands, editorialByBrand);
    const long = getMockPortfolio({ ...allBrands, period: "90d" }, editorialByBrand);
    expect(long.totals[0]!.value).toBeGreaterThan(short.totals[0]!.value * 3);
  });

  it("señala Francia como el mercado en riesgo y Reino Unido como el que avanza", () => {
    const payload = getMockPortfolio(allBrands, editorialByBrand);
    const risk = payload.narrative.find((note) => note.tone === "riesgo" && note.kind === "mercado");
    expect(risk?.headline).toContain("Francia");
    expect(payload.narrative.find((note) => note.tone === "resultado")?.headline).toContain("Reino Unido");
  });

  it("cambiar la comparativa a interanual cambia la explicación, no los totales", () => {
    const previous = getMockPortfolio(allBrands, editorialByBrand);
    const yoy = getMockPortfolio({ ...allBrands, compare: "previousYear" }, editorialByBrand);
    expect(yoy.totals[0]!.value).toBe(previous.totals[0]!.value);
    expect(yoy.narrative.some((note) => note.headline.includes("interanual"))).toBe(true);
    expect(previous.narrative.some((note) => note.headline.includes("periodo anterior"))).toBe(true);
  });
});
