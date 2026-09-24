import { describe, expect, it } from "vitest";
import { REPORT_PRESETS, presetRange, reportWindowParams, resolveReportWindow, shiftYear } from "./brand-report";

const CUTOFF = "2026-09-20";

describe("selector de periodo del informe (D-037)", () => {
  it("las ventanas móviles terminan en el corte y tienen la duración que anuncian", () => {
    expect(resolveReportWindow({ range: "7d" }, CUTOFF)).toMatchObject({ start: "2026-09-14", end: CUTOFF, days: 7 });
    expect(resolveReportWindow({ range: "90d" }, CUTOFF)).toMatchObject({ start: "2026-06-23", days: 90 });
    expect(resolveReportWindow({ range: "12m" }, CUTOFF).days).toBe(365);
  });

  it("los presets de calendario cierran meses, trimestres y años completos", () => {
    expect(resolveReportWindow({ range: "mes" }, CUTOFF)).toMatchObject({ start: "2026-08-01", end: "2026-08-31", days: 31 });
    expect(resolveReportWindow({ range: "trimestre" }, CUTOFF)).toMatchObject({ start: "2026-04-01", end: "2026-06-30" });
    expect(resolveReportWindow({ range: "trimestre" }, "2026-02-10")).toMatchObject({ start: "2025-10-01", end: "2025-12-31" });
    expect(resolveReportWindow({ range: "ytd" }, CUTOFF)).toMatchObject({ start: "2026-01-01", end: CUTOFF });
    expect(resolveReportWindow({ range: "ano" }, CUTOFF)).toMatchObject({ start: "2025-01-01", end: "2025-12-31", days: 365 });
  });

  it("el periodo anterior tiene la misma duración y termina el día antes", () => {
    const window = resolveReportWindow({ range: "28d" }, CUTOFF);
    expect(window.previousEnd).toBe("2026-08-23");
    expect(window.previousStart).toBe("2026-07-27");
    expect(window.previousYearStart).toBe("2025-08-24");
    expect(window.previousYearEnd).toBe("2025-09-20");
  });

  it("el rango libre se recorta al corte y uno inválido cae a 90 días en vez de romper el enlace", () => {
    expect(resolveReportWindow({ range: "custom", from: "2026-07-01", to: "2026-12-31" }, CUTOFF)).toMatchObject({ start: "2026-07-01", end: CUTOFF, preset: "custom" });
    expect(resolveReportWindow({ range: "custom", from: "2026-09-01", to: "2026-08-01" }, CUTOFF).preset).toBe("90d");
    expect(resolveReportWindow({ range: "custom", from: "ayer" }, CUTOFF).preset).toBe("90d");
    expect(resolveReportWindow({ range: "no-existe" }, CUTOFF).preset).toBe("90d");
  });

  it("el grano del gráfico sube antes de que las barras dejen de leerse", () => {
    expect(resolveReportWindow({ range: "28d" }, CUTOFF).granularity).toBe("day");
    expect(resolveReportWindow({ range: "90d" }, CUTOFF).granularity).toBe("week");
    expect(resolveReportWindow({ range: "12m" }, CUTOFF).granularity).toBe("month");
  });

  it("el 29 de febrero se compara con el 28 del año anterior", () => {
    expect(shiftYear("2028-02-29")).toBe("2027-02-28");
    expect(shiftYear("2026-03-01")).toBe("2025-03-01");
  });

  it("todos los presets resuelven a una ventana válida", () => {
    for (const preset of REPORT_PRESETS) expect(() => resolveReportWindow({ range: preset.key }, CUTOFF)).not.toThrow();
  });

  it("los atajos nuevos cierran en lunes–domingo y en lo que va de mes o trimestre", () => {
    // 2026-09-20 es domingo: la semana pasada es la del 7 al 13.
    expect(presetRange("semana", CUTOFF)).toEqual({ start: "2026-09-07", end: "2026-09-13" });
    expect(presetRange("semana", "2026-09-16")).toEqual({ start: "2026-09-07", end: "2026-09-13" });
    expect(presetRange("este-mes", CUTOFF)).toEqual({ start: "2026-09-01", end: CUTOFF });
    expect(presetRange("este-trimestre", CUTOFF)).toEqual({ start: "2026-07-01", end: CUTOFF });
    expect(resolveReportWindow({ range: "14d" }, CUTOFF).days).toBe(14);
  });

  it("la comparación elegida dura lo mismo que el periodo: se elige el inicio y el fin se deduce", () => {
    const window = resolveReportWindow({ range: "28d", cmp: "custom", cfrom: "2026-06-25" }, CUTOFF);
    expect(window).toMatchObject({ compare: "custom", previousStart: "2026-06-25", previousEnd: "2026-07-22", previousLabel: "comparación elegida" });
  });

  it("una comparación que acabaría después del corte o antes del mínimo vuelve al periodo anterior", () => {
    expect(resolveReportWindow({ range: "90d", cmp: "custom", cfrom: "2026-08-01" }, CUTOFF).compare).toBe("anterior");
    expect(resolveReportWindow({ range: "28d", cmp: "custom", cfrom: "2019-01-01" }, CUTOFF).compare).toBe("anterior");
    expect(resolveReportWindow({ range: "28d", cmp: "custom" }, CUTOFF).compare).toBe("anterior");
  });

  it("el año pasado alineado por día de la semana retrocede 52 semanas exactas", () => {
    const window = resolveReportWindow({ range: "28d", yoy: "semana" }, CUTOFF);
    expect(window.previousYearStart).toBe("2025-08-25");
    expect(new Date(`${window.previousYearStart}T00:00:00Z`).getUTCDay()).toBe(new Date(`${window.start}T00:00:00Z`).getUTCDay());
    expect(window.previousYearLabel).toContain("día de la semana");
  });

  it("los parámetros de URL reproducen la misma ventana", () => {
    for (const input of [{ range: "90d" }, { range: "custom", from: "2026-05-01", to: "2026-06-15", cmp: "custom", cfrom: "2026-01-10", yoy: "semana" }, { range: "mes", yoy: "semana" }]) {
      const window = resolveReportWindow(input, CUTOFF);
      const params = Object.fromEntries(Object.entries(reportWindowParams(window)).filter(([, value]) => value !== null)) as Record<string, string>;
      expect(resolveReportWindow(params, CUTOFF)).toEqual(window);
    }
  });
});

