import { describe, expect, it } from "vitest";
import type { EditorialBrandSlug, EditorialCalendarEvent, EditorialPiece, EditorialSlot } from "@seo/contracts";
import { brandEditorialActivity, buildAgenda, buildMonthCells, csvCell, filterPieces, filterSlots, parsePieceFilters, piecesToCsv, slotsToCsv, sortPieces } from "./query";

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
    theme: "Inspiración estival - 1",
    subtheme: null,
    keyword: "baños wellness",
    title: "Baños wellness",
    url: null,
    brief: { text: "Brief; con \"comillas\"\ny salto", normalizedLength: 10, sha256: "b".repeat(64) },
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

const pieces = [
  piece({ id: "ed-bk-" + "1".repeat(16), month: { year: 2026, month: 9, yearSource: "calendar", literal: "09 Septiembre" }, brand: { slug: "porcelanosa", line: "Trendbook", literal: "Porcelanosa - Trendbook" }, title: "Suelo porcelánico", keyword: "suelo porcelanico", type: "reedicion", typeLiteral: "Reedición" }),
  piece({ id: "ed-bk-" + "2".repeat(16), provenance: provenance(1) }),
  piece({ id: "ed-bk-" + "3".repeat(16), provenance: provenance(2), market: "UK", marketLiteral: "UK", language: "en", month: { year: 2026, month: 8, yearSource: "calendar", literal: "08 Agosto" }, status: "aceptado", statusLiteral: "Aceptado", title: "Wet room ideas", keyword: "wet room ideas", theme: "Inspiración estival - 2" }),
];

describe("filtros y orden", () => {
  it("parsea filtros compartibles por URL con valores por defecto seguros", () => {
    expect(parsePieceFilters({})).toMatchObject({ kind: "all", brand: "all", month: "all", q: "" });
    expect(parsePieceFilters({ month: "13" }).month).toBe("all");
    expect(parsePieceFilters({ month: ["8", "9"] }).month).toBe(8);
    expect(parsePieceFilters({ q: "  wellness " }).q).toBe("wellness");
  });

  it("filtra por marca, mercado, estado, mes y texto sin acentos", () => {
    expect(filterPieces(pieces, { brand: "porcelanosa" }).map((item) => item.id)).toEqual([pieces[0]!.id]);
    expect(filterPieces(pieces, { market: "UK" })).toHaveLength(1);
    expect(filterPieces(pieces, { status: "aceptado" })).toHaveLength(1);
    expect(filterPieces(pieces, { month: 7 })).toHaveLength(1);
    expect(filterPieces(pieces, { q: "PORCELANICO" })).toHaveLength(1);
    expect(filterPieces(pieces, { q: "comillas" })).toHaveLength(3);
    expect(filterPieces(pieces, { language: "en" })).toHaveLength(1);
  });

  it("ordena por mes de forma estable y permite invertir", () => {
    expect(sortPieces(pieces, "month", "asc").map((item) => item.month.month)).toEqual([7, 8, 9]);
    expect(sortPieces(pieces, "month", "desc").map((item) => item.month.month)).toEqual([9, 8, 7]);
    expect(sortPieces(pieces, "title", "asc").map((item) => item.title)).toEqual(["Baños wellness", "Suelo porcelánico", "Wet room ideas"]);
    expect(sortPieces(pieces, "brand", "asc")[0]!.brand.literal).toBe("Noken");
  });
});

describe("CSV equivalente a V1", () => {
  it("usa BOM, separador ; y las once columnas originales", () => {
    const csv = piecesToCsv(sortPieces(pieces, "month"));
    const lines = csv.split("\n");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lines[0]).toBe("﻿Estado;Tipo;Marca;País;Mes;Temática;Subtema;Keyword principal;Título;URL;Notas");
    expect(lines[1]!.startsWith("Backlog;Nuevo;Noken;ES;07 Julio;Inspiración estival - 1;;baños wellness;Baños wellness;;\"Brief; con \"\"comillas\"\"")).toBe(true);
  });

  it("protege celdas con fórmulas y respeta comillas y saltos", () => {
    expect(csvCell("=SUM(A1)")).toBe("'=SUM(A1)");
    expect(csvCell("texto; con punto y coma")).toBe('"texto; con punto y coma"');
    expect(csvCell("normal")).toBe("normal");
    expect(csvCell(null)).toBe("");
  });

  it("exporta tantas columnas de propuesta como alternativas existan", () => {
    const slot: EditorialSlot = {
      id: "ed-sl-" + "4".repeat(16),
      provenance: { ...provenance(0), source: "conjunto-propuestas" },
      status: "backlog",
      statusLiteral: "Backlog",
      brand: { slug: "butech", line: null, literal: "Butech" },
      market: "ES",
      marketLiteral: "ES",
      month: { year: 2026, month: 7, yearSource: "calendar", literal: "07 Julio" },
      publicationDate: null,
      theme: "Inspiración estival - 1",
      slotLiteral: "Cerramientos",
      typeLiteral: "",
      proposals: [
        { id: "ed-pr-" + "5".repeat(16), slotId: "ed-sl-" + "4".repeat(16), ordinal: 1, subtheme: "Cerramientos", keyword: "gres 20 mm", searchVolume: null, titles: ["Exteriores"], angle: "A", format: "rework", formatLiteral: "rework", type: "migrar", typeLiteral: "Migrar", url: "https://example.com", selected: null },
        { id: "ed-pr-" + "6".repeat(16), slotId: "ed-sl-" + "4".repeat(16), ordinal: 2, subtheme: "Cerramientos", keyword: "suelo tecnico", searchVolume: null, titles: ["Suelo técnico"], angle: "B", format: "nuevo", formatLiteral: "nuevo", type: "nuevo", typeLiteral: "Nuevo", url: null, selected: null },
      ],
      selectedProposalId: null,
      warnings: [],
    };
    const lines = slotsToCsv([slot]).split("\n");
    expect(lines[0]!.split(";")).toHaveLength(5 + 2 * 6);
    expect(lines[1]).toBe("07 Julio;Butech;ES;Inspiración estival - 1;Cerramientos;Reutilizar;Migrar;Exteriores;gres 20 mm;https://example.com;A;Nuevo;Nuevo;Suelo técnico;suelo tecnico;;B");
    expect(filterSlots([slot], { q: "tecnico" })).toHaveLength(1);
    expect(filterSlots([slot], { brand: "noken" })).toHaveLength(0);
  });
});

describe("calendario", () => {
  const event = (day: number, brand: string, id: string): EditorialCalendarEvent => ({
    id,
    provenance: { ...provenance(0), source: "calendario-2026" },
    date: `2026-07-${String(day).padStart(2, "0")}`,
    year: 2026,
    month: 7,
    day,
    typeLiteral: "POST",
    brand: { slug: null, line: null, literal: brand },
    sequence: null,
    label: `POST ${brand}`,
    pieceId: null,
  });
  const events = [event(2, "Ecommerce", "ed-ev-" + "7".repeat(16)), event(9, "Porcelanosa", "ed-ev-" + "8".repeat(16)), event(9, "Noken", "ed-ev-" + "9".repeat(16))];

  it("construye la rejilla con semana en lunes y agrupa eventos por día", () => {
    const cells = buildMonthCells(2026, 7, events);
    expect(cells.length % 7).toBe(0);
    expect(cells.slice(0, 2).every((cell) => cell.day === null)).toBe(true);
    expect(cells[2]!.day).toBe(1);
    expect(cells.find((cell) => cell.day === 9)!.events.map((item) => item.brand.literal)).toEqual(["Noken", "Porcelanosa"]);
    expect(cells.filter((cell) => cell.day !== null)).toHaveLength(31);
  });

  it("genera la agenda cronológica", () => {
    const agenda = buildAgenda(events);
    expect(agenda.map((day) => day.date)).toEqual(["2026-07-02", "2026-07-09"]);
    expect(agenda[1]!.events).toHaveLength(2);
  });
});

describe("actividad editorial por marca (P2.2)", () => {
  const summary = (slug: EditorialBrandSlug, counts: { calendarEvents?: number; backlogPieces?: number; planPieces?: number; slots?: number } = {}) => ({
    slug,
    name: slug,
    code: slug.slice(0, 4).toUpperCase(),
    pilot: slug === "porcelanosa" || slug === "noken",
    calendarEvents: counts.calendarEvents ?? 0,
    backlogPieces: counts.backlogPieces ?? 0,
    planPieces: counts.planPieces ?? 0,
    slots: counts.slots ?? 0,
  });

  const dataset = {
    brands: [summary("porcelanosa", { calendarEvents: 5, planPieces: 3 }), summary("krion", { backlogPieces: 2 })],
    backlog: [
      piece({ id: "ed-bk-0000000000000001", brand: { slug: "krion", line: null, literal: "Krion" }, status: "redactando" }),
      piece({ id: "ed-bk-0000000000000002", brand: { slug: "krion", line: null, literal: "Krion" }, status: "revision" }),
    ],
    plan: [
      piece({ id: "ed-pl-0000000000000001", kind: "plan", brand: { slug: "porcelanosa", line: null, literal: "Porcelanosa" }, status: "publicado" }),
      piece({ id: "ed-pl-0000000000000002", kind: "plan", brand: { slug: "porcelanosa", line: null, literal: "Porcelanosa" }, status: "programado" }),
      piece({ id: "ed-pl-0000000000000003", kind: "plan", brand: { slug: "porcelanosa", line: null, literal: "Porcelanosa" }, status: "publicado" }),
    ],
  };

  it("cuenta el plan y los estados en curso por marca, incluidas las que no son piloto", () => {
    const activity = brandEditorialActivity(dataset);
    expect(activity.porcelanosa).toMatchObject({ calendarEvents: 5, planPieces: 3, published: 2, scheduled: 1, inProgress: 0 });
    expect(activity.krion).toMatchObject({ backlogPieces: 2, published: 0, scheduled: 0, inProgress: 2 });
  });

  it("solo devuelve las marcas declaradas en el dataset", () => {
    expect(Object.keys(brandEditorialActivity(dataset))).toEqual(["porcelanosa", "krion"]);
  });
});
