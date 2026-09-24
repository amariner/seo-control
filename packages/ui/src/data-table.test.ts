import { describe, expect, it } from "vitest";
import { compareReportValues, normalizeReportSearch } from "./data-table-model";

describe("búsqueda y orden de las tablas de informe", () => {
  it("encuentra keywords y URLs sin distinguir acentos ni mayúsculas", () => {
    const indexed = normalizeReportSearch(
      "Porcelánico · https://xtone.com/ES/Colección/",
    );
    expect(indexed.includes(normalizeReportSearch("  PORCELANICO "))).toBe(
      true,
    );
    expect(indexed.includes(normalizeReportSearch("/es/coleccion/"))).toBe(
      true,
    );
  });

  it("normaliza de forma equivalente caracteres acentuados compuestos y descompuestos", () => {
    expect(normalizeReportSearch("Colección")).toBe(
      normalizeReportSearch("Coleccio\u0301n"),
    );
  });

  it("ordena cantidades por su valor, incluidos negativos y decimales", () => {
    expect([1200, 90, 9.5, -3, 0].sort(compareReportValues)).toEqual([
      -3, 0, 9.5, 90, 1200,
    ]);
  });

  it("mantiene un orden natural en nombres y URLs con números", () => {
    expect(
      ["/coleccion/10", "/coleccion/2", "/coleccion/1"].sort(
        compareReportValues,
      ),
    ).toEqual(["/coleccion/1", "/coleccion/2", "/coleccion/10"]);
    expect(compareReportValues("Álamo", "alamo")).toBe(0);
  });
});
