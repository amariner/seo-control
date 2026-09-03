import { describe, expect, it } from "vitest";
import { piecesToCsv } from "@seo/editorial";
import nextConfig from "../next.config";
import { getEditorial, hrefWith, parseBrand, parseSort, queryCalendar, queryPieces, querySlots } from "./editorial";

/**
 * Pruebas de la capa editorial del visor: compatibilidad de rutas V1,
 * equivalencia entre la vista y el CSV, y filtros compartibles por URL.
 */

describe("compatibilidad de rutas V1", () => {
  it("redirige la ruta histórica del plan editorial a la ruta canónica", async () => {
    const redirects = await nextConfig.redirects!();
    const legacy = redirects.find((redirect) => redirect.source === "/conjunto/plan-editorial");
    expect(legacy).toBeDefined();
    expect(legacy!.destination).toBe("/editorial/calendario");
    expect(legacy!.permanent).toBe(true);
  });

  it("mantiene un alias no permanente desde /editorial", async () => {
    const redirects = await nextConfig.redirects!();
    const alias = redirects.find((redirect) => redirect.source === "/editorial");
    expect(alias?.destination).toBe("/editorial/calendario");
    expect(alias?.permanent).toBe(false);
  });
});

describe("dataset servido por el visor", () => {
  const dataset = getEditorial();

  it("expone los recuentos de control de la importación V1", () => {
    expect(dataset.calendar.events).toHaveLength(39);
    expect(dataset.backlog).toHaveLength(115);
    expect(dataset.plan).toHaveLength(146);
    expect(dataset.slots).toHaveLength(34);
    expect(dataset.slots.reduce((total, slot) => total + slot.proposals.length, 0)).toBe(68);
    expect(dataset.brands).toHaveLength(8);
    expect(dataset.mode).toBe("v1-import");
  });

  it("conserva los briefs completos con su hash", () => {
    const withBrief = dataset.backlog.filter((piece) => piece.brief);
    expect(withBrief).toHaveLength(115);
    expect(withBrief.every((piece) => piece.brief!.sha256.length === 64)).toBe(true);
    expect(withBrief.reduce((total, piece) => total + piece.brief!.text.length, 0)).toBe(288635);
  });
});

describe("filtros compartibles y CSV", () => {
  it("separa backlog y plan como fuentes distintas", () => {
    expect(queryPieces({ kind: "backlog" }).items).toHaveLength(115);
    expect(queryPieces({ kind: "plan" }).items).toHaveLength(146);
    expect(queryPieces({}).items).toHaveLength(261);
  });

  it("aplica marca, mercado y búsqueda sin acentos", () => {
    const noken = queryPieces({ kind: "backlog", brand: "noken" });
    expect(noken.items).toHaveLength(17);
    expect(noken.items.every((piece) => piece.brand.slug === "noken")).toBe(true);
    expect(queryPieces({ kind: "backlog", market: "UK" }).items).toHaveLength(9);
    const accentless = queryPieces({ kind: "backlog", q: "porcelanico" });
    expect(accentless.items.length).toBeGreaterThan(0);
  });

  it("ignora valores de filtro inválidos en lugar de fallar", () => {
    expect(parseBrand({ brand: "marca-inexistente" })).toBe("all");
    expect(parseSort({ sort: "columna-falsa", dir: "raro" })).toEqual({ sort: "month", dir: "asc" });
    expect(queryPieces({ month: "99" }).items).toHaveLength(261);
  });

  it("exporta exactamente las filas visibles, en el mismo orden", () => {
    const view = queryPieces({ kind: "backlog", brand: "noken", sort: "title", dir: "desc" });
    const csv = piecesToCsv(view.items);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    // Los briefs contienen saltos de línea, así que un registro ocupa varias
    // líneas físicas: se cuentan registros respetando el entrecomillado.
    const records = splitCsvRecords(csv.slice(1));
    expect(records).toHaveLength(view.items.length + 1);
    expect(records[0]).toEqual(["Estado", "Tipo", "Marca", "País", "Mes", "Temática", "Subtema", "Keyword principal", "Título", "URL", "Notas"]);
    expect(records.every((record) => record.length === 11)).toBe(true);
    expect(records.slice(1).map((record) => record[8])).toEqual(view.items.map((piece) => piece.title ?? ""));
    expect(records.slice(1).map((record) => record[10])).toEqual(view.items.map((piece) => piece.brief?.text ?? ""));
  });

  it("conserva los parámetros al construir enlaces y elimina los neutros", () => {
    expect(hrefWith("/editorial/backlog", { kind: "backlog", q: "spa" }, { brand: "noken" })).toBe("/editorial/backlog?kind=backlog&q=spa&brand=noken");
    expect(hrefWith("/editorial/backlog", { kind: "backlog", brand: "noken" }, { brand: "all" })).toBe("/editorial/backlog?kind=backlog");
    expect(hrefWith("/editorial/calendario", {}, {})).toBe("/editorial/calendario");
  });
});

describe("calendario", () => {
  it("deriva el año del dataset y no lo fija en código", () => {
    const calendar = queryCalendar({});
    expect(calendar.years).toEqual([2026]);
    expect(calendar.year).toBe(2026);
    expect(calendar.months.map((month) => month.month)).toEqual([7, 8, 9, 10, 11, 12]);
    expect(calendar.view).toBe("year");
  });

  it("cambia a vista mensual cuando se indica un mes válido", () => {
    expect(queryCalendar({ view: "month", month: "9" }).month).toBe(9);
    expect(queryCalendar({ month: "99" }).view).toBe("year");
  });

  it("filtra eventos por marca conservando las ocho marcas en el resumen", () => {
    const filtered = queryCalendar({ brand: "porcelanosa" });
    expect(filtered.events).toHaveLength(11);
    expect(filtered.dataset.brands).toHaveLength(8);
    expect(filtered.dataset.brands.find((brand) => brand.slug === "krion")?.calendarEvents).toBe(0);
  });
});

describe("propuestas", () => {
  it("mantiene los huecos con sus alternativas y sin selección previa", () => {
    const slots = querySlots({});
    expect(slots.items).toHaveLength(34);
    expect(slots.items.every((slot) => slot.selectedProposalId === null)).toBe(true);
    expect(slots.items.every((slot) => slot.proposals.every((proposal) => proposal.selected === null))).toBe(true);
  });

  it("filtra huecos por marca y mes", () => {
    expect(querySlots({ brand: "butech" }).items).toHaveLength(6);
    expect(querySlots({ month: "7" }).items).toHaveLength(6);
  });
});

/** Divide un CSV con separador `;` en registros, respetando comillas y saltos internos. */
function splitCsvRecords(csv: string) {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (quoted) {
      if (char === '"' && csv[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ";") { record.push(field); field = ""; }
    else if (char === "\n") { record.push(field); records.push(record); record = []; field = ""; }
    else field += char;
  }
  if (field.length || record.length) { record.push(field); records.push(record); }
  return records;
}
