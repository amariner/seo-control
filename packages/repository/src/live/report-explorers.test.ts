import { describe, expect, it } from "vitest";
import { reportExplorerCoverageSchema, reportPageSchema, reportSearchQuerySchema } from "@seo/contracts";
import type { GscRow } from "./google";
import { buildReportEditorialRow, buildReportExplorers } from "./report";

const row = (keys: string[], overrides: Partial<GscRow> = {}): GscRow => ({ keys, clicks: 2, impressions: 125, ctr: 0.016, position: 13.42, ...overrides });
const empty = { queryPagesNonBrand: [], pagesNow: [], pagesBefore: [] };

describe("exploradores del informe con muestras reales de GSC", () => {
  it("conserva cada consulta × URL, incluidas las filas que no son una oportunidad", () => {
    const report = buildReportExplorers({
      ...empty,
      queryPagesNonBrand: [
        row(["piedra natural", "https://www.xtone-surface.com/producto/"]),
        row(["piedra natural", "https://www.xtone-surface.com/producto/?acabado=mate"], { clicks: 0, impressions: 1, ctr: 0, position: 55 }),
      ],
    });
    expect(report.searchQueries).toEqual([
      { query: "piedra natural", page: "https://www.xtone-surface.com/producto/", clicks: 2, impressions: 125, ctr: 1.6, position: 13.42 },
      { query: "piedra natural", page: "https://www.xtone-surface.com/producto/?acabado=mate", clicks: 0, impressions: 1, ctr: 0, position: 55 },
    ]);
    expect(report.searchQueries.every((item) => reportSearchQuerySchema.safeParse(item).success)).toBe(true);
    expect(report.explorerCoverage.searchQueries).toEqual({ scope: "non_brand_query_page", rowLimit: 3000, rowsReturned: 2, available: true, limitReached: false });
  });

  it("compara por URL completa, conserva ceros reales y deja ausencias como null", () => {
    const report = buildReportExplorers({
      ...empty,
      pagesNow: [row(["https://www.xtone-surface.com/producto/"]), row(["https://other.example/producto/"]), row(["https://www.xtone-surface.com/nueva/"])],
      pagesBefore: [row(["https://www.xtone-surface.com/producto/"], { clicks: 0 })],
    });
    expect(report.pages.map((item) => item.previousClicks)).toEqual([0, null, null]);
    expect(report.pages[0]).toEqual({ page: "https://www.xtone-surface.com/producto/", clicks: 2, impressions: 125, ctr: 1.6, position: 13.42, previousClicks: 0 });
    expect(report.pages.every((item) => reportPageSchema.safeParse(item).success)).toBe(true);
  });

  it("no convierte un fallo o una comparación fuera de retención en cero clics", () => {
    const report = buildReportExplorers({ queryPagesNonBrand: null, pagesNow: [row(["https://www.xtone-surface.com/producto/"])], pagesBefore: null });
    expect(report.pages[0]?.previousClicks).toBeNull();
    expect(report.searchQueries).toEqual([]);
    expect(report.explorerCoverage.searchQueries.available).toBe(false);
    expect(report.explorerCoverage.previousPages.available).toBe(false);
    expect(report.explorerCoverage.pages.available).toBe(true);
    expect(buildReportExplorers(empty).explorerCoverage.previousPages.available).toBe(true);
  });

  it("declara el límite de las muestras sin prometer un total de búsquedas o URLs", () => {
    const report = buildReportExplorers({
      queryPagesNonBrand: Array.from({ length: 3000 }, (_, index) => row([`keyword ${index}`, "https://www.xtone-surface.com/"])),
      pagesNow: Array.from({ length: 5000 }, (_, index) => row([`https://www.xtone-surface.com/${index}/`])),
      pagesBefore: [],
    });
    expect(report.searchQueries).toHaveLength(3000);
    expect(report.pages).toHaveLength(5000);
    expect(report.explorerCoverage.searchQueries.limitReached).toBe(true);
    expect(report.explorerCoverage.pages.limitReached).toBe(true);
    expect(report.explorerCoverage.previousPages).toEqual({ scope: "all_pages", rowLimit: 5000, rowsReturned: 0, available: true, limitReached: false });
    expect(reportExplorerCoverageSchema.parse(JSON.parse(JSON.stringify(report.explorerCoverage)))).toEqual(report.explorerCoverage);
  });
});

describe("disponibilidad de las métricas editoriales", () => {
  const target = { id: "piece", month: "2026-09", title: "Piedra natural", type: "articulo", status: "planificado", keyword: "piedra natural" };

  it("distingue una comprobación sin coincidencias de una comprobación fallida", () => {
    const measured = buildReportEditorialRow({ target, rows: [], checked: true });
    const unavailable = buildReportEditorialRow({ target, rows: [], checked: false });
    expect(measured).toMatchObject({ measured: true, clicks: 0, impressions: 0, position: null });
    expect(unavailable).toMatchObject({ measured: false, clicks: 0, impressions: 0, position: null });
    expect(unavailable.advice).toBe("Sin dato de Search Console para esta búsqueda.");
  });

  it("preserva las cifras de una consulta editorial medida", () => {
    expect(buildReportEditorialRow({ target, rows: [row(["https://www.xtone-surface.com/piedra/"])], checked: true }))
      .toMatchObject({ measured: true, clicks: 2, impressions: 125, position: 13.4, page: "/piedra/", situation: "lejos" });
  });
});
