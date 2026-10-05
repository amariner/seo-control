import { describe, expect, it } from "vitest";
import type { BrandReport, SiteAuditSummary } from "@seo/contracts";
import { actionMetric, meetsTarget, projectActionReview, reportPlanActions } from "./project-actions";

const kpi = (key: BrandReport["kpis"][number]["key"], value: number, previous: number, source: "ga4" | "gsc" = "gsc") =>
  ({ key, label: key, help: "", unit: "number", value, previous, previousYear: null, source }) as unknown as BrandReport["kpis"][number];
const market = (name: string, sessions: number, previous: number) => ({ code: name.slice(0, 2).toUpperCase(), name, tier1: true, definition: "", sessions, previous, previousYear: 0, leads: 0, clicks: null, clicksPrevious: null });
const segment = (value: number, previous: number) => ({ clicks: { value, previous, previousYear: null }, impressions: { value: 0, previous: 0, previousYear: null }, ctr: { value: 0, previous: 0, previousYear: null }, position: { value: 0, previous: 0, previousYear: null } });

const report = {
  window: { previousLabel: "periodo anterior", label: "Trimestre", start: "2026-07-01", end: "2026-09-30" },
  kpis: [kpi("clicks", 700, 1000)],
  sources: [{ source: "gsc", ok: true, note: "" }, { source: "ga4", ok: false, note: "Cuota agotada." }],
  searchTotals: { all: segment(700, 1000), brand: segment(300, 300), nonBrand: segment(400, 700) },
  keywordsDown: [
    { query: "encimera", before: 100, now: 40, change: -60, position: 8, previousPosition: 4 },
    { query: "porcelánico", before: 50, now: 30, change: -40, position: 9, previousPosition: 6 },
  ],
  opportunities: [],
  contentDown: [],
  contentUp: [],
  pages: [],
  explorerCoverage: {
    searchQueries: { scope: "non_brand_query_page", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
    pages: { scope: "all_pages", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
    previousPages: { scope: "all_pages", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
  },
  markets: [market("España", 500, 600), market("Portugal", 30, 100)],
  migration: null,
  market: "all",
  nextSteps: [{ title: "Revisar la medición de Analytics antes de leer los totales", why: "2 señales anómalas.", area: "medicion" }],
  dataQuality: [],
} as unknown as BrandReport;

const audit = {
  completedAt: "2026-07-01T10:00:00.000Z",
  totals: { crawled: 200, indexable: 190 },
  issues: [
    { id: "http_4xx", label: "Error 4xx", severity: "critica", affected: 2, sample: ["/roto/"] },
    { id: "description_missing", label: "Sin meta description", severity: "media", affected: 7, sample: [] },
  ],
} as unknown as SiteAuditSummary;

describe("acciones del proyecto (D-088)", () => {
  const input = { report, pieces: [], audit, today: "2026-09-30" };

  it("el plan del informe conserva sus reglas y marca de dónde sale cada acción", () => {
    const plan = reportPlanActions(input);
    expect(plan.map((action) => [action.tab, action.priority, action.inReport])).toEqual([
      ["resumen", "alta", true],
      ["estado", "urgente", true],
    ]);
    expect(plan[1]!.title).toBe("Redirigir con 301 o recuperar las URL que dan error 4xx");
  });

  it("repasa todos los apartados con su hallazgo y las acciones nuevas", () => {
    const review = projectActionReview({ ...input, sitemapGap: { pages: 40, clicks: 300, share: 30, folders: ["pt", "it"] } });
    expect(review.map((section) => section.tab)).toEqual(["resumen", "busquedas", "paginas", "mercados", "editorial", "estado"]);
    const byTab = Object.fromEntries(review.map((section) => [section.tab, section]));
    // La fuente caída va antes que el próximo paso de medición.
    expect(byTab.resumen!.actions.map((action) => action.priority)).toEqual(["urgente", "alta"]);
    expect(byTab.resumen!.actions[0]!.title).toBe("Restablecer la lectura de Google Analytics");
    expect(byTab.resumen!.finding).toBe("700 clics en Google (−30 % frente al periodo anterior).");
    expect(byTab.busquedas!.actions[0]!.title).toContain("«encimera» y «porcelánico»");
    expect(byTab.paginas!.actions[0]).toMatchObject({ priority: "alta", inReport: false });
    expect(byTab.paginas!.actions[0]!.why).toContain("/pt/ y /it/");
    // Sin GA4, Mercados no tiene datos que repasar.
    expect(byTab.mercados!.finding).toBeNull();
    expect(byTab.estado!.actions.map((action) => action.title)).toEqual([
      "Redirigir con 301 o recuperar las URL que dan error 4xx",
      "Repetir el crawl",
      "Redactar meta descriptions que vendan el clic",
    ]);
  });

  it("vigila los mercados que caen entre un 30 y un 50 % y deja los desplomes al plan", () => {
    const ok = { ...report, sources: [{ source: "gsc", ok: true, note: "" }, { source: "ga4", ok: true, note: "" }] } as unknown as BrandReport;
    const review = projectActionReview({ ...input, report: { ...ok, markets: [market("España", 500, 600), market("Portugal", 30, 100), market("Italia", 60, 100)] } as BrandReport });
    const mercados = review.find((section) => section.tab === "mercados")!;
    expect(mercados.actions.map((action) => [action.title, action.inReport])).toEqual([
      ["Revisar Portugal: carpeta de idioma, hreflang y redirecciones", true],
      ["Vigilar Italia", false],
    ]);
  });
});

describe("clave y cifra de cada acción (D-090)", () => {
  // Coherente con el próximo paso «Revisar la medición…» del fixture: dos señales anómalas.
  const ok = { ...report, sources: [{ source: "gsc", ok: true, note: "" }, { source: "ga4", ok: true, note: "" }], dataQuality: [{ tone: "warn", text: "a" }, { tone: "warn", text: "b" }] } as unknown as BrandReport;
  const input = { report: { ...ok, markets: [market("España", 500, 600), market("Portugal", 30, 100), market("Italia", 60, 100)] } as BrandReport, pieces: [], audit, today: "2026-09-30", sitemapGap: { pages: 40, clicks: 300, share: 30, folders: ["pt"] } };
  const actions = projectActionReview(input).flatMap((section) => section.actions);

  it("cada acción tiene una clave única con la forma <apartado>:<regla>", () => {
    const keys = actions.map((action) => action.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) expect(key).toMatch(/^[a-z]+(:[a-z0-9_-]+)+$/);
    expect(keys).toEqual(expect.arrayContaining(["resumen:medicion-ga4", "busquedas:sin-marca", "paginas:fuera-sitemaps", "mercados:caidas", "mercados:vigilar", "estado:urgentes", "estado:repetir-crawl", "estado:description_missing"]));
  });

  it("una regla que salta nunca cumple su propio criterio de éxito", () => {
    for (const action of actions) {
      if (!action.metric?.target || action.metric.value === null) continue;
      expect(meetsTarget(action.metric.value, action.metric.target), action.key).toBe(false);
    }
  });

  it("la cifra se calcula aunque la regla no salte, para medir el resultado", () => {
    const fixed = { ...input, sitemapGap: { pages: 3, clicks: 10, share: 1, folders: [] } };
    expect(projectActionReview(fixed).flatMap((section) => section.actions).some((action) => action.key === "paginas:fuera-sitemaps")).toBe(false);
    const metric = actionMetric("paginas:fuera-sitemaps", fixed)!;
    expect(metric).toMatchObject({ value: 3, better: "lower", target: { op: "lt", value: 10 }, evidence: "crawl" });
    expect(meetsTarget(metric.value!, metric.target!)).toBe(true);
    // Una incidencia que ya no aparece en el crawl cuenta como cero URL.
    expect(actionMetric("estado:http_5xx", fixed)).toMatchObject({ value: 0, target: { op: "eq", value: 0 } });
    expect(actionMetric("estado:http_5xx", { ...fixed, audit: null })!.value).toBeNull();
  });

  it("el próximo paso de una oportunidad lleva su consulta en la clave", () => {
    const withStep = { ...input, report: { ...input.report, nextSteps: [{ title: "Atacar «Encimera de cocina» y «porcelánico»", why: "", area: "contenido" }] } as BrandReport };
    const step = reportPlanActions(withStep)[0]!;
    expect(step.key).toBe("busquedas:oportunidad:encimera-de-cocina");
    expect(step.metric).toMatchObject({ target: null, criterion: null, better: "higher" });
  });
});
