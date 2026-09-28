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
} as unknown as BrandReport;

describe("buildProjectReport", () => {
  it("redacta la aclaración del resumen desde las cifras, con concordancia", () => {
    const [summary] = buildProjectReport({ report: base, pieces: [], audit: null, today: "2026-09-28" });
    expect(summary?.id).toBe("resumen");
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
    const keywords = buildProjectReport({ report: base, pieces: [], audit: null, today: "2026-09-28" })[1]!;
    expect(keywords.lists.map((list) => list.title)).toEqual(["En tendencia", "En bajada"]);
    expect(keywords.lists[0]?.rows).toEqual([["encimera", "10 → 30", "+200 %"]]);
    expect(keywords.lists[1]?.rows).toEqual([]);
    expect(keywords.lists[1]?.empty).toMatch(/Sin keywords/);
  });

  it("sin GA4 no muestra visitas ni conversiones y lo dice", () => {
    const report = { ...base, sources: [{ source: "gsc", ok: true }, { source: "ga4", ok: false }] } as unknown as BrandReport;
    const [summary] = buildProjectReport({ report, pieces: [], audit: null, today: "2026-09-28" });
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
    expect(slides.map((slide) => slide.id)).toEqual(["resumen", "keywords", "editorial"]);
    const editorial = slides.at(-1)!;
    expect(editorial.note).toBe("1 pieza publicada en el periodo y 1 con fecha de publicación próxima. En total, 1 en marcha y 1 por empezar.");
    expect(editorial.lists[0]?.rows).toEqual([["01/09/2026", "A", "—", "—"]]);
    expect(editorial.lists[1]?.rows).toEqual([["05/10/2026", "B", "Redactando"]]);
  });
});
