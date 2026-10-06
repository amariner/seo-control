import { EDITORIAL_SECTIONS } from "@seo/contracts";
import { describe, expect, it } from "vitest";
import { buildContentSection, sectionWindows } from "./content-section";
import type { GscRow } from "./google";

const section = EDITORIAL_SECTIONS.xtone!;
const row = (keys: string[], clicks: number, impressions: number, position: number): GscRow => ({ keys, clicks, impressions, ctr: impressions ? clicks / impressions : 0, position });
const ok = (rows: GscRow[]) => ({ ok: true as const, rows, limitReached: false });
const base = { brand: "xtone" as const, section, cutoff: "2026-10-02", windows: sectionWindows("2026-10-02"), generatedAt: "2026-10-05T10:00:00.000Z" };
const POST = "https://www.xtone-surface.com/blog/kitchen-colors/";
const DEAD = "https://www.xtone-surface.com/en/blog/old-news/";

describe("sección editorial en Search Console (D-095)", () => {
  it("ventanas: 12 meses y dos tramos de 90 días seguidos hasta el corte", () => {
    expect(sectionWindows("2026-10-02")).toEqual({
      year: { start: "2025-10-03", end: "2026-10-02" },
      recent: { start: "2026-07-05", end: "2026-10-02" },
      previous: { start: "2026-04-06", end: "2026-07-04" },
    });
  });

  it("agrega por post (con y sin barra o parámetros) y deja fuera portadas y listados", () => {
    const report = buildContentSection({
      ...base,
      year: ok([row([POST], 300, 9000, 8), row(["https://www.xtone-surface.com/blog/kitchen-colors?utm=x"], 5, 100, 6), row([DEAD], 0, 40, 30), row(["https://www.xtone-surface.com/blog/"], 900, 20000, 3)]),
      recent: ok([row([POST], 40, 3000, 12), row(["https://www.xtone-surface.com/blog/kitchen-colors"], 10, 1000, 8)]),
      previous: ok([row([POST], 120, 3500, 9)]),
      queries: ok([row(["colores cocina", POST], 30, 2600, 12), row(["cocina blanca", POST], 20, 400, 4)]),
    });
    expect(report.pages.map((page) => page.page)).toEqual([POST, DEAD]);
    const post = report.pages[0]!;
    expect(post).toMatchObject({ clicks: 50, impressions: 4000, position: 11, previousClicks: 120, yearClicks: 305, yearImpressions: 9100 });
    expect(post.topQuery).toEqual({ query: "colores cocina", clicks: 30, impressions: 2600, position: 12 });
    expect(post.potentialClicks).toBeGreaterThan(0);
    // Sin filas en una ventana que respondió: cero, no nulo.
    expect(report.pages[1]).toMatchObject({ clicks: 0, previousClicks: 0, yearClicks: 0, yearImpressions: 40, topQuery: null, potentialClicks: 0 });
    expect(report.sources[0]).toMatchObject({ source: "gsc", ok: true });
  });

  it("una ventana que no responde deja sus cifras en nulo y lo dice", () => {
    const report = buildContentSection({
      ...base,
      year: { ok: false, error: "403 sin permiso" },
      recent: ok([row([POST], 10, 100, 5)]),
      previous: ok([]),
      queries: ok([]),
    });
    expect(report.pages[0]).toMatchObject({ clicks: 10, yearClicks: null, yearImpressions: null });
    expect(report.coverage.year).toEqual({ available: false, rows: 0, limitReached: false });
    expect(report.sources[0]!.ok).toBe(false);
    expect(report.sources[0]!.note).toContain("12 meses");
    expect(report.sources[0]!.note).toContain("403 sin permiso");
  });
});
