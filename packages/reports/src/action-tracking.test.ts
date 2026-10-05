import { describe, expect, it } from "vitest";
import {
  actionTrackingStoreSchema,
  dueState,
  dueText,
  measureKey,
  parseActionTracking,
  resultOf,
  startTracking,
  trackingSummary,
  updateTracking,
  withTracking,
  type ActionMeasurement,
  type TrackedAction,
} from "./action-tracking";
import type { ActionMetric, ProjectAction, ReviewSection } from "./project-actions";

const sitemapMetric: ActionMetric = {
  label: "Páginas con clics fuera de los sitemaps",
  value: 1973,
  unit: "",
  better: "lower",
  target: { op: "lt", value: 10 },
  criterion: "Menos de 10 páginas con clics fuera de los sitemaps",
  evidence: "crawl",
};
const action = (overrides: Partial<ProjectAction> = {}): ProjectAction => ({
  key: "paginas:fuera-sitemaps",
  priority: "alta",
  title: "Incluir en los sitemaps las 1.973 páginas con clics que no declaran",
  why: "Reciben 13.607 clics (30,8 % de la muestra).",
  area: "Técnico",
  tab: "paginas",
  source: "Sitemaps del crawl y Search Console",
  inReport: false,
  metric: sitemapMetric,
  ...overrides,
});
const measurement = (overrides: Partial<ActionMeasurement> = {}): ActionMeasurement => ({
  value: 1973,
  cutoff: "2026-10-01",
  window: { start: "2026-07-04", end: "2026-10-01" },
  range: "90d",
  market: "all",
  crawl: "2026-09-30T08:50:00.000Z",
  proposed: true,
  title: null,
  why: null,
  measuredAt: "2026-10-05T10:00:00.000Z",
  measuredBy: "Equipo SEO",
  ...overrides,
});
const NOW = "2026-10-05T10:00:00.000Z";
const started = (overrides: Partial<ProjectAction> = {}, change = {}) =>
  startTracking({ brand: "xtone", action: action(overrides), baseline: measurement({ value: (overrides.metric ?? sitemapMetric)?.value ?? null }), change, author: "Andreu", now: NOW });

describe("seguimiento de acciones (D-090)", () => {
  it("al empezar guarda el punto de partida, el criterio de la regla y el plazo por SLA", () => {
    const record = started();
    expect(record).toMatchObject({
      brand: "xtone",
      key: "paginas:fuera-sitemaps",
      status: "planificada",
      owner: null,
      due: "2026-11-04",
      dueSource: "sla",
      criterion: "Menos de 10 páginas con clics fuera de los sitemaps",
      target: { op: "lt", value: 10 },
      closedAt: null,
    });
    expect(record.baseline.value).toBe(1973);
    expect(record.history).toHaveLength(1);
    expect(record.history[0]!.change).toContain("plazo 4 nov 2026 (SLA alta: 30 días)");
    expect(record.history[0]!.change).toContain("punto de partida 1.973");
  });

  it("sin objetivo fijo, el criterio es mejorar el punto de partida", () => {
    const record = started({ key: "busquedas:oportunidad:encimera", metric: { ...sitemapMetric, label: "Clics de «encimera»", value: 40, better: "higher", target: null, criterion: null, evidence: "busqueda" } });
    expect(record.target).toEqual({ op: "gt", value: 40 });
    expect(record.criterion).toBe("Clics de «encimera»: más que al empezar (40)");
  });

  it("el plazo fijado por el equipo sustituye al SLA y un plazo mal escrito no se guarda", () => {
    expect(started({}, { due: "2026-10-31", owner: "Marta" })).toMatchObject({ due: "2026-10-31", dueSource: "equipo", owner: "Marta" });
    expect(() => started({}, { due: "31/10/2026" })).toThrow(/Plazo no válido/);
  });

  it("cada cambio queda en el historial con autor; cerrar fija la fecha y reabrir la quita", () => {
    const record = started();
    const { record: doing, changes } = updateTracking(record, { status: "en_curso", owner: "Marta" }, "Laura", "2026-10-06T09:00:00.000Z");
    expect(changes).toEqual(["estado planificada → en curso", "responsable — → Marta"]);
    expect(doing.history.at(-1)).toMatchObject({ by: "Laura", change: "estado planificada → en curso; responsable — → Marta" });
    const { record: done } = updateTracking(doing, { status: "completada", learning: "Los sitemaps de pt/it los genera otro plugin." }, "Marta", "2026-10-20T09:00:00.000Z");
    expect(done.closedAt).toBe("2026-10-20T09:00:00.000Z");
    expect(done.learning).toContain("otro plugin");
    expect(updateTracking(done, { status: "en_curso" }, "Marta", "2026-10-21T09:00:00.000Z").record.closedAt).toBeNull();
    // Mismos valores: nada que guardar.
    expect(updateTracking(doing, { owner: "Marta", status: "en_curso" }, "Laura", NOW).changes).toEqual([]);
    // Volver al SLA recalcula desde el inicio del seguimiento.
    const team = updateTracking(record, { due: "2026-12-01" }, "Laura", NOW).record;
    expect(updateTracking(team, { due: "sla" }, "Laura", NOW).record).toMatchObject({ due: "2026-11-04", dueSource: "sla" });
  });

  it("el resultado se lee frente al criterio y al punto de partida, y avisa si es provisional", () => {
    const record = started();
    const withResult = (result: Partial<ActionMeasurement>, base: TrackedAction = record): TrackedAction => ({ ...base, result: measurement(result) });
    // Mismo crawl que al empezar: la cifra no puede haber cambiado todavía.
    expect(resultOf(withResult({ value: 1973 }))).toEqual({ verdict: "igual", provisional: "Sin crawl publicado después de la acción: la cifra no cambia hasta repetirlo." });
    expect(resultOf(withResult({ value: 400, crawl: "2026-11-02T08:00:00.000Z" }))).toEqual({ verdict: "mejora", provisional: null });
    expect(resultOf(withResult({ value: 4, crawl: "2026-11-02T08:00:00.000Z" }))!.verdict).toBe("cumplido");
    expect(resultOf(withResult({ value: 2400, crawl: "2026-11-02T08:00:00.000Z" }))!.verdict).toBe("empeora");
    expect(resultOf(withResult({ value: null }))!.verdict).toBe("sin-dato");
    expect(resultOf(record)).toBeNull();

    // Búsqueda: hace falta un periodo con datos posteriores a la acción.
    const search = started({ key: "busquedas:sin-marca", metric: { ...sitemapMetric, label: "Variación de los clics sin marca", value: -25, unit: "%", better: "higher", target: { op: "gt", value: -10 }, evidence: "busqueda" } });
    expect(resultOf(withResult({ value: -12, window: { start: "2026-07-20", end: "2026-10-17" } }, search))!.provisional).toBe("Solo 12 días de datos posteriores a la acción (hacen falta 28).");
    expect(resultOf(withResult({ value: -5, window: { start: "2026-08-20", end: "2026-11-17" } }, search))).toEqual({ verdict: "cumplido", provisional: "El periodo medido aún incluye 46 días anteriores a la acción." });
    expect(resultOf(withResult({ value: -5, window: { start: "2026-10-06", end: "2027-01-03" } }, search))!.provisional).toBeNull();
  });

  it("una acción sin cifra se cumple cuando los datos dejan de proponerla", () => {
    const record = started({ key: "paso:contenido:revisar", metric: null });
    expect(record.criterion).toBe("Que los datos dejen de proponer la acción");
    expect(resultOf({ ...record, result: measurement({ value: null, proposed: false }) })!.verdict).toBe("cumplido");
    expect(resultOf({ ...record, result: measurement({ value: null, proposed: true }) })!.verdict).toBe("igual");
  });

  it("los plazos se cuentan contra el día de hoy y las cerradas no vencen", () => {
    const record = started();
    expect(dueState(record, "2026-11-01")).toEqual({ state: "en-plazo", days: 3 });
    expect(dueState(record, "2026-11-10")).toEqual({ state: "vencida", days: -6 });
    expect(dueText(record, "2026-11-04")).toBe("plazo 4 nov 2026 (SLA) · vence hoy");
    expect(dueText(record, "2026-11-10")).toBe("plazo 4 nov 2026 (SLA) · vencida hace 6 días");
    expect(dueState({ ...record, status: "completada" }, "2026-12-01").state).toBe("cerrada");
    const summary = trackingSummary([record, { ...record, key: "estado:urgentes", owner: "Marta", status: "completada" }], "2026-11-10");
    expect(summary).toMatchObject({ total: 2, open: 1, overdue: 1, unassigned: 1, completed: 1 });
  });

  it("cruza el repaso con lo que el equipo sigue y aparta lo que ya no se propone", () => {
    const record = started();
    const other = started({ key: "estado:urgentes" });
    const sections = [{ tab: "paginas", label: "Páginas", finding: null, actions: [action()] }] as ReviewSection[];
    const crossed = withTracking(sections, [record, other]);
    expect(Object.keys(crossed.tracked)).toEqual(["paginas:fuera-sitemaps"]);
    expect(crossed.elsewhere.map((item) => item.key)).toEqual(["estado:urgentes"]);
    // Medir una clave que la regla ya no propone usa la cifra calculada aparte.
    const measured = measureKey("estado:urgentes", sections, () => ({ ...sitemapMetric, value: 0 }), { ...measurement(), measuredBy: "Laura" });
    expect(measured).toMatchObject({ value: 0, proposed: false, title: null });
  });

  it("el fichero valida claves y avisa sin romper si no cumple el contrato", () => {
    const record = started();
    expect(actionTrackingStoreSchema.safeParse({ schemaVersion: 1, updatedAt: NOW, actions: { "xtone:paginas:fuera-sitemaps": record } }).success).toBe(true);
    expect(actionTrackingStoreSchema.safeParse({ schemaVersion: 1, updatedAt: NOW, actions: { x: { ...record, key: "Páginas" } } }).success).toBe(false);
    const broken = parseActionTracking({ schemaVersion: 2 });
    expect(broken.actions).toEqual({});
    expect(broken.invalid).toContain("schemaVersion");
  });
});
