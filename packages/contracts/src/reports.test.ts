import { describe, expect, it } from "vitest";
import { getMockReportArchive } from "./mock";
import {
  REPORT_CHAPTERS,
  buildReportArchive,
  latestVersion,
  parseReportFilters,
  reportFilterQuery,
  type ReportFilters,
} from "./reports";

const allFilters: ReportFilters = { project: "all", type: "all", status: "all", year: "all" };

describe("catálogo de capítulos fusionado de los dos informes de V1", () => {
  it("absorbe las 19 secciones reales de V1 en 16 capítulos", () => {
    expect(REPORT_CHAPTERS).toHaveLength(16);
    const sections = REPORT_CHAPTERS.flatMap((chapter) => chapter.v1Sections);
    expect(sections).toHaveLength(19);
    expect(new Set(sections).size).toBe(19);
  });

  it("cada capítulo declara de qué informe de V1 viene", () => {
    for (const chapter of REPORT_CHAPTERS) {
      expect(chapter.v1Reports.length, `${chapter.key} sin origen V1`).toBeGreaterThan(0);
      expect(chapter.v1Sections.length).toBe(chapter.v1Sections.length);
    }
    const merged = REPORT_CHAPTERS.filter((chapter) => chapter.v1Reports.length === 2);
    expect(merged.map((chapter) => chapter.key)).toEqual(["resumen", "salud-tecnica", "proximo-periodo"]);
  });

  it("un capítulo publicado tiene superficie y no tiene hueco; uno pendiente, al contrario", () => {
    for (const chapter of REPORT_CHAPTERS) {
      if (chapter.state === "publicado") {
        expect(chapter.surface, `${chapter.key} publicado sin superficie`).toBeTruthy();
        expect(chapter.gap).toBeNull();
      } else {
        expect(chapter.gap, `${chapter.key} no dice qué le falta`).toBeTruthy();
      }
      if (chapter.state === "pendiente") expect(chapter.surface).toBeNull();
      if (chapter.state === "parcial") expect(chapter.surface).toBeTruthy();
      expect(chapter.phase).toMatch(/^P\d+$/);
    }
  });
});

describe("parseReportFilters y reportFilterQuery", () => {
  it("un valor inválido equivale a «todos» y no rompe el enlace compartido", () => {
    expect(parseReportFilters({ project: "inventado", type: "raro", status: "?", year: "hola" })).toEqual(allFilters);
    expect(parseReportFilters({})).toEqual(allFilters);
  });

  it("lee los filtros válidos, incluido el año como número", () => {
    expect(parseReportFilters({ project: "noken", type: "trimestral", status: "publicado", year: "2025" })).toEqual({
      project: "noken",
      type: "trimestral",
      status: "publicado",
      year: 2025,
    });
  });

  it("hace ida y vuelta y omite los valores por defecto", () => {
    expect(reportFilterQuery(allFilters)).toBe("");
    const filters: ReportFilters = { project: "porcelanosa", type: "especial", status: "aprobado", year: 2026 };
    const query = reportFilterQuery(filters);
    expect(parseReportFilters(Object.fromEntries(new URLSearchParams(query)))).toEqual(filters);
  });
});

describe("buildReportArchive", () => {
  const archive = getMockReportArchive();

  it("ordena el archivo del cierre más reciente al más antiguo", () => {
    const dates = archive.entries.map((entry) => entry.publishedAt).filter((date): date is string => date !== null);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it("declara cuántos informes tiene el archivo completo, no solo los filtrados", () => {
    const filtered = getMockReportArchive({ ...allFilters, year: 2025 });
    expect(filtered.entries).toHaveLength(1);
    expect(filtered.totalEntries).toBe(archive.totalEntries);
    expect(filtered.years).toEqual(archive.years);
  });

  it("los años del archivo salen de los informes, no de una lista fija", () => {
    expect(archive.years).toEqual([2026, 2025]);
  });

  it("filtra por proyecto, tipo y estado de forma acumulativa", () => {
    expect(getMockReportArchive({ ...allFilters, project: "noken" }).entries.map((entry) => entry.id)).toEqual(["report-noken-q2"]);
    expect(getMockReportArchive({ ...allFilters, type: "trimestral" }).entries).toHaveLength(2);
    expect(getMockReportArchive({ ...allFilters, status: "aprobado" }).entries.map((entry) => entry.id)).toEqual(["report-canonical"]);
    expect(getMockReportArchive({ ...allFilters, project: "noken", type: "mensual" }).entries).toEqual([]);
  });

  it("una versión publicada nunca se reescribe: la corrección es otra versión con su nota", () => {
    const corrected = archive.entries.find((entry) => entry.id === "report-2026-06")!;
    expect(corrected.versions).toHaveLength(2);
    expect(corrected.versions[0]!.changeNote).toBeNull();
    expect(corrected.versions[0]!.publishedAt).toBe("2026-07-02");
    expect(corrected.versions[1]!.changeNote).toContain("Fe de erratas");
    expect(latestVersion(corrected).version).toBe(2);
    expect(latestVersion(corrected).version).toBe(corrected.version);
  });

  it("la versión vigente del informe coincide siempre con el final de su cadena", () => {
    for (const entry of archive.entries) {
      expect(latestVersion(entry).version).toBe(entry.version);
      expect(latestVersion(entry).status).toBe(entry.status);
      expect(latestVersion(entry).publishedAt).toBe(entry.publishedAt);
      const numbers = entry.versions.map((item) => item.version);
      expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
    }
  });

  it("ningún informe declara un capítulo que el producto todavía no sabe rendir", () => {
    const pending = new Set<string>(REPORT_CHAPTERS.filter((chapter) => chapter.state === "pendiente").map((chapter) => chapter.key));
    expect(pending.size).toBeGreaterThan(0);
    for (const entry of archive.entries) {
      expect(entry.chapters.filter((key) => pending.has(key)), `${entry.id} declara un capítulo pendiente`).toEqual([]);
    }
  });

  it("el catálogo dice qué informes cubren cada capítulo y su cobertura cuadra", () => {
    const resumen = archive.chapters.find((chapter) => chapter.key === "resumen")!;
    expect(resumen.reportIds).toHaveLength(archive.totalEntries);
    const geo = archive.chapters.find((chapter) => chapter.key === "geo")!;
    expect(geo.reportIds).toEqual([]);
    const { published, partial, pending, v1Sections } = archive.coverage;
    expect(published + partial + pending).toBe(REPORT_CHAPTERS.length);
    expect(v1Sections).toBe(19);
  });

  it("el catálogo de capítulos no depende del filtro activo", () => {
    expect(getMockReportArchive({ ...allFilters, project: "noken" }).chapters).toEqual(archive.chapters);
  });

  it("es determinista", () => {
    expect(getMockReportArchive()).toEqual(archive);
  });

  it("un archivo vacío sigue siendo un archivo válido con su catálogo", () => {
    const empty = buildReportArchive({ generatedAt: "2026-09-02T08:15:00.000Z", mode: "synthetic", filters: allFilters, entries: [] });
    expect(empty.entries).toEqual([]);
    expect(empty.years).toEqual([]);
    expect(empty.totalEntries).toBe(0);
    expect(empty.chapters).toHaveLength(16);
    expect(empty.chapters.every((chapter) => chapter.reportIds.length === 0)).toBe(true);
  });
});
