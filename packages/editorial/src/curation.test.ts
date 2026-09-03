import { describe, expect, it } from "vitest";
import { editorialDatasetSchema, editorialPieceSchema, emptyCurationStore, type EditorialCalendarEvent, type EditorialCurationFields, type EditorialDataset, type EditorialPiece, type EditorialSlot } from "@seo/contracts";
import { addCreatedPiece, applyCuration, buildPieceFromInput, findPieceCuration, upsertEventCuration, upsertPieceCuration, upsertSlotCuration } from "./curation";

const NOW = "2026-09-03T09:00:00.000Z";

/** Hash de prueba determinista (no criptográfico): varía con el contenido, no solo con la longitud. */
function sha256(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(16).padStart(8, "0").repeat(8);
}

const PIECE_1 = `ed-bk-${"1".repeat(16)}`;
const SLOT_1 = `ed-sl-${"2".repeat(16)}`;
const EVENT_1 = `ed-ev-${"3".repeat(16)}`;
const PROPOSAL_1 = `ed-pr-${"4".repeat(16)}`;
const PROPOSAL_2 = `ed-pr-${"5".repeat(16)}`;

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
    theme: "Inspiración estival",
    subtheme: null,
    keyword: "baños wellness",
    title: "Baños wellness",
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

const BRAND_SLUGS = ["porcelanosa", "noken", "ecommerce", "butech", "antic-colonial", "krion", "xtone", "gamadecor"] as const;

function dataset(overrides: Partial<EditorialDataset> = {}): EditorialDataset {
  return {
    schemaVersion: "editorial.v1",
    generatedAt: NOW,
    mode: "v1-import",
    planningYear: 2026,
    brands: BRAND_SLUGS.map((slug) => ({ slug, name: slug, code: slug.slice(0, 4).toUpperCase(), pilot: slug === "porcelanosa" || slug === "noken", calendarEvents: 0, backlogPieces: 0, planPieces: 0, slots: 0 })),
    calendar: { events: [], themes: [] },
    backlog: [],
    plan: [],
    slots: [],
    report: { schemaVersion: "editorial.v1", importedAt: NOW, inputFingerprint: "b".repeat(64), archives: [], rejections: [], warnings: [], brandAliases: [], brandsWithoutEvents: [], emptyFields: {}, duplicates: {}, briefs: {}, identityCollisions: 0 },
    ...overrides,
  };
}

const EMPTY_FIELDS: EditorialCurationFields = { status: null, type: null, year: null, month: null, writingDate: null, publicationDate: null, intent: null, cluster: null, objective: null, hypothesis: null, impact: null, effort: null, owner: null, author: null, reviewer: null, successKpi: null, links: [] };

describe("versionado de curación", () => {
  it("crea la versión 1 sin historial y la versión 2 con la anterior en el historial", () => {
    const store0 = emptyCurationStore(NOW);
    const store1 = upsertPieceCuration(store0, PIECE_1, { ...EMPTY_FIELDS, owner: "Ana" }, { updatedBy: "Ana", note: null, now: NOW });
    expect(store1.pieces[PIECE_1]!.current).toMatchObject({ version: 1, owner: "Ana" });
    expect(store1.pieces[PIECE_1]!.history).toHaveLength(0);

    const store2 = upsertPieceCuration(store1, PIECE_1, { ...EMPTY_FIELDS, owner: "Ana", impact: 4 }, { updatedBy: "Carlos", note: "aprobado", now: "2026-09-03T10:00:00.000Z" });
    expect(store2.pieces[PIECE_1]!.current).toMatchObject({ version: 2, owner: "Ana", impact: 4, updatedBy: "Carlos", note: "aprobado" });
    expect(store2.pieces[PIECE_1]!.history).toEqual([store1.pieces[PIECE_1]!.current]);
  });

  it("versiona huecos y eventos de forma independiente", () => {
    const store1 = upsertSlotCuration(emptyCurationStore(NOW), SLOT_1, PROPOSAL_1, { updatedBy: null, note: null, now: NOW });
    expect(store1.slots[SLOT_1]!.current.selectedProposalId).toBe(PROPOSAL_1);
    const store2 = upsertEventCuration(store1, EVENT_1, PIECE_1, { updatedBy: null, note: null, now: NOW });
    expect(store2.events[EVENT_1]!.current.pieceId).toBe(PIECE_1);
    expect(store2.slots[SLOT_1]!.current.version).toBe(1);
  });

  it("findPieceCuration devuelve null si nunca se curó", () => {
    expect(findPieceCuration(emptyCurationStore(NOW), PIECE_1)).toBeNull();
  });
});

describe("buildPieceFromInput", () => {
  it("produce una pieza válida contra el contrato, con procedencia workbench", () => {
    const built = buildPieceFromInput({ brand: "porcelanosa", market: "ES", language: "es", theme: "Cocinas", subtheme: null, keyword: "encimera", title: "Encimeras 2026", url: null, briefText: "Texto del brief", type: "nuevo", year: 2026, month: 10, publicationDate: null }, { seed: "seed-1", now: NOW, sha256 });
    expect(() => editorialPieceSchema.parse(built)).not.toThrow();
    expect(built.kind).toBe("backlog");
    expect(built.provenance.source).toBe("workbench");
    expect(built.id).toMatch(/^ed-bk-[a-f0-9]{16}$/);
    expect(built.brief?.text).toBe("Texto del brief");
  });

  it("es determinista para la misma semilla y distinta para semillas distintas", () => {
    const a = buildPieceFromInput({ brand: "noken", market: null, language: null, theme: null, subtheme: null, keyword: null, title: null, url: null, briefText: null, type: "nuevo", year: null, month: null, publicationDate: null }, { seed: "misma", now: NOW, sha256 });
    const b = buildPieceFromInput({ brand: "noken", market: null, language: null, theme: null, subtheme: null, keyword: null, title: null, url: null, briefText: null, type: "nuevo", year: null, month: null, publicationDate: null }, { seed: "misma", now: NOW, sha256 });
    const c = buildPieceFromInput({ brand: "noken", market: null, language: null, theme: null, subtheme: null, keyword: null, title: null, url: null, briefText: null, type: "nuevo", year: null, month: null, publicationDate: null }, { seed: "distinta", now: NOW, sha256 });
    expect(a.id).toBe(b.id);
    expect(a.id).not.toBe(c.id);
  });
});

describe("applyCuration", () => {
  it("con un almacén vacío devuelve un dataset equivalente al importado", () => {
    const base = dataset({ backlog: [piece({ id: PIECE_1 })] });
    expect(applyCuration(base, emptyCurationStore(NOW))).toEqual(base);
    expect(editorialDatasetSchema.parse(applyCuration(base, emptyCurationStore(NOW)))).toBeTruthy();
  });

  it("superpone owner, impacto, esfuerzo, estado y enlaces sobre la pieza importada, sin tocar lo no curado", () => {
    const base = dataset({ backlog: [piece({ id: PIECE_1, theme: "Cocinas" })] });
    let store = emptyCurationStore(NOW);
    store = upsertPieceCuration(store, PIECE_1, { ...EMPTY_FIELDS, owner: "Ana", impact: 4, effort: 2, status: "aceptado", links: [{ kind: "insight", id: "ins-1" }] }, { updatedBy: "Ana", note: null, now: NOW });
    const effective = applyCuration(base, store);
    const result = effective.backlog[0]!;
    expect(result.owner).toBe("Ana");
    expect(result.impact).toBe(4);
    expect(result.effort).toBe(2);
    expect(result.status).toBe("aceptado");
    expect(result.links).toEqual([{ kind: "insight", id: "ins-1" }]);
    expect(result.theme).toBe("Cocinas");
    expect(result.statusLiteral).toBe("Backlog");
  });

  it("mueve una pieza de mes y marca el año como estimado sin fecha de publicación", () => {
    const base = dataset({ backlog: [piece({ id: PIECE_1, month: { year: 2026, month: 7, yearSource: "calendar", literal: "07 Julio" } })] });
    const store = upsertPieceCuration(emptyCurationStore(NOW), PIECE_1, { ...EMPTY_FIELDS, year: 2026, month: 11 }, { updatedBy: null, note: null, now: NOW });
    const result = applyCuration(base, store).backlog[0]!;
    expect(result.month.month).toBe(11);
    expect(result.month.yearSource).toBe("estimate");
  });

  it("fija la propuesta seleccionada en el hueco y marca la propuesta correspondiente", () => {
    const slot: EditorialSlot = {
      id: SLOT_1,
      provenance: { ...provenance(0), source: "conjunto-propuestas" },
      status: "backlog",
      statusLiteral: "Backlog",
      brand: { slug: "butech", line: null, literal: "Butech" },
      market: "ES",
      marketLiteral: "ES",
      month: { year: 2026, month: 7, yearSource: "calendar", literal: "07 Julio" },
      publicationDate: null,
      theme: "Cerramientos",
      slotLiteral: "Cerramientos",
      typeLiteral: "",
      proposals: [
        { id: PROPOSAL_1, slotId: SLOT_1, ordinal: 1, subtheme: null, keyword: null, searchVolume: null, titles: ["A"], angle: null, format: "nuevo", formatLiteral: "nuevo", type: "nuevo", typeLiteral: "Nuevo", url: null, selected: null },
        { id: PROPOSAL_2, slotId: SLOT_1, ordinal: 2, subtheme: null, keyword: null, searchVolume: null, titles: ["B"], angle: null, format: "nuevo", formatLiteral: "nuevo", type: "nuevo", typeLiteral: "Nuevo", url: null, selected: null },
      ],
      selectedProposalId: null,
      warnings: [],
    };
    const base = dataset({ slots: [slot] });
    const store = upsertSlotCuration(emptyCurationStore(NOW), SLOT_1, PROPOSAL_2, { updatedBy: null, note: null, now: NOW });
    const result = applyCuration(base, store).slots[0]!;
    expect(result.selectedProposalId).toBe(PROPOSAL_2);
    expect(result.proposals.map((p) => p.selected)).toEqual([false, true]);
  });

  it("sustituye la relación heurística evento -> pieza por el vínculo curado", () => {
    const event: EditorialCalendarEvent = { id: EVENT_1, provenance: { ...provenance(0), source: "calendario-2026" }, date: "2026-07-09", year: 2026, month: 7, day: 9, typeLiteral: "POST", brand: { slug: "noken", line: null, literal: "Noken" }, sequence: null, label: "POST Noken", pieceId: null };
    const base = dataset({ calendar: { events: [event], themes: [] } });
    const store = upsertEventCuration(emptyCurationStore(NOW), EVENT_1, PIECE_1, { updatedBy: null, note: null, now: NOW });
    expect(applyCuration(base, store).calendar.events[0]!.pieceId).toBe(PIECE_1);
  });

  it("añade piezas creadas en el workbench al backlog y suma su marca al resumen", () => {
    const base = dataset();
    const created = buildPieceFromInput({ brand: "krion", market: null, language: null, theme: null, subtheme: null, keyword: "encimera krion", title: "Krion 2026", url: null, briefText: null, type: "nuevo", year: 2026, month: 3, publicationDate: null }, { seed: "nueva-1", now: NOW, sha256 });
    const store = addCreatedPiece(emptyCurationStore(NOW), created, NOW);
    const effective = applyCuration(base, store);
    expect(effective.backlog.map((item) => item.id)).toContain(created.id);
    expect(effective.brands.find((brand) => brand.slug === "krion")!.backlogPieces).toBe(1);
    expect(effective.brands.find((brand) => brand.slug === "noken")!.backlogPieces).toBe(0);
  });
});
