import { describe, expect, it } from "vitest";
import type { GscRow } from "./google";
import { buildContentMovers, buildKeywordMovers } from "./report";

const row = (key: string, clicks: number, position = 5, impressions = 100): GscRow => ({ keys: [key], clicks, impressions, ctr: 0.1, position });
const brand = "porcelanosa";

describe("keywords en tendencia y en decadencia", () => {
  it("ordena por clics ganados y perdidos, sin marca ni ruido bajo el umbral", () => {
    const movers = buildKeywordMovers(
      [row("azulejos baño", 120, 3.2), row("porcelanosa baños", 900), row("suelo exterior", 40, 9.8), row("encimera cocina", 5), row("parquet", 12, 14)],
      [row("azulejos baño", 60, 6.4), row("porcelanosa baños", 100), row("suelo exterior", 90, 4.1), row("encimera cocina", 9), row("gres", 30, 7)],
      brand,
    );
    expect(movers.keywordsUp).toEqual([
      { query: "azulejos baño", before: 60, now: 120, change: 100, position: 3.2, previousPosition: 6.4 },
      { query: "parquet", before: 0, now: 12, change: null, position: 14, previousPosition: null },
    ]);
    expect(movers.keywordsDown).toEqual([
      { query: "suelo exterior", before: 90, now: 40, change: -55.6, position: 9.8, previousPosition: 4.1 },
      { query: "gres", before: 30, now: 0, change: -100, position: null, previousPosition: 7 },
    ]);
  });

  it("sin muestra anterior no declara subidas ni bajadas", () => {
    expect(buildKeywordMovers([row("azulejos", 50)], null, brand)).toEqual({ keywordsUp: [], keywordsDown: [] });
    expect(buildKeywordMovers(null, [row("azulejos", 50)], brand)).toEqual({ keywordsUp: [], keywordsDown: [] });
  });
});

describe("URLs en tendencia y en decadencia", () => {
  it("agrupa por ruta y pondera la posición media por impresiones", () => {
    const movers = buildContentMovers(
      [row("https://www.porcelanosa.com/es/banos/", 30, 2, 300), row("https://porcelanosa.com/es/banos?utm=x", 10, 6, 100)],
      [row("https://www.porcelanosa.com/es/banos/", 12, 8, 200)],
    );
    expect(movers.contentUp).toEqual([{ page: "/es/banos", before: 12, now: 40, change: 233.3, position: 3, previousPosition: 8 }]);
    expect(movers.contentDown).toEqual([]);
  });
});
