import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeEditorialSources, type RawSource } from "./normalize";
import { buildPlanSheetSnapshot, cellText, planSheetCalendar, planSheetRows } from "./plan-sheet";

const sha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");
const importedAt = "2026-09-28T10:00:00.000Z";

const HEADER = ["Estado", "Fecha redacción", "Fecha publicación", "Tipo", "Marca", "Pais", "Mes", "Tematica", "Subtema", "Keyword principal", "Título", "URL (si existe)", "Notas / Brief", null, "_idx"];
const sheet = (...rows: unknown[][]): unknown[][] => [["Plan editorial — SEO + Copywriting"], [], HEADER, ...rows];
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("hoja «Plan editorial» (D-050)", () => {
  it("lee celdas de fecha, fórmula y texto enriquecido", () => {
    expect(cellText(utc(2026, 7, 3))).toBe("2026-07-03");
    expect(cellText({ formula: "A1", result: "Xtone" })).toBe("Xtone");
    expect(cellText({ richText: [{ text: "Suelo " }, { text: "porcelánico" }] })).toBe("Suelo porcelánico");
    expect(cellText(null)).toBe("");
  });

  it("mapea las cabeceras a las trece columnas V1 y convierte el mes", () => {
    const rows = planSheetRows(sheet(["Backlog", null, utc(2026, 7, 14), "Nuevo", "Xtone", "ES", utc(2026, 7, 7), "Inspiración estival - 1", "Hoteles", "diseño hotelero", "Diseño hotelero", null, "BRIEF", null, { formula: "IF()", result: "" }], [], [null, null, null]));
    expect(rows).toEqual([
      { estado: "Backlog", fechaRedaccion: "", fechaPublicacion: "2026-07-14", tipo: "Nuevo", marca: "Xtone", pais: "ES", mesEstimado: "07 Julio", tematica: "Inspiración estival - 1", subtematica: "Hoteles", keywordPrincipal: "diseño hotelero", titulo: "Diseño hotelero", url: "", notas: "BRIEF" },
    ]);
  });

  it("falla con un mensaje claro si falta una columna", () => {
    expect(() => planSheetRows([["Estado", "Marca"]])).toThrow(/Faltan columnas/);
  });

  it("sustituye solo el plan V1 de las marcas activadas", () => {
    const v1Plan = [
      { estado: "Backlog", marca: "Xtone", pais: "ES", mesEstimado: "07 Julio", tipo: "Nuevo", keywordPrincipal: "antigua xtone", titulo: "Antigua Xtone" },
      { estado: "Backlog", marca: "Noken", pais: "ES", mesEstimado: "07 Julio", tipo: "Nuevo", keywordPrincipal: "noken v1", titulo: "Noken V1" },
    ];
    const snapshot = buildPlanSheetSnapshot({
      fileName: "plan.xlsx",
      sha256: "0".repeat(64),
      brands: ["xtone"],
      rows: sheet(
        ["Aceptado", null, null, "Nuevo", "Xtone", "ES", utc(2026, 8, 8), "T", "S", "nueva xtone", "Nueva Xtone", null, "brief"],
        ["Backlog", null, null, "Nuevo", "Noken", "ES", utc(2026, 8, 8), "T", "S", "noken hoja", "Noken hoja", null, "brief"],
      ),
    });
    const sources: RawSource[] = [
      { key: "conjunto", fileName: "conjunto.json", text: JSON.stringify(v1Plan) },
      { key: "plan-sheet", fileName: "plan-sheet.json", text: JSON.stringify(snapshot) },
    ];
    const dataset = normalizeEditorialSources(sources, { sha256, importedAt, expectedCounts: { conjunto: 2 } });
    const titles = dataset.plan.map((piece) => `${piece.provenance.source}:${piece.title}`);
    expect(titles).toEqual(["conjunto:Noken V1", "plan-sheet:Nueva Xtone"]);
    const xtone = dataset.plan.find((piece) => piece.brand.slug === "xtone")!;
    expect(xtone.status).toBe("aceptado");
    expect(xtone.month).toMatchObject({ year: 2026, month: 8 });
    expect(xtone.provenance.sourceIndex).toBe(0);
    expect(dataset.report.archives.find((archive) => archive.key === "plan-sheet")).toMatchObject({ expectedCount: 1, importedCount: 1, status: "ok" });
    expect(dataset.report.warnings).toContain("Plan de xtone tomado de la hoja «plan.xlsx»: 1 piezas; sustituye 1 piezas del plan V1.");
  });

  it("lee los huecos POST/NEWS del calendario con el mes correcto en semanas partidas", () => {
    const events = planSheetCalendar(
      [
        ["Julio"],
        ["Inspiración estival - 1"],
        ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
        [29, 30, 1, 2, 3, 4, 5],
        [null, "POST XTONE", null, { formula: "INDEX()", result: "Xtone - Título" }, null, null, null],
        [27, 28, 29, 30, 31, 1, 2],
        ["NEWS NOKEN                 POST XTONE", "POST GAMADECOR\nNEWS XTONE", null, null, null, "POST PORCE 2", null],
      ],
      2026,
    );
    expect(events).toEqual([
      { year: 2026, month: 6, day: 30, type: "POST", brand: "XTONE", num: null, label: "POST XTONE" },
      { year: 2026, month: 7, day: 27, type: "NEWS", brand: "NOKEN", num: null, label: "NEWS NOKEN" },
      { year: 2026, month: 7, day: 27, type: "POST", brand: "XTONE", num: null, label: "POST XTONE" },
      { year: 2026, month: 7, day: 28, type: "POST", brand: "GAMADECOR", num: null, label: "POST GAMADECOR" },
      { year: 2026, month: 7, day: 28, type: "NEWS", brand: "XTONE", num: null, label: "NEWS XTONE" },
      { year: 2026, month: 8, day: 1, type: "POST", brand: "PORCE", num: "2", label: "POST PORCE 2" },
    ]);
  });
});
