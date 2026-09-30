import { describe, expect, it } from "vitest";
import { editorialInboxChangeSchema, editorialInboxEditSchema, emptyCurationStore, type EditorialInboxChange } from "@seo/contracts";
import { getEditorialDataset } from "./dataset";
import { upsertPieceCuration } from "./curation";
import { applyInbox, editPieceCuration, pendingInboxChanges, pullInbox } from "./inbox";

const dataset = getEditorialDataset();
const target = dataset.plan.find((piece) => piece.provenance.source === "plan-sheet" && piece.status === "backlog")!;
const other = dataset.plan.find((piece) => piece.id !== target.id)!;
const ids = new Set([...dataset.plan, ...dataset.backlog].map((piece) => piece.id));
const empty = emptyCurationStore("2026-09-01T00:00:00.000Z");

let seq = 0;
const change = (overrides: Partial<EditorialInboxChange>): EditorialInboxChange => ({
  id: `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`,
  pieceId: target.id,
  status: null,
  publicationDate: null,
  writingDate: null,
  actor: "responsable@porcelanosa.com",
  createdAt: "2026-09-28T10:00:00.000Z",
  pulledAt: null,
  ...overrides,
});

describe("bandeja de cambios del visor (D-067)", () => {
  it("superpone estado y fecha al plan y marca la pieza como pendiente", () => {
    const { dataset: live, pending } = applyInbox(dataset, empty, [change({ status: "redactando" }), change({ publicationDate: "2026-10-15", createdAt: "2026-09-28T10:05:00.000Z" })]);
    const piece = live.plan.find((item) => item.id === target.id)!;
    expect(piece.status).toBe("redactando");
    expect(piece.publicationDate).toBe("2026-10-15");
    expect(piece.month).toMatchObject({ year: 2026, month: 10, yearSource: "date" });
    expect(pending.get(target.id)?.createdAt).toBe("2026-09-28T10:05:00.000Z");
    expect(live.plan.find((item) => item.id === other.id)).toBe(other);
  });

  it("aplica los cambios de una pieza en orden: gana el último", () => {
    const { dataset: live } = applyInbox(dataset, empty, [change({ status: "publicado", createdAt: "2026-09-28T11:00:00.000Z" }), change({ status: "redactando", createdAt: "2026-09-28T10:00:00.000Z" })]);
    expect(live.plan.find((item) => item.id === target.id)!.status).toBe("publicado");
  });

  it("deja de superponer un cambio en cuanto la curación desplegada es posterior", () => {
    const curated = upsertPieceCuration(empty, target.id, { ...editPieceCuration(empty, target.id, { status: "aceptado" }, { updatedBy: "wb", note: null, now: "2026-09-28T12:00:00.000Z" }).pieces[target.id]!.current, links: [] }, { updatedBy: "wb", note: null, now: "2026-09-28T12:00:00.000Z" });
    const changes = [change({ status: "redactando", createdAt: "2026-09-28T11:00:00.000Z", pulledAt: "2026-09-28T12:00:00.000Z" })];
    expect(pendingInboxChanges(curated, changes)).toHaveLength(0);
    expect(applyInbox(dataset, curated, changes).pending.size).toBe(0);
  });

  it("editar conserva el resto de la curación y fija el mes con la fecha", () => {
    const withOwner = upsertPieceCuration(empty, target.id, { ...editPieceCuration(empty, target.id, {}, { updatedBy: null, note: null, now: "2026-09-27T00:00:00.000Z" }).pieces[target.id]!.current, owner: "Equipo SEO", links: [] }, { updatedBy: null, note: null, now: "2026-09-27T00:00:00.000Z" });
    const next = editPieceCuration(withOwner, target.id, { publicationDate: "2026-11-03" }, { updatedBy: "wb", note: null, now: "2026-09-28T00:00:00.000Z" });
    const current = next.pieces[target.id]!.current;
    expect(current).toMatchObject({ owner: "Equipo SEO", publicationDate: "2026-11-03", year: 2026, month: 11, version: 2 });
    expect(next.pieces[target.id]!.history).toHaveLength(1);
  });

  it("al traer: incorpora, informa de lo que perdió frente al workbench y de lo huérfano", () => {
    const workbenchLater = editPieceCuration(empty, other.id, { status: "publicado" }, { updatedBy: "wb", note: null, now: "2026-09-28T13:00:00.000Z" });
    const changes = [
      change({ status: "redactando", createdAt: "2026-09-28T10:00:00.000Z" }),
      change({ publicationDate: "2026-10-01", createdAt: "2026-09-28T10:01:00.000Z" }),
      change({ pieceId: other.id, status: "aceptado", createdAt: "2026-09-28T12:00:00.000Z" }),
      change({ pieceId: "ed-ps-ffffffffffffffff", status: "aceptado" }),
      change({ status: "descartado", pulledAt: "2026-09-27T00:00:00.000Z" }),
    ];
    const result = pullInbox(workbenchLater, changes, ids, "2026-09-28T14:00:00.000Z");
    expect(result.applied.map((item) => item.createdAt)).toEqual(["2026-09-28T10:00:00.000Z", "2026-09-28T10:01:00.000Z"]);
    expect(result.superseded.map((item) => item.pieceId)).toEqual([other.id]);
    expect(result.orphaned.map((item) => item.pieceId)).toEqual(["ed-ps-ffffffffffffffff"]);
    const current = result.store.pieces[target.id]!.current;
    expect(current).toMatchObject({ status: "redactando", publicationDate: "2026-10-01", updatedBy: "responsable@porcelanosa.com", updatedAt: "2026-09-28T14:00:00.000Z" });
    expect(result.store.pieces[other.id]!.current.status).toBe("publicado");
    // Tras desplegar esta curación, el visor ya no superpone nada de lo traído.
    expect(pendingInboxChanges(result.store, result.applied)).toHaveLength(0);
  });

  it("el visor solo puede pedir estados reales y fechas válidas", () => {
    expect(editorialInboxEditSchema.safeParse({ status: "desconocido" }).success).toBe(false);
    expect(editorialInboxEditSchema.safeParse({}).success).toBe(false);
    expect(editorialInboxEditSchema.safeParse({ publicationDate: "2026-13-01" }).success).toBe(false);
    expect(editorialInboxEditSchema.safeParse({ status: "redactando", title: "x" }).success).toBe(false);
    expect(editorialInboxEditSchema.safeParse({ status: "programado", publicationDate: "2026-10-01" }).success).toBe(true);
    expect(editorialInboxEditSchema.safeParse({ writingDate: "2026-10-01" }).success).toBe(true);
    expect(editorialInboxEditSchema.safeParse({ writingDate: "2026-02-30" }).success).toBe(false);
  });

  it("la fecha de redacción se superpone, se trae y no cambia el mes del plan (D-084)", () => {
    const { dataset: live } = applyInbox(dataset, empty, [change({ writingDate: "2026-10-02" })]);
    const piece = live.plan.find((item) => item.id === target.id)!;
    expect(piece.writingDate).toBe("2026-10-02");
    expect(piece.month).toEqual(target.month);
    const result = pullInbox(empty, [change({ writingDate: "2026-10-02" })], ids, "2026-09-28T14:00:00.000Z");
    expect(result.store.pieces[target.id]!.current).toMatchObject({ writingDate: "2026-10-02", publicationDate: null, year: null, month: null });
  });

  it("lee cambios guardados antes de existir la fecha de redacción", () => {
    const { writingDate: _writingDate, ...legacy } = change({ status: "aceptado" });
    expect(editorialInboxChangeSchema.parse(legacy).writingDate).toBeNull();
  });
});
