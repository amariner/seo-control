import { describe, expect, it } from "vitest";
import type { BrandReport } from "@seo/contracts";
import { buildProjectReport } from "./project-report";

const kpi = (key: BrandReport["kpis"][number]["key"], value: number, previous: number, source: "ga4" | "gsc" = "gsc") =>
  ({ key, label: key, help: "", unit: "number", value, previous, previousYear: null, source }) as unknown as BrandReport["kpis"][number];

const base = {
  window: { previousLabel: "periodo anterior", previousYearLabel: "año pasado", label: "Mes pasado" },
  kpis: [kpi("search_sessions", 80, 100, "ga4"), kpi("clicks", 110, 100), kpi("impressions", 1000, 1000), kpi("search_leads", 5, 4, "ga4")],
  sources: [{ source: "gsc", ok: true }, { source: "ga4", ok: true }],
  clickSeries: [],
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
  });

  it("sin GA4 no muestra visitas ni conversiones y lo dice", () => {
    const report = { ...base, sources: [{ source: "gsc", ok: true }, { source: "ga4", ok: false }] } as unknown as BrandReport;
    const [summary] = buildProjectReport({ report, pieces: [], audit: null, today: "2026-09-28" });
    expect(summary?.metrics.map((item) => item.label)).toEqual(["Clics en Google", "Impresiones"]);
    expect(summary?.note).toContain("GA4 no ha respondido");
  });

  it("omite los apartados sin datos y cuenta el plan editorial por estado", () => {
    const pieces = [
      { statusKey: "publicado", publicationDate: "2026-09-01", status: "Publicado", title: "A", keyword: null },
      { statusKey: "redactando", publicationDate: "2026-10-05", status: "Redactando", title: "B", keyword: "k" },
      { statusKey: "backlog", publicationDate: null, status: "Backlog", title: "C", keyword: null },
    ] as never;
    const slides = buildProjectReport({ report: base, pieces, audit: null, today: "2026-09-28" });
    expect(slides.map((slide) => slide.id)).toEqual(["resumen", "keywords", "editorial"]);
    const editorial = slides.at(-1)!;
    expect(editorial.note).toBe("3 piezas en el plan: 1 publicadas, 1 en marcha y 1 por empezar. Próxima publicación: 05/10/2026.");
    expect(editorial.lists[0]?.rows).toEqual([["05/10/2026", "B", "k", "Redactando"]]);
  });
});
