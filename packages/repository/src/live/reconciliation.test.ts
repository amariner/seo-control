import { describe, expect, it } from "vitest";
import { buildSearchReconciliation, searchEngineOf } from "./report";

describe("conciliación GA4 ↔ Search Console", () => {
  it("agrupa los dominios de cada buscador", () => {
    expect(searchEngineOf("google")).toBe("Google");
    expect(searchEngineOf("images.google.es")).toBe("Google");
    expect(searchEngineOf("cn.bing.com")).toBe("Bing");
    expect(searchEngineOf("ntp.msn.com")).toBe("Bing");
    expect(searchEngineOf("es.search.yahoo.com")).toBe("Yahoo");
    expect(searchEngineOf("qwant.com")).toBe("Otros");
  });

  it("cuadra con el total orgánico aunque falte la cola larga", () => {
    const result = buildSearchReconciliation(
      [
        { source: "google", sessions: 51508 },
        { source: "bing", sessions: 5495 },
        { source: "es.search.yahoo.com", sessions: 159 },
        { source: "yahoo", sessions: 181 },
        { source: "duckduckgo", sessions: 168 },
      ],
      58563,
      42636,
      1764,
    );
    expect(result.googleSessions).toBe(51508);
    expect(result.otherEngineSessions).toBe(7055);
    expect(result.engines).toEqual([
      { label: "Bing", sessions: 5495, previous: 0 },
      { label: "Yahoo", sessions: 340, previous: 0 },
      { label: "DuckDuckGo", sessions: 168, previous: 0 },
    ]);
    expect(result).toMatchObject({ googleWebClicks: 42636, googleImageClicks: 1764 });
  });
});

describe("buscadores por periodo", () => {
  it("separa el periodo actual del anterior", () => {
    const result = buildSearchReconciliation(
      [
        { source: "bing", range: "current", sessions: 5000 },
        { source: "cn.bing.com", range: "current", sessions: 17 },
        { source: "bing", range: "previous", sessions: 6200 },
        { source: "bing", range: "previousYear", sessions: 9000 },
        { source: "google", range: "current", sessions: 40000 },
      ],
      45017,
      null,
      null,
    );
    expect(result.engines).toEqual([{ label: "Bing", sessions: 5017, previous: 6200 }]);
    expect(result.googleSessions).toBe(40000);
  });
});

describe("keywords posicionadas", () => {
  const row = (position: number, impressions = 10, query = "azulejo porcelánico") => ({ keys: [query], clicks: 0, impressions, ctr: 0, position });
  it("reparte por posición media 1–3, 4–20 y más de 20", async () => {
    const { buildKeywordRanking } = await import("./report");
    const result = buildKeywordRanking(
      [row(1, 10, "xtone"), row(3, 10, "X Tone porcelánico"), row(3.2), row(20), row(20.4), row(55, 10, "porcelanosa xstone"), row(8, 0)],
      [row(2), row(9)],
      "x[ -]?s?tone|porcelanosa",
    );
    expect(result).toMatchObject({ total: 6, top3: 2, top20: 2, rest: 2, nonBrand: 3, previousTotal: 2, limitReached: false });
  });
});

describe("visitas desde IA", () => {
  it("agrupa orígenes por asistente y separa periodos", async () => {
    const { buildAiTraffic } = await import("./report");
    const result = buildAiTraffic([
      { source: "chatgpt.com", range: "current", sessions: 334 },
      { source: "chatgpt.com", range: "current", sessions: 12 },
      { source: "chat.openai.com", range: "previous", sessions: 200 },
      { source: "gemini.google.com", range: "current", sessions: 14 },
      { source: "perplexity", range: "previousYear", sessions: 9 },
      { source: "claude.ai", range: "current", sessions: 3 },
    ]);
    expect(result.total).toBe(363);
    expect(result.previousTotal).toBe(200);
    expect(result.assistants.map((item) => [item.label, item.sessions, item.previous])).toEqual([
      ["ChatGPT", 346, 200],
      ["Gemini", 14, 0],
      ["Claude", 3, 0],
    ]);
  });
});

describe("usuarios nuevos y recurrentes", () => {
  it("recurrentes es el total menos los nuevos y no pasa de cero", async () => {
    const { buildUserMix } = await import("./report");
    expect(buildUserMix(26391, 19500, 29300, 22000)).toEqual({ newUsers: 19500, returningUsers: 6891, previousNewShare: 75.1 });
    expect(buildUserMix(100, 120, 0, 0)).toEqual({ newUsers: 100, returningUsers: 0, previousNewShare: null });
    expect(buildUserMix(0, 0, 0, 0)).toBeNull();
  });
});
