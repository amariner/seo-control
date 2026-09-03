import type { Action, Insight } from "./schemas";

export type ScoreDimensions = {
  business: number | null;
  visibility: number | null;
  technical: number | null;
};

export function calculateProjectScore(dimensions: ScoreDimensions): number | null {
  if (dimensions.business === null || dimensions.visibility === null || dimensions.technical === null) {
    return null;
  }
  return Math.round((dimensions.business * 0.4 + dimensions.visibility * 0.3 + dimensions.technical * 0.3) * 10) / 10;
}

const confidenceWeight = { alta: 1, media: 0.65, baja: 0.35 } as const;

export function rankInsight(insight: Pick<Insight, "impact" | "urgency" | "confidence">): number {
  return Math.round(insight.impact * insight.urgency * confidenceWeight[insight.confidence] * 100) / 100;
}

export function rankAction(action: Pick<Action, "impact" | "confidence" | "effort" | "urgency">): number {
  return Math.round(((action.impact * action.confidence * action.urgency) / action.effort) * 100) / 100;
}

export function expectedCtr(position: number, device: "desktop" | "mobile", branded: boolean): number {
  const baseCurve = [0.31, 0.17, 0.11, 0.08, 0.065, 0.05, 0.041, 0.034, 0.029, 0.024];
  const index = Math.max(0, Math.min(9, Math.floor(position) - 1));
  const deviceFactor = device === "mobile" ? 0.91 : 1;
  const brandFactor = branded ? 1.35 : 1;
  return Math.round(baseCurve[index]! * deviceFactor * brandFactor * 10000) / 100;
}

/** Fórmula visible junto a la puntuación (P1.4): nunca se muestra un número sin sus componentes. */
export const EDITORIAL_PRIORITY_FORMULA = "Prioridad = Impacto ÷ Esfuerzo";

export type EditorialPriority = { score: number; impact: number; effort: number; formula: string };

/**
 * Prioridad explicable de una pieza editorial curada. Solo impacto y esfuerzo
 * (1-5) existen en P1; confianza y urgencia llegan con el sistema de decisiones
 * de P4. Nula mientras falte cualquiera de los dos componentes: nunca se
 * aproxima ni se rellena con un valor por defecto.
 */
export function editorialPiecePriority(piece: { impact: number | null; effort: number | null }): EditorialPriority | null {
  if (piece.impact === null || piece.effort === null) return null;
  return { score: Math.round((piece.impact / piece.effort) * 100) / 100, impact: piece.impact, effort: piece.effort, formula: EDITORIAL_PRIORITY_FORMULA };
}

export function technicalPriority(input: {
  severity: 1 | 2 | 3 | 4;
  affectedUrls: number;
  trafficAtRisk: number;
  persistenceRuns: number;
  effort: 1 | 2 | 3;
}): number {
  const reach = Math.log10(Math.max(1, input.affectedUrls)) + 1;
  const traffic = Math.log10(Math.max(1, input.trafficAtRisk)) + 1;
  const persistence = Math.min(2, 1 + input.persistenceRuns / 10);
  return Math.round(((input.severity * reach * traffic * persistence) / input.effort) * 10) / 10;
}
