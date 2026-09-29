import { describe, expect, it } from "vitest";
import { measurementOf, pageFilter, planMeasurementWindow } from "./editorial-measurement";

describe("medición editorial (P3.5, D-079)", () => {
  it("planifica ventanas completas, en curso y pendientes sin extrapolar", () => {
    expect(planMeasurementWindow("2026-06-25", "2026-09-26", 28)).toMatchObject({ status: "medido", start: "2026-06-25", end: "2026-07-22", baselineStart: "2026-05-28", baselineEnd: "2026-06-24", coveredDays: 28 });
    const running = planMeasurementWindow("2026-06-25", "2026-09-26", 180);
    expect(running).toMatchObject({ status: "en_curso", end: "2026-09-26", coveredDays: 94 });
    // La línea base cubre los mismos días que lo medido.
    expect(running.baselineStart).toBe("2026-03-23");
    expect(planMeasurementWindow("2026-10-01", "2026-09-26", 28)).toMatchObject({ status: "pendiente", coveredDays: 0 });
  });

  it("acepta la URL con y sin barra final y sin parámetros", () => {
    const filter = pageFilter("https://www.noken.com/es/blog/spa/?utm=x");
    expect(filter.expression).toBe("^https://www\\.noken\\.com/es/blog/spa/?$");
    expect(new RegExp(filter.expression).test("https://www.noken.com/es/blog/spa")).toBe(true);
    expect(new RegExp(filter.expression).test("https://www.noken.com/es/blog/spa/")).toBe(true);
  });

  it("redacta el resultado y gradúa la confianza", () => {
    const plan = planMeasurementWindow("2026-06-25", "2026-09-26", 28);
    const full = measurementOf({ plan, scope: "url", result: { clicks: 120, impressions: 4000, position: 8.44 }, baseline: { clicks: 80, impressions: 3000, position: 11 }, cutoff: "2026-09-26", measuredAt: "2026-09-29" });
    expect(full).toMatchObject({ status: "medido", result: 120, baseline: 80, confidence: "alta", position: 8.4, coveredDays: 28 });
    expect(full.interpretation).toContain("(+50 %)");
    const keyword = measurementOf({ plan, scope: "keyword", result: { clicks: 120, impressions: 4000, position: 8 }, baseline: { clicks: 80, impressions: 3000, position: 11 }, cutoff: "2026-09-26", measuredAt: "2026-09-29" });
    expect(keyword.confidence).toBe("media");
    const running = measurementOf({ plan: planMeasurementWindow("2026-06-25", "2026-09-26", 180), scope: "url", result: { clicks: 5, impressions: 400, position: 9 }, baseline: { clicks: 0, impressions: 0, position: null }, cutoff: "2026-09-26", measuredAt: "2026-09-29" });
    expect(running).toMatchObject({ status: "en_curso", confidence: "baja" });
    expect(running.interpretation).toContain("en curso: 94 de 180 días");
    const pending = measurementOf({ plan: planMeasurementWindow("2026-10-01", "2026-09-26", 28), scope: "url", result: null, baseline: null, cutoff: "2026-09-26", measuredAt: "2026-09-29" });
    expect(pending).toMatchObject({ status: "pendiente", result: null, baseline: null });
  });
});
