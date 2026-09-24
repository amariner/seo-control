import { describe, expect, it } from "vitest";
import { getMockDashboard } from "./mock";
import { PERIOD_DAYS, buildPeriodWindow, formatPeriodRange } from "./schemas";

/**
 * La ventana del periodo (P2.3). La portada la enseña, y mientras no estuvo en
 * el contrato la enseñaba escrita a mano: elegir 24 meses seguía mostrando un
 * rango de 28 días. Estas pruebas fijan que la ventana se deriva del periodo y
 * del corte, y que ninguna comparación se solapa con el periodo activo.
 */

describe("buildPeriodWindow", () => {
  it("cubre exactamente los días del periodo, incluido el corte", () => {
    const window = buildPeriodWindow("28d", "2026-08-30");
    expect(window).toMatchObject({ days: 28, start: "2026-08-03", end: "2026-08-30" });
  });

  it("el periodo anterior es contiguo y de la misma longitud, sin solaparse", () => {
    const window = buildPeriodWindow("28d", "2026-08-30");
    expect(window.previousEnd).toBe("2026-08-02");
    expect(window.previousStart).toBe("2026-07-06");
    expect(Date.parse(window.previousEnd)).toBeLessThan(Date.parse(window.start));
    const length = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000;
    expect(length(window.previousStart, window.previousEnd)).toBe(length(window.start, window.end));
  });

  it("el interanual desplaza la misma ventana 365 días", () => {
    const window = buildPeriodWindow("28d", "2026-08-30");
    expect(window.previousYearEnd).toBe("2025-08-30");
    expect(window.previousYearStart).toBe("2025-08-03");
  });

  it("cada periodo declara su longitud y ninguna se repite", () => {
    const days = Object.values(PERIOD_DAYS);
    expect(new Set(days).size).toBe(days.length);
    for (const [period, expected] of Object.entries(PERIOD_DAYS)) {
      const window = buildPeriodWindow(period as keyof typeof PERIOD_DAYS, "2026-08-30");
      expect(window.days).toBe(expected);
      expect((Date.parse(window.end) - Date.parse(window.start)) / 86_400_000 + 1).toBe(expected);
    }
  });

  it("se deriva del corte del dato, no del reloj: dos llamadas dan lo mismo", () => {
    expect(buildPeriodWindow("90d", "2026-08-30")).toEqual(buildPeriodWindow("90d", "2026-08-30"));
  });
});

describe("formatPeriodRange", () => {
  it("colapsa el mes cuando no cambia", () => {
    expect(formatPeriodRange("2026-08-03", "2026-08-30")).toBe("3–30 agosto 2026");
  });

  it("abrevia los meses cuando cruza mes pero no año", () => {
    expect(formatPeriodRange("2026-06-02", "2026-08-30")).toBe("2 jun – 30 ago 2026");
  });

  it("muestra los dos años cuando la ventana los cruza", () => {
    expect(formatPeriodRange("2025-09-04", "2026-08-30")).toBe("4 sep 2025 – 30 ago 2026");
  });
});

describe("la portada declara la ventana que resume", () => {
  it("cambia con el periodo elegido", () => {
    const short = getMockDashboard({ project: "all", market: "all", period: "28d" });
    const long = getMockDashboard({ project: "all", market: "all", period: "24m" });
    expect(short.window.days).toBe(28);
    expect(long.window.days).toBe(730);
    expect(short.window.start).not.toBe(long.window.start);
    // Las dos terminan en el mismo corte: lo que cambia es cuánto abarcan.
    expect(short.window.end).toBe(long.window.end);
  });

  it("el corte de la ventana coincide con el de la cobertura declarada", () => {
    const data = getMockDashboard({ project: "all", market: "all", period: "28d" });
    expect(data.window.end).toBe(data.metrics[0]!.coverage.asOf);
  });
});
