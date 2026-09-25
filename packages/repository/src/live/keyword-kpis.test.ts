import { describe, expect, it } from "vitest";
import type { GscRow } from "./google";
import { buildKeywordRanking, buildSearchSegment } from "./report";

const row = (clicks: number, impressions: number, position: number, key = "x"): GscRow => ({ keys: [key], clicks, impressions, ctr: impressions ? clicks / impressions : 0, position });

describe("KPI de la pestaña Keywords", () => {
  it("suma los totales sin marca y pondera la posición por impresiones", () => {
    const search = buildSearchSegment({ current: [row(30, 1000, 4), row(10, 1000, 8)], previous: [row(20, 1000, 10)], previousYear: null });
    expect(search.clicks).toEqual({ value: 40, previous: 20, previousYear: null });
    expect(search.ctr).toEqual({ value: 2, previous: 2, previousYear: null });
    expect(search.position).toEqual({ value: 6, previous: 10, previousYear: null });
  });

  it("sin impresiones no inventa CTR ni posición", () => {
    const search = buildSearchSegment({ current: [], previous: [], previousYear: [] });
    expect(search.clicks.value).toBe(0);
    expect(search.ctr.value).toBeNull();
    expect(search.position.value).toBeNull();
  });

  it("reparte las keywords por segmento y las compara con el periodo anterior", () => {
    const ranking = buildKeywordRanking(
      [row(1, 10, 2, "marca azulejos"), row(1, 10, 5, "azulejos"), row(1, 10, 25, "suelos")],
      [row(1, 10, 2, "marca azulejos"), row(1, 10, 2.5, "azulejos")],
      "marca",
    );
    expect(ranking.segments.all).toEqual({ total: 3, top3: 1, top20: 1, rest: 1, previousTotal: 2, previousTop3: 2 });
    expect(ranking.segments.brand).toEqual({ total: 1, top3: 1, top20: 0, rest: 0, previousTotal: 1, previousTop3: 1 });
    expect(ranking.segments.nonBrand).toEqual({ total: 2, top3: 0, top20: 1, rest: 1, previousTotal: 1, previousTop3: 1 });
    expect(buildKeywordRanking([row(1, 10, 2)], null, "marca").segments.all).toMatchObject({ previousTotal: null, previousTop3: null });
  });
});
