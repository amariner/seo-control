import { describe, expect, it } from "vitest";
import { resolveReportWindow } from "@seo/contracts";
import { resolveReportTab } from "./report-tab";
import {
  reportNavigationTarget,
  reportPendingMessage,
  reportZonePending,
  type PendingMarket,
  type ReportPendingScope,
  type ReportTarget,
} from "./report-navigation-model";

const portugal: PendingMarket = {
  code: "PT",
  name: "Portugal",
  definition: "Portugal",
};
const germany: PendingMarket = {
  code: "DE",
  name: "Alemania",
  definition: "Alemania",
};
const period = resolveReportWindow({ range: "28d" }, "2026-09-20");
const noChanges = { market: false, period: false, tab: false };

describe("report filter navigation", () => {
  it.each([
    ["contenido", "paginas"],
    ["demanda", "busquedas"],
    ["mercados", "mercados"],
  ])("allows returning from legacy chapter %s to Resumen", (chapter, tab) => {
    const applied = `chapter=${chapter}&market=PT`;
    const summary = reportNavigationTarget(applied, null, {
      params: { tab: "resumen" },
      tabLabel: "Resumen",
    });
    expect(summary.changes).toEqual({
      market: false,
      period: false,
      tab: true,
    });
    expect(summary.tabLabel).toBe("Resumen");

    const sameTab = reportNavigationTarget(applied, null, { params: { tab } });
    expect(sameTab.changes).toEqual(noChanges);
    const cancelled = reportNavigationTarget(applied, summary, {
      params: { tab },
    });
    expect(cancelled.changes).toEqual(noChanges);
    expect(cancelled.tabLabel).toBeUndefined();
  });

  it("keeps the explicit tab ahead of the legacy chapter during rapid filter changes", () => {
    const applied = "chapter=contenido&tab=resumen&market=PT";
    const market = reportNavigationTarget(applied, null, {
      params: { market: "DE" },
      market: germany,
    });
    const summary = reportNavigationTarget(applied, market, {
      params: { tab: "resumen" },
      tabLabel: "Resumen",
    });
    expect(summary.changes).toEqual({
      market: true,
      period: false,
      tab: false,
    });
    expect(summary.market).toBe(germany);
  });

  it("merges rapid market, period and tab choices without losing filters or unrelated parameters", () => {
    const applied = "market=ES&range=90d&modo=presentacion&tag=one&tag=two";
    const market = reportNavigationTarget(applied, null, {
      params: { market: "PT" },
      market: portugal,
    });
    const dates = reportNavigationTarget(applied, market, {
      params: { range: "28d" },
      period,
    });
    const tab = reportNavigationTarget(applied, dates, {
      params: { tab: "busquedas" },
      tabLabel: "Keywords",
    });
    const latest = reportNavigationTarget(applied, tab, {
      params: { market: "DE" },
      market: germany,
    });
    const params = new URLSearchParams(latest.query);

    expect(params.get("market")).toBe("DE");
    expect(params.get("range")).toBe("28d");
    expect(params.get("tab")).toBe("busquedas");
    expect(params.get("modo")).toBe("presentacion");
    expect(params.getAll("tag")).toEqual(["one", "two"]);
    expect(latest).toMatchObject({
      market: germany,
      period,
      tabLabel: "Keywords",
      changes: { market: true, period: true, tab: true },
    });
  });

  it("removes custom date and comparison parameters when returning to a preset", () => {
    const next = reportNavigationTarget(
      "market=PT&range=custom&from=2026-08-01&to=2026-08-31&cmp=custom&cfrom=2026-07-01",
      null,
      {
        params: { range: "28d", from: null, to: null, cmp: null, cfrom: null },
        period,
      },
    );

    expect(Object.fromEntries(new URLSearchParams(next.query))).toEqual({
      market: "PT",
      range: "28d",
    });
    expect(next.changes).toEqual({ market: false, period: true, tab: false });
    expect(next.period).toBe(period);
  });

  it.each(["", "market=all&range=90d&cmp=anterior&yoy=fecha&tab=resumen"])(
    "treats omitted and explicit default filters as equivalent (%s)",
    (applied) => {
      const explicit = reportNavigationTarget(applied, null, {
        params: {
          market: "all",
          range: "90d",
          cmp: "anterior",
          yoy: "fecha",
          tab: "resumen",
        },
      });
      const omitted = reportNavigationTarget(applied, explicit, {
        params: { market: null, range: null, cmp: null, yoy: null, tab: null },
      });

      expect(explicit.changes).toEqual(noChanges);
      expect(omitted.changes).toEqual(noChanges);
    },
  );

  it("clears pending metadata when a choice returns to the applied value, retaining other pending filters", () => {
    const applied = "market=PT";
    const market = reportNavigationTarget(applied, null, {
      params: { market: "DE" },
      market: germany,
    });
    const dates = reportNavigationTarget(applied, market, {
      params: { range: "28d" },
      period,
    });
    const restored = reportNavigationTarget(applied, dates, {
      params: { market: "PT" },
      market: portugal,
    });

    expect(restored.changes).toEqual({
      market: false,
      period: true,
      tab: false,
    });
    expect(restored.market).toBeUndefined();
    expect(restored.period).toBe(period);

    const cancelled = reportNavigationTarget(applied, restored, {
      params: { range: null, tab: null },
    });
    expect(cancelled.changes).toEqual(noChanges);
    expect(cancelled.period).toBeUndefined();
    expect(cancelled.tabLabel).toBeUndefined();
  });

  it("clears the pending tab label when returning to the current tab", () => {
    const next = reportNavigationTarget("", null, {
      params: { tab: "paginas" },
      tabLabel: "Páginas",
    });
    const restored = reportNavigationTarget("", next, {
      params: { tab: null },
    });

    expect(restored.changes).toEqual(noChanges);
    expect(restored.tabLabel).toBeUndefined();
  });

  it.each([
    ["range", "28d"],
    ["from", "2026-08-01"],
    ["to", "2026-08-31"],
    ["cmp", "custom"],
    ["cfrom", "2026-07-01"],
    ["yoy", "semana"],
  ])("marks date data pending when %s changes", (key, value) => {
    expect(
      reportNavigationTarget("", null, { params: { [key]: value } }).changes,
    ).toEqual({ market: false, period: true, tab: false });
  });
});

describe("report tab resolution", () => {
  it.each([
    [null, "contenido", "paginas"],
    ["unknown", "demanda", "busquedas"],
    ["resumen", "mercados", "resumen"],
    ["unknown", "unknown", "resumen"],
  ])("resolves tab %s and chapter %s as %s", (tab, chapter, expected) => {
    expect(resolveReportTab(tab, chapter)).toBe(expected);
  });

  it("keeps the server fallback when a requested tab is unavailable for a brand", () => {
    const available = [
      "resumen",
      "busquedas",
      "paginas",
      "mercados",
      "editorial",
    ] as const;
    expect(resolveReportTab("migracion", undefined, available)).toBe("resumen");
    expect(resolveReportTab("migracion", "contenido", available)).toBe(
      "paginas",
    );
    expect(resolveReportTab("migracion", undefined)).toBe("migracion");
  });
});

describe("report loading zones", () => {
  const scopes: ReportPendingScope[] = [
    "selection",
    "market",
    "period",
    "fixed",
  ];

  it.each([
    { changes: noChanges, expected: [false, false, false, false] },
    {
      changes: { ...noChanges, market: true },
      expected: [true, true, false, false],
    },
    {
      changes: { ...noChanges, period: true },
      expected: [true, false, true, false],
    },
    {
      changes: { ...noChanges, market: true, period: true },
      expected: [true, true, true, false],
    },
    {
      changes: { ...noChanges, tab: true },
      expected: [false, false, false, false],
    },
    {
      changes: { ...noChanges, refresh: true },
      expected: [true, true, true, false],
    },
  ])("only masks zones affected by $changes", ({ changes, expected }) => {
    expect(
      scopes.map((scope) => reportZonePending(scope, { query: "", changes })),
    ).toEqual(expected);
  });

  it("does not mask any zone without a pending target", () => {
    expect(scopes.map((scope) => reportZonePending(scope, null))).toEqual([
      false,
      false,
      false,
      false,
    ]);
  });
});

describe("report loading messages", () => {
  it("identifies the selected market when market and period change together", () => {
    expect(
      reportPendingMessage({
        query: "",
        market: portugal,
        period,
        changes: { market: true, period: true, tab: false },
      }),
    ).toBe("Actualizando datos de Portugal…");
  });

  it.each<[Partial<ReportTarget>, string]>([
    [
      { changes: { ...noChanges, period: true } },
      "Actualizando el periodo seleccionado…",
    ],
    [
      { changes: { ...noChanges, tab: true }, tabLabel: "Páginas" },
      "Abriendo páginas…",
    ],
    [{ changes: { ...noChanges, refresh: true } }, "Actualizando los datos…"],
    [{ changes: { ...noChanges, market: true } }, "Actualizando los datos…"],
  ])("provides a concise status for %j", (target, message) => {
    expect(
      reportPendingMessage({ query: "", changes: noChanges, ...target }),
    ).toBe(message);
  });
});
