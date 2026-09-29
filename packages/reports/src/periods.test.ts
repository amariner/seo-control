import { describe, expect, it } from "vitest";
import { closedQuarters, lastClosedMonth, parsePeriod, periodIdOf } from "./periods";

describe("periodos de informe (D-076)", () => {
  it("interpreta trimestres y meses", () => {
    expect(parsePeriod("2026-Q2")).toMatchObject({ kind: "quarter", start: "2026-04-01", end: "2026-06-30", label: "2.º trimestre 2026" });
    expect(parsePeriod("2024-02")).toMatchObject({ kind: "month", start: "2024-02-01", end: "2024-02-29", label: "Febrero 2024" });
    expect(parsePeriod("2026-Q5")).toBeNull();
    expect(parsePeriod("2026-13")).toBeNull();
  });

  it("deduce el periodo de una ventana solo si coincide exactamente", () => {
    expect(periodIdOf("2026-04-01", "2026-06-30")).toBe("2026-Q2");
    expect(periodIdOf("2026-08-01", "2026-08-31")).toBe("2026-08");
    expect(periodIdOf("2026-04-01", "2026-06-29")).toBeNull();
    expect(periodIdOf("2026-06-29", "2026-09-26")).toBeNull();
  });

  it("lista los trimestres cerrados, sin el que está en curso", () => {
    expect(closedQuarters("2026-09-29").map((q) => q.id)).toEqual(["2026-Q2", "2026-Q1", "2025-Q4", "2025-Q3"]);
    expect(closedQuarters("2026-10-01", 1)[0]!.id).toBe("2026-Q3");
    expect(closedQuarters("2026-01-15", 2).map((q) => q.id)).toEqual(["2025-Q4", "2025-Q3"]);
    expect(lastClosedMonth("2026-01-10").id).toBe("2025-12");
  });
});
