import { describe, expect, it } from "vitest";
import {
  TIMELINE_LANES,
  actionTrackingSummary,
  buildTimeline,
  parseTimelineFilters,
  timelineFilterQuery,
  trackAction,
  type TimelineEntry,
  type TimelineFilters,
} from "./timeline";
import type { Action } from "./schemas";

const allFilters: TimelineFilters = { lane: "all", project: "all", year: "all" };

const entry = (id: string, date: string, lane: TimelineEntry["lane"], project: string | null = null): TimelineEntry => ({
  id,
  date,
  lane,
  kind: "test",
  title: id,
  detail: null,
  project,
  href: null,
  tone: "neutral",
});

const ASOF = "2026-09-02";

const entries: TimelineEntry[] = [
  entry("a-incidencia", "2026-08-16", "anotacion"),
  entry("b-informe", "2026-09-01", "informe"),
  entry("c-editorial", "2026-08-16", "editorial", "noken"),
  entry("d-accion", "2026-07-30", "accion", "porcelanosa"),
  entry("e-informe-2025", "2025-12-04", "informe"),
  // Posteriores al corte: el plan, no la historia.
  entry("f-editorial-futuro", "2026-11-25", "editorial", "noken"),
  entry("g-accion-futura", "2026-09-11", "accion", "porcelanosa"),
];

const build = (filters: TimelineFilters = allFilters, list: TimelineEntry[] = entries) =>
  buildTimeline({ generatedAt: "2026-09-02T08:15:00.000Z", asOf: ASOF, filters, entries: list });

describe("carriles de la cronología", () => {
  it("declara el carril del radar de V1 como pendiente, no lo omite", () => {
    const external = TIMELINE_LANES.find((lane) => lane.key === "contexto-externo")!;
    expect(external.state).toBe("pendiente");
    expect(external.phase).toBe("P4");
    expect(external.description).toContain("radar de V1");
  });

  it("todo carril tiene descripción y fase", () => {
    for (const lane of TIMELINE_LANES) {
      expect(lane.description.length).toBeGreaterThan(20);
      expect(lane.phase).toMatch(/^P\d+$/);
    }
  });
});

describe("parseTimelineFilters y timelineFilterQuery", () => {
  it("un valor inválido equivale a «todos»", () => {
    expect(parseTimelineFilters({ lane: "inventado", project: "no-existe", year: "hola" })).toEqual(allFilters);
    expect(parseTimelineFilters({})).toEqual(allFilters);
  });

  it("acepta las ocho marcas, no solo el piloto", () => {
    // `krion` era un valor inválido cuando el contrato solo admitía el piloto
    // (D-033). Ahora es una marca elegible aunque todavía no tenga serie.
    expect(parseTimelineFilters({ project: "krion" }).project).toBe("krion");
    expect(parseTimelineFilters({ project: "gamadecor" }).project).toBe("gamadecor");
  });

  it("lee los filtros válidos y hace ida y vuelta", () => {
    const filters: TimelineFilters = { lane: "informe", project: "noken", year: 2025 };
    expect(parseTimelineFilters(Object.fromEntries(new URLSearchParams(timelineFilterQuery(filters))))).toEqual(filters);
    expect(timelineFilterQuery(allFilters)).toBe("");
  });
});

describe("buildTimeline", () => {
  const timeline = build();

  it("separa lo ocurrido de lo comprometido por el corte del dato", () => {
    const pastIds = timeline.past.flatMap((month) => month.entries.map((item) => item.id));
    const upcomingIds = timeline.upcoming.flatMap((month) => month.entries.map((item) => item.id));
    expect(pastIds).toEqual(["b-informe", "a-incidencia", "c-editorial", "d-accion", "e-informe-2025"]);
    expect(upcomingIds).toEqual(["g-accion-futura", "f-editorial-futuro"]);
    // Sin la separación, el plan editorial de noviembre y diciembre sepultaría
    // la incidencia de agosto, que es lo que explica el KPI.
    expect(pastIds).not.toContain("f-editorial-futuro");
  });

  it("lo ocurrido va de más reciente a más antiguo y lo comprometido al contrario", () => {
    expect(timeline.past.map((month) => month.key)).toEqual(["2026-09", "2026-08", "2026-07", "2025-12"]);
    expect(timeline.upcoming.map((month) => month.key)).toEqual(["2026-09", "2026-11"]);
    expect(timeline.past[1]!.label).toBe("agosto 2026");
  });

  it("ordena dentro del mes con desempate estable por identificador", () => {
    const august = timeline.past.find((month) => month.key === "2026-08")!;
    expect(august.entries.map((item) => item.id)).toEqual(["a-incidencia", "c-editorial"]);
  });

  it("cuenta los hitos de cada carril sobre el total, no sobre lo filtrado", () => {
    const filtered = build({ ...allFilters, lane: "informe" });
    expect(filtered.visibleEntries).toBe(2);
    expect(filtered.totalEntries).toBe(7);
    expect(filtered.lanes.find((lane) => lane.key === "editorial")!.total).toBe(2);
    expect(filtered.years).toEqual([2026, 2025]);
  });

  it("un hito del conjunto no se oculta al filtrar por marca", () => {
    const noken = build({ ...allFilters, project: "noken" });
    const ids = [...noken.past, ...noken.upcoming].flatMap((month) => month.entries.map((item) => item.id));
    expect(ids).toContain("c-editorial");
    expect(ids).toContain("a-incidencia");
    expect(ids).toContain("b-informe");
    expect(ids).not.toContain("d-accion");
    expect(ids).not.toContain("g-accion-futura");
  });

  it("filtra por año", () => {
    const past = build({ ...allFilters, year: 2025 });
    expect(past.past.map((month) => month.key)).toEqual(["2025-12"]);
    expect(past.upcoming).toEqual([]);
    expect(past.visibleEntries).toBe(1);
  });

  it("una cronología vacía sigue declarando sus cinco carriles", () => {
    const empty = build(allFilters, []);
    expect(empty.past).toEqual([]);
    expect(empty.upcoming).toEqual([]);
    expect(empty.lanes).toHaveLength(5);
    expect(empty.lanes.every((lane) => lane.total === 0)).toBe(true);
  });

  it("es determinista", () => {
    expect(build()).toEqual(timeline);
  });
});

describe("seguimiento de acciones", () => {
  const base: Action = {
    id: "act-1",
    project: "porcelanosa",
    title: "Unificar canonical",
    status: "en_curso",
    impact: 5,
    confidence: 4,
    effort: 3,
    urgency: 5,
    owner: "Plataforma web",
    dueDate: "2026-09-11",
    successCriterion: "Menos de 5 URLs afectadas",
    sourceInsightId: "ins-p-index",
  };

  it("mide el plazo contra el corte del dato, no contra el reloj", () => {
    expect(trackAction(base, "2026-09-02")).toMatchObject({ tracking: "en-plazo", daysToDue: 9 });
    expect(trackAction(base, "2026-09-20")).toMatchObject({ tracking: "vencida", daysToDue: -9 });
    expect(trackAction(base, "2026-09-11")).toMatchObject({ tracking: "en-plazo", daysToDue: 0 });
  });

  it("una acción completada está cerrada, aunque su fecha haya pasado", () => {
    expect(trackAction({ ...base, status: "completada" }, "2026-09-20")).toMatchObject({ tracking: "cerrada", daysToDue: null });
  });

  it("una acción sin fecha no se declara vencida ni en plazo", () => {
    expect(trackAction({ ...base, dueDate: null }, "2026-09-02")).toMatchObject({ tracking: "sin-fecha", daysToDue: null });
  });

  it("el resumen reparte todas las acciones sin solapar estados", () => {
    const tracked = [
      trackAction(base, "2026-09-02"),
      trackAction({ ...base, id: "act-2", dueDate: "2026-08-01" }, "2026-09-02"),
      trackAction({ ...base, id: "act-3", dueDate: null }, "2026-09-02"),
      trackAction({ ...base, id: "act-4", status: "completada" }, "2026-09-02"),
      trackAction({ ...base, id: "act-5", status: "bloqueada", dueDate: "2026-07-01" }, "2026-09-02"),
    ];
    const summary = actionTrackingSummary(tracked);
    expect(summary).toMatchObject({ total: 5, enPlazo: 1, vencidas: 2, sinFecha: 1, cerradas: 1, bloqueadas: 1 });
    expect(summary.enPlazo + summary.vencidas + summary.sinFecha + summary.cerradas).toBe(summary.total);
  });
});
