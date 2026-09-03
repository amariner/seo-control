import { describe, expect, it } from "vitest";
import type { EditorialPiece } from "@seo/contracts";
import { backlinksFor, buildBacklinkIndex, editorialPieceHref, linkKey, linkTargetHref, listBacklinks } from "./links";

const provenance = (sourceIndex: number) => ({ source: "conjunto-backlog" as const, sourceIndex, sourceSha256: "a".repeat(64), importedAt: "2026-09-02T14:00:00.000Z", identityOrdinal: 1 });

function piece(overrides: Partial<EditorialPiece> & { id: string }): EditorialPiece {
  return {
    kind: "backlog",
    provenance: provenance(0),
    status: "backlog",
    statusLiteral: "Backlog",
    type: "nuevo",
    typeLiteral: "Nuevo",
    brand: { slug: "noken", line: null, literal: "Noken" },
    market: "ES",
    marketLiteral: "ES",
    language: "es",
    month: { year: 2026, month: 7, yearSource: "calendar", literal: "07 Julio" },
    writingDate: null,
    publicationDate: null,
    warnings: [],
    theme: null,
    subtheme: null,
    keyword: null,
    title: null,
    url: null,
    brief: null,
    intent: null,
    cluster: null,
    objective: null,
    hypothesis: null,
    impact: null,
    effort: null,
    owner: null,
    author: null,
    reviewer: null,
    dependencies: [],
    successKpi: null,
    measurements: [],
    links: [],
    ...overrides,
  };
}

const A = `ed-bk-${"1".repeat(16)}`;
const B = `ed-bk-${"2".repeat(16)}`;
const C = `ed-pl-${"3".repeat(16)}`;

describe("índice recíproco de enlaces editoriales", () => {
  it("agrupa por ficha las piezas de backlog y plan", () => {
    const index = buildBacklinkIndex({
      backlog: [piece({ id: A, links: [{ kind: "insight", id: "ins-p-index" }, { kind: "page", id: "page-1" }] }), piece({ id: B, links: [{ kind: "insight", id: "ins-p-index" }] })],
      plan: [piece({ id: C, kind: "plan", links: [{ kind: "insight", id: "ins-p-index" }] })],
    });
    expect(backlinksFor(index, "insight", "ins-p-index").map((item) => item.id)).toEqual([A, B, C]);
    expect(backlinksFor(index, "page", "page-1").map((item) => item.id)).toEqual([A]);
  });

  it("devuelve un array vacío para una ficha sin referencias", () => {
    const index = buildBacklinkIndex({ backlog: [piece({ id: A, links: [{ kind: "insight", id: "ins-p-index" }] })], plan: [] });
    expect(backlinksFor(index, "insight", "ins-otro")).toEqual([]);
    expect(backlinksFor(index, "report", "ins-p-index")).toEqual([]);
  });

  it("no separa fichas por espacios accidentales al curar", () => {
    const index = buildBacklinkIndex({ backlog: [piece({ id: A, links: [{ kind: "page", id: "  page-2  " }] })], plan: [] });
    expect(backlinksFor(index, "page", "page-2").map((item) => item.id)).toEqual([A]);
    expect(listBacklinks(index)[0]?.id).toBe("page-2");
  });

  it("ignora enlaces vacíos y no repite una pieza que duplica el mismo enlace", () => {
    const index = buildBacklinkIndex({ backlog: [piece({ id: A, links: [{ kind: "page", id: "   " }, { kind: "insight", id: "ins-1" }, { kind: "insight", id: "ins-1" }] })], plan: [] });
    expect(index.has(linkKey("page", ""))).toBe(false);
    expect(backlinksFor(index, "insight", "ins-1").map((item) => item.id)).toEqual([A]);
  });

  it("ordena el listado por tipo de ficha y luego por identificador", () => {
    const index = buildBacklinkIndex({
      backlog: [piece({ id: A, links: [{ kind: "report", id: "report-2026-08" }, { kind: "insight", id: "ins-b" }, { kind: "insight", id: "ins-a" }, { kind: "query", id: "q-1" }] })],
      plan: [],
    });
    expect(listBacklinks(index).map((item) => linkKey(item.kind, item.id))).toEqual(["insight:ins-a", "insight:ins-b", "query:q-1", "report:report-2026-08"]);
  });

  it("resuelve la ruta canónica de cada tipo con ficha y deja null los que aún no la tienen", () => {
    expect(linkTargetHref("insight", "ins-p-index")).toBe("/insights#ins-p-index");
    expect(linkTargetHref("action", "act-1")).toBe("/actions#act-1");
    expect(linkTargetHref("query", "noken-taps-uk")).toBe("/queries/noken-taps-uk");
    expect(linkTargetHref("page", "page-1")).toBe("/pages/page-1");
    expect(linkTargetHref("report", "report-2026-08")).toBe("/reports/report-2026-08");
    expect(linkTargetHref("cluster", "banos")).toBeNull();
    expect(linkTargetHref("result", "res-1")).toBeNull();
  });

  it("escapa el identificador en la ruta para no romper la URL", () => {
    expect(linkTargetHref("query", "grifos baño/ES")).toBe("/queries/grifos%20ba%C3%B1o%2FES");
  });
});

describe("ruta canónica de una pieza editorial", () => {
  it("apunta a la bandeja correcta según el tipo de pieza", () => {
    expect(editorialPieceHref({ id: A, kind: "backlog" })).toBe(`/editorial/backlog?kind=backlog&piece=${A}`);
    expect(editorialPieceHref({ id: C, kind: "plan" })).toBe(`/editorial/backlog?kind=plan&piece=${C}`);
  });
});
