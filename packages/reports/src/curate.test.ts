import { describe, expect, it } from "vitest";
import { applyCuration, curationCount, rowKeyFor } from "./curate";
import type { DeckSlide } from "./project-report";
import type { ReportCuration } from "./schema";

const slides: DeckSlide[] = [
  {
    id: "ejecutivo",
    title: "Resumen ejecutivo",
    source: "",
    note: "",
    points: [
      { label: "Keywords", text: "a", tone: "good" },
      { label: "Migración", text: "b", tone: "bad" },
    ],
    metrics: [],
    lists: [{ title: "Prioridades", head: ["Prioridad", "Acción"], rows: [["Alta", "Corregir"], ["Media", "Publicar"]], tones: ["bad", "neutral"], toneColumn: 0 }],
  },
  {
    id: "keywords",
    title: "Keywords",
    source: "",
    note: "",
    reading: "lectura",
    metrics: [{ label: "Clics", value: "10" }, { label: "Top 3", value: "2" }],
    lists: [{ title: "En tendencia", head: ["Keyword", "Clics"], rows: [["azulejo", "5"], ["baño", "3"]] }],
    bars: { title: "Mes a mes", metric: "Clics", months: [] },
  },
  { id: "migracion", title: "Migración", source: "", note: "", metrics: [], lists: [] },
];

const curation: ReportCuration = {
  slides: {
    migracion: { hidden: true },
    keywords: { note: "Ojo con la estacionalidad", hideReading: true, hiddenMetrics: ["Top 3"], hiddenRows: [rowKeyFor({ title: "En tendencia" }, ["baño", "3"])], hiddenLists: ["__bars"] },
    ejecutivo: { hiddenRows: [rowKeyFor({ title: "Prioridades", toneColumn: 0 }, ["Media", "Publicar"])] },
  },
  actions: [],
  updatedAt: "2026-09-29T00:00:00Z",
  updatedBy: "test",
};

describe("puntualizaciones (D-076)", () => {
  it("oculta apartados, cifras, lecturas, gráficos y filas y añade la nota", () => {
    const out = applyCuration(slides, curation);
    expect(out.map((slide) => slide.id)).toEqual(["ejecutivo", "keywords"]);
    const keywords = out[1]!;
    expect(keywords.comment).toBe("Ojo con la estacionalidad");
    expect(keywords.reading).toBeUndefined();
    expect(keywords.metrics.map((metric) => metric.label)).toEqual(["Clics"]);
    expect(keywords.lists[0]!.rows).toEqual([["azulejo", "5"]]);
    expect(keywords.bars).toBeUndefined();
  });

  it("quita del resumen ejecutivo la idea clave de un apartado oculto y filtra filas por la acción", () => {
    const [executive] = applyCuration(slides, curation);
    expect(executive!.points!.map((point) => point.label)).toEqual(["Keywords"]);
    expect(executive!.lists[0]!.rows).toEqual([["Alta", "Corregir"]]);
    expect(executive!.lists[0]!.tones).toEqual(["bad"]);
  });

  it("no toca nada sin puntualizaciones y las cuenta", () => {
    expect(applyCuration(slides, undefined)).toBe(slides);
    expect(curationCount(curation)).toBe(7);
    expect(curationCount(undefined)).toBe(0);
  });
});
