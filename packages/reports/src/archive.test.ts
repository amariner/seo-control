import { describe, expect, it } from "vitest";
import { BRAND_REPORT_VERSION } from "@seo/contracts";
import { buildFrozenArchive, parseFrozenArchiveFilters } from "./archive";
import {
  csvCell,
  deckCsvRows,
  exportFilenameOf,
  stampLines,
  toCsv,
} from "./export";
import type { DeckSlide } from "./project-report";
import type { PublishedReports } from "./schema";

const snapshot = (
  brand: string,
  period: string,
  reportVersion = BRAND_REPORT_VERSION,
) => ({
  reportVersion,
  generatedAt: "2026-09-29T11:00:00.000Z",
  generatedBy: "Equipo SEO",
  cutoff: "2026-09-26",
  file: `snapshots/${brand}/${period}.json`,
  sha256: "cda52565cbc32f8863b3bafd30d754f845089ccf3680b1ae5af9a447e5d2c3b5",
});

const published: PublishedReports = {
  schemaVersion: 1,
  updatedAt: "2026-09-29T11:36:50.091Z",
  reports: {
    "xtone:2026-Q2": { snapshot: snapshot("xtone", "2026-Q2") },
    "porcelanosa:2026-Q2": {
      snapshot: snapshot("porcelanosa", "2026-Q2", "2026-01-01.1"),
      curation: {
        slides: {
          paginas: { hidden: true },
          resumen: { note: "Leer con la migración" },
        },
        actions: [
          { priority: "alta", title: "Revisar redirecciones /pt", why: "" },
        ],
        updatedAt: "2026-09-29T12:00:00.000Z",
        updatedBy: "Equipo SEO",
      },
    },
    "noken:2026-08": { snapshot: snapshot("noken", "2026-08") },
    "noken:2025-Q4": { snapshot: snapshot("noken", "2025-Q4") },
    // Solo puntualizaciones: se aplican al informe en vivo, pero no son archivo.
    "krion:2026-Q2": {
      curation: {
        slides: {},
        actions: [],
        updatedAt: "2026-09-29",
        updatedBy: "Equipo SEO",
      },
    },
  },
};

describe("archivo de informes congelados (H11)", () => {
  it("lista solo versiones congeladas, del periodo más reciente al más antiguo y por marca canónica", () => {
    const archive = buildFrozenArchive(published, {
      brand: "all",
      kind: "all",
      year: "all",
    });
    expect(archive.entries.map((entry) => entry.id)).toEqual([
      "noken:2026-08",
      "porcelanosa:2026-Q2",
      "xtone:2026-Q2",
      "noken:2025-Q4",
    ]);
    expect(archive.total).toBe(4);
    expect(archive.brands).toEqual(["porcelanosa", "noken", "xtone"]);
    expect(archive.years).toEqual(["2026", "2025"]);
  });

  it("marca el contrato antiguo y resume las puntualizaciones", () => {
    const archive = buildFrozenArchive(published, {
      brand: "porcelanosa",
      kind: "all",
      year: "all",
    });
    expect(archive.entries).toHaveLength(1);
    expect(archive.entries[0]).toMatchObject({
      brandName: "Porcelanosa",
      stale: true,
      curation: { hiddenSlides: 1, notes: 1, actions: 1, count: 3 },
    });
    expect(
      buildFrozenArchive(published, {
        brand: "xtone",
        kind: "all",
        year: "all",
      }).entries[0],
    ).toMatchObject({ stale: false, curation: null });
  });

  it("filtra por tipo de periodo y año, y descarta filtros desconocidos", () => {
    expect(
      buildFrozenArchive(published, {
        brand: "all",
        kind: "month",
        year: "all",
      }).entries.map((e) => e.id),
    ).toEqual(["noken:2026-08"]);
    expect(
      buildFrozenArchive(published, {
        brand: "all",
        kind: "quarter",
        year: "2025",
      }).entries.map((e) => e.id),
    ).toEqual(["noken:2025-Q4"]);
    expect(
      parseFrozenArchiveFilters({
        marca: "desconocida",
        periodo: "semana",
        anio: "20x6",
      }),
    ).toEqual({ brand: "all", kind: "all", year: "all" });
    expect(
      parseFrozenArchiveFilters({
        marca: "noken",
        periodo: "quarter",
        anio: "2026",
      }),
    ).toEqual({ brand: "noken", kind: "quarter", year: "2026" });
  });
});

describe("exportación de un informe congelado (H11)", () => {
  const entry = buildFrozenArchive(published, {
    brand: "xtone",
    kind: "all",
    year: "all",
  }).entries[0]!;
  const stamp = {
    actor: "equipo@porcelanosa.com",
    exportedAt: "2026-09-29T15:00:00.000Z",
    entry,
  };
  const slides: DeckSlide[] = [
    {
      id: "resumen",
      title: "Resumen",
      source: "Search Console",
      note: "",
      metrics: [
        {
          label: "Clics",
          value: "12.345",
          change: {
            text: "+12,3 %",
            tone: "good",
            against: "trimestre anterior",
          },
        },
      ],
      lists: [
        {
          title: "Top keywords",
          head: ["Keyword", "Clics"],
          rows: [["=HYPERLINK(1)", "10"]],
        },
        { title: "Vacía", head: ["A"], rows: [], empty: "Sin datos" },
      ],
    },
  ];

  it("nombra el fichero con marca, periodo y huella corta", () => {
    expect(exportFilenameOf(entry, "html")).toBe(
      "informe-seo-xtone-2026-Q2-cda52565.html",
    );
  });

  it("sella usuario, fecha, versión, corte, huella y confidencialidad", () => {
    const labels = stampLines(stamp).map(([label]) => label);
    expect(labels).toEqual([
      "Confidencialidad",
      "Informe",
      "Exportado por",
      "Exportado el",
      "Versión congelada",
      "Corte del dato",
      "Contrato del informe",
      "Huella SHA-256",
    ]);
    expect(stampLines(stamp)[1]![1]).toBe("XTONE · 2.º trimestre 2026");
  });

  it("vuelca cifras y tablas y neutraliza fórmulas sin tocar las cifras con signo", () => {
    const rows = deckCsvRows(slides, stamp);
    expect(rows).toContainEqual([
      "Resumen",
      "cifra",
      "",
      "Clics",
      "12.345",
      "+12,3 %",
      "",
    ]);
    expect(rows).toContainEqual(["Resumen", "tabla", "Vacía", "Sin datos"]);
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell("+12,3 %")).toBe('"+12,3 %"');
    expect(csvCell("+12 %")).toBe("+12 %");
    expect(csvCell("-cmd")).toBe("'-cmd");
    expect(csvCell('dice "hola", sí')).toBe('"dice ""hola"", sí"');
    expect(toCsv(rows).startsWith("﻿Confidencialidad,")).toBe(true);
  });
});
