import { describe, expect, it } from "vitest";
import type { BrandReport } from "@seo/contracts";
import { buildProjectReport } from "./project-report";

const kpi = (key: BrandReport["kpis"][number]["key"], value: number, previous: number, source: "ga4" | "gsc" = "gsc") =>
  ({ key, label: key, help: "", unit: "number", value, previous, previousYear: null, source }) as unknown as BrandReport["kpis"][number];

const base = {
  window: { previousLabel: "periodo anterior", previousYearLabel: "año pasado", label: "Trimestre pasado", start: "2026-07-01", end: "2026-09-30", previousStart: "2026-04-01" },
  kpis: [kpi("search_sessions", 80, 100, "ga4"), kpi("clicks", 110, 100), kpi("impressions", 1000, 1000), kpi("search_leads", 5, 4, "ga4")],
  sources: [{ source: "gsc", ok: true }, { source: "ga4", ok: true }],
  clickSeries: [],
  months: [
    { month: "2026-06", label: "jun 26", searchSessions: 50, searchSessionsPreviousYear: 40, clicks: 10, clicksPreviousYear: null },
    { month: "2026-07", label: "jul 26", searchSessions: 60, searchSessionsPreviousYear: 70, clicks: 12, clicksPreviousYear: null },
  ],
  keywordsUp: [{ query: "encimera", before: 10, now: 30, change: 200, position: 5, previousPosition: 8 }],
  keywordsDown: [],
  contentUp: [],
  contentDown: [],
  editorial: [],
  keywordRanking: null,
  searchTotals: null,
  searchQueries: [],
  pages: [],
  explorerCoverage: {
    searchQueries: { scope: "non_brand_query_page", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
    pages: { scope: "all_pages", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
    previousPages: { scope: "all_pages", rowLimit: 1, rowsReturned: 0, available: false, limitReached: false },
  },
  markets: [],
  migration: null,
  market: "all",
  verdict: { tone: "warn", headline: "Las visitas desde buscadores caen un 20 %", detail: "80 visitas desde buscadores." },
  nextSteps: [],
  dataQuality: [],
} as unknown as BrandReport;

const slideOf = (slides: ReturnType<typeof buildProjectReport>, id: string) => slides.find((slide) => slide.id === id)!;

describe("buildProjectReport", () => {
  it("redacta la aclaración del resumen desde las cifras, con concordancia", () => {
    const summary = slideOf(buildProjectReport({ report: base, pieces: [], audit: null, today: "2026-09-28" }), "resumen");
    expect(summary.title).toBe("Tráfico orgánico");
    expect(summary?.note).toContain("Las visitas desde buscadores bajan un 20 % frente al periodo anterior");
    expect(summary?.note).toContain("no tienen comparación disponible frente al año pasado");
    expect(summary?.note).toContain("Los clics en Google suben un 10 %");
    expect(summary?.metrics.map((item) => item.label)).toEqual(["Visitas SEO", "Clics en Google", "Impresiones", "Conversiones SEO"]);
    expect(summary?.metrics[0]?.change).toMatchObject({ text: "−20 %", tone: "bad" });
    expect(summary?.reading).toBeTruthy();
    expect(summary?.bars?.metric).toBe("Visitas SEO");
    expect(summary?.bars?.months.map((m) => [m.label, m.inPeriod, m.previousYear])).toEqual([
      ["jun 26", false, 40],
      ["jul 26", true, 70],
    ]);
  });

  it("pone las keywords en tendencia y en bajada, con mensaje si una lista está vacía", () => {
    const keywords = slideOf(buildProjectReport({ report: base, pieces: [], audit: null, today: "2026-09-28" }), "keywords");
    expect(keywords.lists.map((list) => list.title)).toEqual(["En tendencia", "En bajada"]);
    expect(keywords.lists[0]?.head).toEqual(["Keyword sin marca", "Clics", "Posición", "Variación"]);
    expect(keywords.lists[0]?.rows).toEqual([["encimera", "10 → 30", "8 → 5", "+200 %"]]);
    expect(keywords.lists[1]?.rows).toEqual([]);
    expect(keywords.lists[1]?.empty).toMatch(/Sin keywords/);
  });

  it("sin GA4 no muestra visitas ni conversiones y lo dice", () => {
    const report = { ...base, sources: [{ source: "gsc", ok: true }, { source: "ga4", ok: false }] } as unknown as BrandReport;
    const summary = slideOf(buildProjectReport({ report, pieces: [], audit: null, today: "2026-09-28" }), "resumen");
    expect(summary?.metrics.map((item) => item.label)).toEqual(["Clics en Google", "Impresiones"]);
    expect(summary?.note).toContain("GA4 no ha respondido");
  });

  it("omite los apartados sin datos y cuenta el plan editorial por estado", () => {
    const pieces = [
      { id: "a", statusKey: "publicado", publicationDate: "2026-09-01", status: "Publicado", title: "A", keyword: null },
      { id: "o", statusKey: "publicado", publicationDate: "2026-03-01", status: "Publicado", title: "Antigua", keyword: null },
      { id: "b", statusKey: "redactando", publicationDate: "2026-10-05", status: "Redactando", title: "B", keyword: "k" },
      { id: "c", statusKey: "backlog", publicationDate: null, status: "Backlog", title: "C", keyword: null },
    ] as never;
    const slides = buildProjectReport({ report: base, pieces, audit: null, today: "2026-09-28" });
    expect(slides.map((slide) => slide.id)).toEqual(["ejecutivo", "resumen", "keywords", "editorial"]);
    const editorial = slides.at(-1)!;
    expect(editorial.note).toBe("1 pieza publicada en el periodo y 1 con fecha de publicación próxima. En total, 1 en marcha y 1 por empezar.");
    expect(editorial.lists[0]?.rows).toEqual([["01/09/2026", "A", "—", "—"]]);
    expect(editorial.lists[1]?.rows).toEqual([["05/10/2026", "B", "Redactando"]]);
  });

  it("usa la medición real de 28 días de lo publicado (D-079)", () => {
    const measurement = { windowDays: 28, status: "medido", result: 65, baseline: 23, metricKey: "gsc_clicks", measuredAt: "2026-09-29", interpretation: null, scope: "url" };
    const pieces = [
      { id: "a", statusKey: "publicado", publicationDate: "2026-09-01", status: "Publicado", title: "A", keyword: "k", measurements: [measurement] },
    ] as never;
    const editorial = buildProjectReport({ report: base, pieces, audit: null, today: "2026-09-28" }).find((slide) => slide.id === "editorial")!;
    expect(editorial.lists[0]?.rows).toEqual([["01/09/2026", "A", "k", "65 en 28 d (antes 23)"]]);
    expect(editorial.reading).toContain("La pieza medida gana clics en sus primeros 28 días");
  });

  it("abre con un resumen ejecutivo: veredicto, idea clave por apartado, prioridades y avisos de medición", () => {
    const report = {
      ...base,
      nextSteps: [{ title: "Atacar «encimera»", why: "Más recorrido.", area: "contenido" }],
      dataQuality: [
        { tone: "warn", text: "El tráfico directo multiplica por 15 al de buscadores." },
        { tone: "info", text: "Search Console solo guarda 16 meses." },
      ],
    } as unknown as BrandReport;
    const slides = buildProjectReport({ report, pieces: [], audit: null, today: "2026-09-28" });
    const summary = slides[0]!;
    expect(summary.id).toBe("ejecutivo");
    expect(summary.verdict).toEqual(base.verdict);
    expect(summary.points?.map((point) => point.label)).toEqual(["Tráfico orgánico"]);
    expect(summary.points?.[0]).toMatchObject({ text: "Visitas SEO −20 % y clics en Google +10 % frente al periodo anterior.", tone: "good" });
    expect(summary.warnings).toEqual(["El tráfico directo multiplica por 15 al de buscadores."]);
    expect(summary.lists[0]?.rows).toEqual([["Media", "Atacar «encimera»"]]);
    // Con avisos de medición, la lectura no saca conclusiones de las conversiones.
    expect(slideOf(slides, "resumen").reading).toContain("validar visitas y conversiones");
  });

  it("cierra con un plan de acción ordenado por prioridad que recoge todos los apartados", () => {
    const report = {
      ...base,
      nextSteps: [
        { title: "Atacar «encimera»", why: "Más recorrido.", area: "contenido" },
        { title: "Revisar la medición", why: "Señales anómalas.", area: "medicion" },
      ],
      markets: [
        { code: "ES", name: "España", sessions: 900, previous: 1000, leads: 5, clicks: 400 },
        { code: "PT", name: "Portugal", sessions: 10, previous: 300, leads: 0, clicks: 5 },
        { code: "IT", name: "Italia", sessions: 20, previous: 200, leads: 0, clicks: 9 },
      ],
    } as unknown as BrandReport;
    const audit = {
      completedAt: "2026-09-28T10:00:00Z",
      totals: { crawled: 200, indexable: 196, clientErrors: 1, serverErrors: 0, pagesWithSevere: 1 },
      issues: [
        { id: "title_duplicate", label: "Titles duplicados", severity: "media", affected: 2, sample: ["/b/"] },
        { id: "http_4xx", label: "Error 4xx", severity: "critica", affected: 1, sample: ["/a/"] },
        { id: "noindex", label: "Marcada como noindex", severity: "alta", affected: 3, sample: ["/c/"] },
      ],
    } as never;
    const slides = buildProjectReport({ report, pieces: [], audit, today: "2026-09-28" });
    const plan = slides.at(-1)!;
    expect(plan.id).toBe("plan");
    expect(plan.lists[0]?.rows.map((row) => [row[0], row[3]])).toEqual([
      ["Urgente", "Técnico"],
      ["Alta", "Medición"],
      ["Alta", "Mercados"],
      ["Media", "Contenido"],
    ]);
    // Las incidencias graves del crawl van en una sola fila, con el detalle en su apartado.
    expect(plan.lists[0]?.rows[0]?.slice(1, 3)).toEqual([
      "Resolver las 2 incidencias urgentes o altas del crawl",
      "Error 4xx (1 URL) y Marcada como noindex (3 URLs) en el crawl del 28 de septiembre de 2026; tareas y ejemplos en «Estado del sitio».",
    ]);
    expect(plan.lists[0]?.rows[2]?.[1]).toBe("Revisar Portugal e Italia: carpeta de idioma, hreflang y redirecciones");
    const markets = slideOf(slides, "mercados");
    expect(markets.reading).toContain("Portugal e Italia caen más de un 50 % a la vez");
    expect(markets.key).toMatchObject({ tone: "bad" });
    // Con un mercado filtrado, el reparto por mercados no entra en el resumen ni en el plan.
    const spain = buildProjectReport({ report: { ...report, market: "ES" } as BrandReport, pieces: [], audit, today: "2026-09-28" });
    expect(slideOf(spain, "mercados").key).toBeUndefined();
    expect(slideOf(spain, "plan").lists[0]?.rows.map((row) => row[3])).not.toContain("Mercados");
  });

  it("la migración solo explica la caída si ocurrió dentro del periodo o su comparación", () => {
    const falling = { ...base, kpis: [kpi("clicks", 70, 100), kpi("impressions", 600, 1000)] };
    const migration = {
      date: "2026-10-15", label: "Nueva estructura", beforeStart: "2026-08-15", beforeEnd: "2026-10-14", afterStart: "2026-10-15", afterEnd: "2026-12-14",
      siteClicksBefore: 1000, siteClicksAfter: 700, lostUrls: 3, lostClicks: 250, checked: 2,
      urls: [
        { oldUrl: "/viejo/", clicksBefore: 200, clicksAfter: 0, httpStatus: 404, redirectsTo: null, hops: 0, finalStatus: 404, targetClicks: null, recovery: 0, verdict: "sin-redireccion" },
        { oldUrl: "/otro/", clicksBefore: 100, clicksAfter: 0, httpStatus: 301, redirectsTo: "/nuevo/", hops: 1, finalStatus: 200, targetClicks: 90, recovery: 0.9, verdict: "recupera" },
      ],
    };
    const after = buildProjectReport({ report: { ...falling, migration } as unknown as BrandReport, pieces: [], audit: null, today: "2026-12-20" });
    expect(slideOf(after, "resumen").reading).not.toContain("migración");
    expect(after[0]?.points?.map((point) => point.label)).not.toContain("Migración");
    const during = buildProjectReport({ report: { ...falling, migration: { ...migration, date: "2026-08-01" } } as unknown as BrandReport, pieces: [], audit: null, today: "2026-12-20" });
    expect(slideOf(during, "resumen").reading).toContain("en línea con la migración");
    expect(during[0]?.points?.map((point) => point.label)).toContain("Migración");
    const slide = slideOf(during, "migracion");
    expect(slide.reading).toMatch(/^1 de las 2 URLs revisadas no lleva en un salto/);
    expect(slide.metrics.at(-1)).toEqual({ label: "Revisadas que recuperan", value: "1 de 2" });
    expect(slide.lists[0]?.rows).toEqual([
      ["/viejo/", "200", "—", "0 %", "Sin redirección"],
      ["/otro/", "100", "/nuevo/", "90 %", "Recupera"],
    ]);
    expect(slide.lists[0]?.tones).toEqual(["bad", "good"]);
  });
});
