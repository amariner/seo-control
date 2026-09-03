import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { editorialDatasetSchema } from "@seo/contracts";
import { V1_SOURCE_FILES } from "./import";
import {
  V1_EXPECTED_COUNTS,
  V1_EXPECTED_PROPOSALS,
  normalizeBrand,
  normalizeBriefText,
  normalizeDate,
  normalizeEditorialSources,
  normalizeMonth,
  normalizePieceType,
  normalizeStatus,
  type RawSource,
} from "./normalize";

const sha256 = (input: string) => createHash("sha256").update(input, "utf8").digest("hex");
const importedAt = "2026-09-02T14:00:00.000Z";
const archiveDir = resolve(import.meta.dirname, "../data/archive/v1");
const hasArchive = Object.values(V1_SOURCE_FILES).every((file) => existsSync(resolve(archiveDir, file)));

function loadArchive(): RawSource[] {
  return (Object.entries(V1_SOURCE_FILES) as Array<[RawSource["key"], string]>).map(([key, fileName]) => ({ key, fileName, text: readFileSync(resolve(archiveDir, fileName), "utf8") }));
}

describe("normalización de campos V1", () => {
  it("resuelve alias de marca conservando el literal y la línea", () => {
    expect(normalizeBrand("Porcelanosa - Trendbook")).toEqual({ slug: "porcelanosa", line: "Trendbook", literal: "Porcelanosa - Trendbook" });
    expect(normalizeBrand("Porcelanosa - Categorías")).toEqual({ slug: "porcelanosa", line: "Categorías", literal: "Porcelanosa - Categorías" });
    expect(normalizeBrand("Xtone")).toEqual({ slug: "xtone", line: null, literal: "Xtone" });
    expect(normalizeBrand("Antic Colonial").slug).toBe("antic-colonial");
    expect(normalizeBrand("L'Antic Colonial").slug).toBe("antic-colonial");
    expect(normalizeBrand("Marca desconocida")).toEqual({ slug: null, line: null, literal: "Marca desconocida" });
    expect(normalizeBrand("")).toEqual({ slug: null, line: null, literal: "" });
  });

  it("normaliza estados y tipos sin perder el literal", () => {
    expect(normalizeStatus("Backlog")).toBe("backlog");
    expect(normalizeStatus("Aceptado")).toBe("aceptado");
    expect(normalizeStatus("Redactando")).toBe("redactando");
    expect(normalizeStatus("")).toBe("desconocido");
    expect(normalizePieceType("Reedición")).toBe("reedicion");
    expect(normalizePieceType("Migrar y reeditar")).toBe("migrar_y_reeditar");
    expect(normalizePieceType("Importar de Trendbook")).toBe("importar_trendbook");
    expect(normalizePieceType("Refrescar (store)")).toBe("refrescar_store");
    expect(normalizePieceType("Auto (GSC)")).toBe("auto_gsc");
    expect(normalizePieceType("")).toBe("sin_tipo");
  });

  it("interpreta los tres formatos de fecha presentes en V1 y avisa de los no estándar", () => {
    const warnings: string[] = [];
    expect(normalizeDate("03/07/2026", warnings, "f")).toBe("2026-07-03");
    expect(normalizeDate("2026-09-10", warnings, "f")).toBe("2026-09-10");
    expect(warnings).toHaveLength(0);
    expect(normalizeDate("6/18/2026", warnings, "f")).toBe("2026-06-18");
    expect(warnings[0]).toContain("m/d/aaaa");
    expect(normalizeDate("6/12/2026", warnings, "f")).toBe("2026-12-06");
    expect(normalizeDate("31/02/2026", warnings, "f")).toBeNull();
    expect(normalizeDate("mañana", warnings, "f")).toBeNull();
    expect(normalizeDate("", warnings, "f")).toBeNull();
  });

  it("deriva mes y año del literal o de la fecha real", () => {
    expect(normalizeMonth("07 Julio", [null], 2026)).toEqual({ year: 2026, month: 7, yearSource: "calendar", literal: "07 Julio" });
    expect(normalizeMonth("Septiembre 2027", [null], 2026)).toEqual({ year: 2027, month: 9, yearSource: "estimate", literal: "Septiembre 2027" });
    expect(normalizeMonth("07 Julio", ["2026-08-13"], 2026)).toEqual({ year: 2026, month: 8, yearSource: "date", literal: "07 Julio" });
    expect(normalizeMonth("", [null], 2026)).toEqual({ year: null, month: null, yearSource: "none", literal: "" });
  });

  it("normaliza el brief sin perder contenido", () => {
    const text = "Línea 1  \r\n\r\n\r\n\r\nLínea 2\t\n";
    expect(normalizeBriefText(text)).toBe("Línea 1\n\nLínea 2");
  });
});

describe("dataset sintético", () => {
  const calendar = JSON.stringify({ months: [{ year: 2027, month: 1, events: [{ type: "POST", brand: "Noken", num: "", label: "POST NOKEN", day: 12 }, { type: "POST", brand: "Krion", num: "1", label: "POST KRION", day: 40 }] }], themes: [{ month: 1, mesNombre: "Enero", tematica: "Arranque", subtemas: ["A", "B"] }] });
  const row = { estado: "Backlog", fechaRedaccion: "", fechaPublicacion: "", tipo: "Nuevo", marca: "Noken", pais: "ES", mesEstimado: "01 Enero", tematica: "Arranque", subtematica: "A", keywordPrincipal: "kw", titulo: "Título", url: "", notas: "BRIEF" };
  const sources: RawSource[] = [
    { key: "calendario-2026", fileName: "c.json", text: calendar },
    { key: "conjunto-backlog", fileName: "b.json", text: JSON.stringify([row, row, { ...row, marca: "", titulo: "", keywordPrincipal: "", notas: "", url: "" }]) },
    { key: "conjunto", fileName: "p.json", text: JSON.stringify([{ ...row, pais: "UK", fechaPublicacion: "6/18/2027" }]) },
    { key: "conjunto-propuestas", fileName: "s.json", text: JSON.stringify([{ estado: "Backlog", fechaPublicacion: "", marca: "Butech", slot: "Hueco", pais: "ES", mesEstimado: "01 Enero", tematica: "Arranque", tipo: "", propuestas: [{ subtema: "Hueco", keywordPrincipal: "a", searchVolume: 10, titulos: ["T1"], angulo: "x", formato: "rework", tipo: "Migrar", url: "https://example.com" }, { subtema: "Hueco", keywordPrincipal: "b", searchVolume: null, titulos: ["T2"], angulo: "y", formato: "nuevo", tipo: "Nuevo", url: "" }, { subtema: "Hueco", keywordPrincipal: "c", searchVolume: null, titulos: [], angulo: "", formato: "raro", tipo: "", url: "no-es-url" }] }]) },
  ];
  const expectedCounts = { "calendario-2026": 1, "conjunto-backlog": 2, conjunto: 1, "conjunto-propuestas": 1 } as const;

  it("rechaza filas vacías y eventos imposibles, informa colisiones y mantiene fuentes separadas", () => {
    const dataset = normalizeEditorialSources(sources, { sha256, importedAt, expectedCounts });
    expect(dataset.planningYear).toBe(2027);
    expect(dataset.calendar.events).toHaveLength(1);
    expect(dataset.report.rejections.map((item) => item.source)).toEqual(["calendario-2026", "conjunto-backlog"]);
    expect(dataset.backlog).toHaveLength(2);
    expect(dataset.backlog[0]!.id).not.toBe(dataset.backlog[1]!.id);
    expect(dataset.backlog[1]!.provenance.identityOrdinal).toBe(2);
    expect(dataset.report.identityCollisions).toBe(1);
    expect(dataset.plan).toHaveLength(1);
    expect(dataset.plan[0]!.publicationDate).toBe("2027-06-18");
    expect(dataset.plan[0]!.month).toMatchObject({ month: 6, yearSource: "date" });
    expect(dataset.plan[0]!.language).toBe("en");
    expect(dataset.slots[0]!.proposals).toHaveLength(3);
    expect(dataset.slots[0]!.proposals[2]!.format).toBe("otro");
    expect(dataset.slots[0]!.warnings.some((warning) => warning.includes("formato desconocido"))).toBe(true);
    expect(dataset.slots[0]!.warnings.some((warning) => warning.includes("URL absoluta"))).toBe(true);
    expect(dataset.report.archives.map((archive) => archive.status)).toEqual(["rejections", "rejections", "ok", "ok"]);
    expect(dataset.brands).toHaveLength(8);
    expect(dataset.report.brandsWithoutEvents).toContain("porcelanosa");
    expect(dataset.report.warnings.some((warning) => warning.includes("se esperaban 68"))).toBe(true);
    expect(editorialDatasetSchema.safeParse(dataset).success).toBe(true);
  });

  it("produce IDs deterministas independientes del instante de importación", () => {
    const first = normalizeEditorialSources(sources, { sha256, importedAt, expectedCounts });
    const second = normalizeEditorialSources(sources, { sha256, importedAt: "2030-01-01T00:00:00.000Z", expectedCounts });
    expect(first.backlog.map((piece) => piece.id)).toEqual(second.backlog.map((piece) => piece.id));
    expect(first.calendar.events.map((event) => event.id)).toEqual(second.calendar.events.map((event) => event.id));
    expect(first.slots.flatMap((slot) => slot.proposals.map((proposal) => proposal.id))).toEqual(second.slots.flatMap((slot) => slot.proposals.map((proposal) => proposal.id)));
    expect(first.report.inputFingerprint).toBe(second.report.inputFingerprint);
  });

  it("genera el dataset aunque falte una fuente y lo indica", () => {
    const dataset = normalizeEditorialSources(sources.slice(0, 2), { sha256, importedAt, expectedCounts });
    expect(dataset.plan).toEqual([]);
    expect(dataset.slots).toEqual([]);
    expect(dataset.report.warnings.filter((warning) => warning.startsWith("Falta la fuente"))).toHaveLength(2);
  });
});

describe.skipIf(!hasArchive)("snapshots V1 archivados (D-006)", () => {
  const dataset = hasArchive ? normalizeEditorialSources(loadArchive(), { sha256, importedAt }) : null;

  it("importa exactamente 39 eventos, 115 filas de backlog, 146 filas de plan, 34 huecos y 68 propuestas", () => {
    expect(dataset!.calendar.events).toHaveLength(V1_EXPECTED_COUNTS["calendario-2026"]);
    expect(dataset!.backlog).toHaveLength(V1_EXPECTED_COUNTS["conjunto-backlog"]);
    expect(dataset!.plan).toHaveLength(V1_EXPECTED_COUNTS.conjunto);
    expect(dataset!.slots).toHaveLength(V1_EXPECTED_COUNTS["conjunto-propuestas"]);
    expect(dataset!.slots.reduce((total, slot) => total + slot.proposals.length, 0)).toBe(V1_EXPECTED_PROPOSALS);
    expect(dataset!.slots.every((slot) => slot.proposals.length === 2)).toBe(true);
    expect(dataset!.report.rejections).toEqual([]);
    expect(dataset!.report.archives.every((archive) => archive.status === "ok")).toBe(true);
    expect(dataset!.calendar.themes).toHaveLength(6);
  });

  it("registra las ocho marcas y detecta que Krion no tiene eventos", () => {
    expect(dataset!.brands.map((brand) => brand.slug)).toHaveLength(8);
    expect(dataset!.report.brandsWithoutEvents).toEqual(["krion"]);
    const events = Object.fromEntries(dataset!.brands.map((brand) => [brand.slug, brand.calendarEvents]));
    expect(events).toMatchObject({ ecommerce: 3, xtone: 4, porcelanosa: 11, noken: 6, gamadecor: 5, butech: 6, "antic-colonial": 4, krion: 0 });
  });

  it("resuelve todos los alias de marca y conserva la línea de Porcelanosa", () => {
    expect(dataset!.report.brandAliases.every((alias) => alias.slug !== null)).toBe(true);
    const lines = dataset!.report.brandAliases.filter((alias) => alias.slug === "porcelanosa").map((alias) => alias.line);
    expect(lines).toEqual(expect.arrayContaining(["Trendbook", "Categorías", null]));
    expect(dataset!.backlog.every((piece) => piece.brand.slug !== null)).toBe(true);
  });

  it("conserva los briefs íntegros con hash y longitud normalizada", () => {
    expect(dataset!.report.briefs["conjunto-backlog"]!.totalChars).toBe(288635);
    expect(dataset!.report.briefs["conjunto"]!.totalChars).toBe(281433);
    for (const piece of [...dataset!.backlog, ...dataset!.plan]) {
      if (!piece.brief) continue;
      expect(piece.brief.sha256).toBe(sha256(normalizeBriefText(piece.brief.text)));
      expect(piece.brief.normalizedLength).toBe(normalizeBriefText(piece.brief.text).length);
    }
  });

  it("no genera IDs duplicados en ninguna colección", () => {
    const ids = [...dataset!.backlog, ...dataset!.plan, ...dataset!.calendar.events, ...dataset!.slots, ...dataset!.slots.flatMap((slot) => slot.proposals)].map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("refleja las discrepancias conocidas de V1 en el informe", () => {
    expect(dataset!.report.emptyFields["conjunto-backlog"]).toMatchObject({ fechaRedaccion: 95, fechaPublicacion: 96, url: 75 });
    expect(dataset!.report.emptyFields["conjunto"]).toMatchObject({ fechaRedaccion: 144, fechaPublicacion: 108, url: 48 });
    expect(dataset!.report.warnings.some((warning) => warning.includes('"slot" no es único'))).toBe(true);
    expect(dataset!.plan.filter((piece) => piece.warnings.some((warning) => warning.includes("m/d/aaaa"))).length).toBeGreaterThan(0);
  });
});
