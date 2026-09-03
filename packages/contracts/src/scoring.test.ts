import { describe, expect, it } from "vitest";
import { calculateProjectScore, editorialPiecePriority, expectedCtr, rankAction, technicalPriority } from "./scoring";

describe("project score", () => {
  it("uses 40/30/30 weights", () => {
    expect(calculateProjectScore({ business: 80, visibility: 70, technical: 60 })).toBe(71);
  });

  it("does not fabricate a global score when a dimension is missing", () => {
    expect(calculateProjectScore({ business: 80, visibility: null, technical: 60 })).toBeNull();
  });
});

describe("prioritisation", () => {
  it("rewards impact and urgency, penalising effort", () => {
    const high = rankAction({ impact: 5, confidence: 5, effort: 1, urgency: 5 });
    const low = rankAction({ impact: 3, confidence: 3, effort: 5, urgency: 2 });
    expect(high).toBeGreaterThan(low);
  });

  it("uses a decreasing CTR curve", () => {
    expect(expectedCtr(1, "desktop", false)).toBeGreaterThan(expectedCtr(5, "desktop", false));
    expect(expectedCtr(1, "desktop", true)).toBeGreaterThan(expectedCtr(1, "desktop", false));
  });

  it("prioritises persistent, high-reach technical issues", () => {
    expect(technicalPriority({ severity: 4, affectedUrls: 2000, trafficAtRisk: 8000, persistenceRuns: 8, effort: 1 }))
      .toBeGreaterThan(technicalPriority({ severity: 2, affectedUrls: 10, trafficAtRisk: 20, persistenceRuns: 1, effort: 3 }));
  });
});

describe("editorial piece priority", () => {
  it("divides impact by effort and shows both components", () => {
    expect(editorialPiecePriority({ impact: 4, effort: 2 })).toEqual({ score: 2, impact: 4, effort: 2, formula: "Prioridad = Impacto ÷ Esfuerzo" });
  });

  it("never fabricates a score when impact or effort is missing", () => {
    expect(editorialPiecePriority({ impact: null, effort: 2 })).toBeNull();
    expect(editorialPiecePriority({ impact: 4, effort: null })).toBeNull();
  });
});
