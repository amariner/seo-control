import { describe, expect, it } from "vitest";
import {
  METRIC_CATALOG,
  REPORTING_CURRENCY,
  REPORTING_TIMEZONE,
  SOURCE_CATALOG,
  aggregateMetric,
  cutoffLagDays,
  findMetric,
  findSource,
  isPeriodSufficient,
  metricDefinitionSchema,
  sourceDefinitionSchema,
  summarizeCatalog,
  type MetricKey,
} from "./catalog";
import { getMockDashboard, getMockPortfolio } from "./mock";
import { BRAND_SLUGS, type BrandSlug } from "./taxonomy";
import { sourceKeySchema, type BrandEditorialActivity } from "./index";

const emptyEditorial: BrandEditorialActivity = { calendarEvents: 0, backlogPieces: 0, planPieces: 0, slots: 0, published: 0, scheduled: 0, inProgress: 0 };
const editorialByBrand = Object.fromEntries(BRAND_SLUGS.map((slug) => [slug, emptyEditorial])) as Record<BrandSlug, BrandEditorialActivity>;

describe("catálogo de métricas (P3.1)", () => {
  it("cada definición cumple su contrato", () => {
    for (const metric of METRIC_CATALOG) {
      expect(metricDefinitionSchema.safeParse(metric).success, metric.key).toBe(true);
    }
  });

  it("no hay claves repetidas", () => {
    const keys = METRIC_CATALOG.map((metric) => metric.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("toda métrica declara qué mide y su salvedad", () => {
    for (const metric of METRIC_CATALOG) {
      expect(metric.definition.length, metric.key).toBeGreaterThan(40);
      expect(metric.caveat, metric.key).toBeTruthy();
    }
  });

  it("una media ponderada declara por qué se pondera, y el peso existe en el catálogo", () => {
    for (const metric of METRIC_CATALOG) {
      if (metric.aggregation !== "weighted-average") {
        expect(metric.weightBy, metric.key).toBeNull();
        continue;
      }
      expect(metric.weightBy, metric.key).toBeTruthy();
      expect(findMetric(metric.weightBy!), `${metric.key} pondera por ${metric.weightBy}`).not.toBeNull();
      // Ponderar un porcentaje por otro porcentaje no significa nada.
      expect(findMetric(metric.weightBy!)!.aggregation, metric.key).toBe("sum");
    }
  });

  it("ningún porcentaje ni score se declara sumable", () => {
    for (const metric of METRIC_CATALOG) {
      if (metric.unit === "percent" || metric.unit === "score") {
        expect(metric.aggregation, `${metric.key} es ${metric.unit} y no puede sumarse`).not.toBe("sum");
      }
    }
  });

  it("el esquema rechaza una media ponderada sin peso y una suma con peso", () => {
    const base = METRIC_CATALOG.find((metric) => metric.aggregation === "sum")!;
    expect(metricDefinitionSchema.safeParse({ ...base, aggregation: "weighted-average" }).success).toBe(false);
    expect(metricDefinitionSchema.safeParse({ ...base, weightBy: "organic_sessions" }).success).toBe(false);
  });

  it("cada métrica apunta a una fuente declarada en el catálogo de fuentes", () => {
    for (const metric of METRIC_CATALOG) {
      expect(findSource(metric.source), `${metric.key} -> ${metric.source}`).not.toBeNull();
    }
  });
});

describe("aggregateMetric", () => {
  it("suma las magnitudes absolutas", () => {
    expect(aggregateMetric("organic_sessions", [{ value: 100 }, { value: 250 }])).toBe(350);
  });

  it("pondera los porcentajes por su magnitud, no por número de filas", () => {
    // Media aritmética daría 40; ponderada por sesiones, 46.
    const result = aggregateMetric("visibility", [
      { value: 50, weight: 900 },
      { value: 30, weight: 300 },
    ]);
    expect(result).toBe(45);
    expect(result).not.toBe(40);
  });

  it("devuelve null sin filas, porque la ausencia de dato no es un cero", () => {
    expect(aggregateMetric("organic_sessions", [])).toBeNull();
    expect(aggregateMetric("visibility", [])).toBeNull();
  });

  it("devuelve null cuando el peso total es cero, en vez de dividir por cero", () => {
    expect(aggregateMetric("visibility", [{ value: 50, weight: 0 }])).toBeNull();
  });

  it("una sola fila ponderada devuelve su propio valor", () => {
    expect(aggregateMetric("visibility", [{ value: 41.6, weight: 1000 }])).toBe(41.6);
  });

  it("falla al agregar una métrica no declarada, en vez de inventar una regla", () => {
    expect(() => aggregateMetric("inventada" as MetricKey, [{ value: 1 }])).toThrow(/no declarada/);
  });
});

describe("desfase y ventanas", () => {
  it("el corte de un conjunto de métricas es el desfase de la fuente más lenta", () => {
    // GSC publica con tres días de retraso y GA4 con uno: manda GSC.
    expect(cutoffLagDays(["organic_sessions", "organic_clicks"])).toBe(3);
    expect(cutoffLagDays(["organic_sessions"])).toBe(1);
    expect(cutoffLagDays(["visibility"])).toBe(7);
  });

  it("una métrica con ventana mínima mayor que el periodo no es interpretable", () => {
    // La visibilidad exige 90 días; las sesiones se leen ya a 28.
    expect(isPeriodSufficient("visibility", "28d")).toBe(false);
    expect(isPeriodSufficient("visibility", "90d")).toBe(true);
    expect(isPeriodSufficient("organic_sessions", "28d")).toBe(true);
  });
});

describe("catálogo de fuentes", () => {
  it("cada definición cumple su contrato y cubre todas las fuentes del esquema", () => {
    for (const source of SOURCE_CATALOG) {
      expect(sourceDefinitionSchema.safeParse(source).success, source.key).toBe(true);
    }
    expect(SOURCE_CATALOG.map((source) => source.key).sort()).toEqual([...sourceKeySchema.options].sort());
  });

  it("ninguna fuente está conectada todavía, y cada una dice qué fase la conecta", () => {
    for (const source of SOURCE_CATALOG) {
      expect(source.connected, source.key).toBe(false);
      expect(source.connectedBy, source.key).toMatch(/^P\d/);
    }
  });

  it("declara zona horaria y moneda únicas", () => {
    expect(REPORTING_TIMEZONE).toBe("Europe/Madrid");
    expect(REPORTING_CURRENCY).toBe("EUR");
  });
});

describe("el catálogo cubre lo que las superficies muestran", () => {
  it("toda métrica de la portada está declarada", () => {
    for (const metric of getMockDashboard().metrics) {
      expect(findMetric(metric.key), `la portada muestra ${metric.key}`).not.toBeNull();
    }
  });

  it("toda métrica de la visión transversal está declarada", () => {
    const portfolio = getMockPortfolio({ brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" }, editorialByBrand);
    for (const metric of portfolio.totals) {
      expect(findMetric(metric.key), `el conjunto muestra ${metric.key}`).not.toBeNull();
    }
  });

  it("la etiqueta y la dirección que muestra el conjunto son las del catálogo, no literales propios", () => {
    const portfolio = getMockPortfolio({ brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" }, editorialByBrand);
    for (const metric of portfolio.totals) {
      const definition = findMetric(metric.key)!;
      expect(metric.label, metric.key).toBe(definition.label);
      expect(metric.goodDirection, metric.key).toBe(definition.goodDirection);
      expect(metric.unit, metric.key).toBe(definition.unit);
    }
  });

  it("el total ponderado del conjunto declara su ponderación en la cobertura", () => {
    const portfolio = getMockPortfolio({ brands: [...BRAND_SLUGS], market: "all", period: "28d", compare: "previous" }, editorialByBrand);
    const visibility = portfolio.totals.find((metric) => metric.key === "visibility")!;
    expect(visibility.coverage.label).toContain("ponderada por sesiones orgánicas");
  });
});

describe("summarizeCatalog", () => {
  it("resume el estado real del catálogo", () => {
    const summary = summarizeCatalog();
    expect(summary).toMatchObject({ metrics: 6, sources: 7, connectedSources: 0, timezone: "Europe/Madrid", currency: "EUR" });
    expect(summary.summable).toEqual(["organic_sessions", "organic_clicks", "macro_conversions"]);
    expect(summary.weighted).toEqual(["nonbrand_share", "visibility", "technical_health"]);
  });
});
