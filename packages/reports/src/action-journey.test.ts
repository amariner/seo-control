import { describe, expect, it } from "vitest";
import type { EditorialMeasurement, EditorialPiece } from "@seo/contracts";
import { buildBacklinkIndex } from "@seo/editorial";
import { actionLinkOf, actionPieces, pieceResult } from "./action-journey";

const window = (windowDays: 28 | 90 | 180, status: EditorialMeasurement["status"], result: number | null = null, baseline: number | null = null, coveredDays?: number): EditorialMeasurement => ({
  windowDays,
  status,
  baseline,
  result,
  metricKey: "clicks",
  measuredAt: null,
  interpretation: null,
  ...(coveredDays === undefined ? {} : { coveredDays }),
});
const piece = (id: string, links: EditorialPiece["links"], measurements: EditorialMeasurement[] = []) =>
  ({ id, kind: "plan", title: `Pieza ${id}`, keyword: "calacatta viola", status: "publicado", statusLiteral: "Publicado", publicationDate: "2026-08-01", measurements, links }) as unknown as EditorialPiece;

describe("recorrido oportunidad → pieza → acción → resultado (D-092)", () => {
  it("lee la ventana cerrada más larga y, si no hay, la de 28 días en curso", () => {
    expect(pieceResult([window(28, "medido", 120, 80), window(90, "medido", 300, 260), window(180, "en_curso", 310, 500, 60)])).toBe("90 días: 300 clics (antes 260, +15 %)");
    expect(pieceResult([window(28, "en_curso", 40, 30, 12), window(90, "pendiente"), window(180, "pendiente")])).toBe("28 días en curso (12 con dato): 40 clics (antes 30, +33 %)");
    expect(pieceResult([window(28, "pendiente"), window(90, "pendiente")])).toBe("medición pendiente");
    expect(pieceResult([])).toBeNull();
  });

  it("deriva las piezas de una acción de `piece.links`, sin otro almacén", () => {
    const linked = piece("ed-pl-0000000000000001", [{ kind: "action", id: "xtone:busquedas:oportunidad:calacatta-viola" }], [window(28, "medido", 120, 80)]);
    const other = piece("ed-pl-0000000000000002", [{ kind: "action", id: "noken:busquedas:oportunidad:calacatta-viola" }]);
    const index = buildBacklinkIndex({ backlog: [], plan: [linked, other] } as never);
    const pieces = actionPieces(index, "xtone", "busquedas:oportunidad:calacatta-viola");
    expect(pieces).toEqual([
      {
        id: "ed-pl-0000000000000001",
        title: "Pieza ed-pl-0000000000000001",
        href: "/editorial/backlog?kind=plan&piece=ed-pl-0000000000000001",
        status: "Publicado",
        publicationDate: "2026-08-01",
        keyword: "calacatta viola",
        result: "28 días: 120 clics (antes 80, +50 %)",
      },
    ]);
    expect(actionLinkOf("xtone", "busquedas:oportunidad:calacatta-viola")).toBe("action:xtone:busquedas:oportunidad:calacatta-viola");
  });
});
