import { describe, expect, it } from "vitest";
import { getEditorialDataset } from "@seo/editorial/dataset";
import { describePlanFilters, filterPlanRows, generalCalendar, generalPlanRows, planExportFilters } from "./rows";

const dataset = getEditorialDataset();

describe("plan compartido (D-067)", () => {
  it("una pieza con fecha ocupa el hueco POST de su marca ese día o se añade como post", () => {
    const slot = dataset.calendar.events.find((event) => event.typeLiteral.toUpperCase() === "POST" && event.brand.slug)!;
    const piece = dataset.plan.find((item) => item.brand.slug === slot.brand.slug && item.provenance.source === "plan-sheet")!;
    const moved = { ...dataset, plan: dataset.plan.map((item) => (item.id === piece.id ? { ...item, publicationDate: slot.date } : item.id !== piece.id && item.brand.slug === slot.brand.slug ? { ...item, publicationDate: null } : item)) };
    const onDay = generalCalendar(moved, slot.brand.slug!).events.filter((event) => event.date === slot.date && event.type === "POST");
    expect(onDay).toHaveLength(1);
    expect(onDay[0]!.title).toBe(piece.title ?? piece.keyword);

    const elsewhere = { ...moved, plan: moved.plan.map((item) => (item.id === piece.id ? { ...item, publicationDate: "2026-12-31" } : item)) };
    const events = generalCalendar(elsewhere, slot.brand.slug!).events;
    expect(events.filter((event) => event.date === slot.date && event.type === "POST" && !event.title)).toHaveLength(1);
    expect(events.find((event) => event.date === "2026-12-31")?.title).toBe(piece.title ?? piece.keyword);
  });

  it("la ficha de un proyecto es el plan general filtrado por su marca", () => {
    const all = generalPlanRows(dataset, "all");
    const xtone = generalPlanRows(dataset, "xtone");
    expect(xtone.length).toBeGreaterThan(0);
    expect(xtone).toEqual(all.filter((row) => row.brandSlug === "xtone"));
  });

  it("marca las filas con cambios pendientes del visor", () => {
    const [first] = dataset.plan;
    const rows = generalPlanRows(dataset, "all", new Map([[first!.id, { actor: "a@b.c", createdAt: "2026-09-28T10:00:00.000Z" }]]));
    expect(rows.find((row) => row.id === first!.id)?.pending?.actor).toBe("a@b.c");
    expect(rows.filter((row) => row.pending)).toHaveLength(1);
  });

  it("el Excel exporta lo mismo que filtra la tabla: búsqueda sin tildes y filtros exactos", () => {
    const rows = generalPlanRows(dataset, "all");
    const selection = planExportFilters(new URLSearchParams("q=PORCELANICO&f.status=Backlog&f.nope=x"));
    expect(selection.filters).toEqual({ status: "Backlog" });
    const out = filterPlanRows(rows, selection);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every((row) => row.status === "Backlog" && /porcel[aá]nico/i.test(Object.values(row).join(" ")))).toBe(true);
    expect(describePlanFilters(planExportFilters(new URLSearchParams("f.month=2026-11")))).toEqual(["Mes: nov 2026"]);
  });
});
