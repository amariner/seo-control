import type { DeckList, DeckSlide } from "./project-report";
import { rowKeyOf, type ReportCuration } from "./schema";

/**
 * Identidad estable de una fila para ocultarla: la primera celda (keyword,
 * URL, mercado…), salvo en las tablas cuya primera columna es la prioridad,
 * donde manda la acción. Sobrevive a regenerar el informe con cifras nuevas.
 */
export const rowKeyFor = (list: Pick<DeckList, "title" | "toneColumn">, row: string[]) =>
  rowKeyOf(list.title, row[list.toneColumn === 0 ? 1 : 0] ?? "");

/**
 * Aplica las puntualizaciones del equipo (D-076) a las diapositivas ya
 * calculadas. Solo quita o añade texto: nunca cambia una cifra. Lo oculto
 * desaparece también del resumen ejecutivo (la idea clave del apartado), para
 * que el informe no remita a algo que no enseña.
 */
export function applyCuration(slides: DeckSlide[], curation: ReportCuration | undefined): DeckSlide[] {
  if (!curation) return slides;
  const hidden = new Set(
    Object.entries(curation.slides)
      .filter(([, item]) => item.hidden)
      .map(([id]) => id),
  );
  const hiddenTitles = new Set(slides.filter((slide) => hidden.has(slide.id)).map((slide) => slide.title));
  return slides
    .filter((slide) => !hidden.has(slide.id))
    .map((slide) => {
      const item = curation.slides[slide.id];
      const next: DeckSlide = { ...slide };
      if (next.points) next.points = next.points.filter((point) => !hiddenTitles.has(point.label));
      if (!item) return next;
      if (item.note) next.comment = item.note;
      if (item.hideReading) delete next.reading;
      if (item.hiddenMetrics?.length) next.metrics = next.metrics.filter((metric) => !item.hiddenMetrics!.includes(metric.label));
      const lists = item.hiddenLists ?? [];
      const rows = new Set(item.hiddenRows ?? []);
      next.lists = next.lists
        .filter((list) => !lists.includes(list.title))
        .map((list) => {
          if (!rows.size) return list;
          const keep = list.rows.map((row) => !rows.has(rowKeyFor(list, row)));
          if (keep.every(Boolean)) return list;
          return {
            ...list,
            rows: list.rows.filter((_, index) => keep[index]),
            tones: list.tones?.filter((_, index) => keep[index]),
          };
        });
      if (item.hiddenLists?.includes("__bars")) delete next.bars;
      if (item.hiddenLists?.includes("__series")) delete next.series;
      return next;
    });
}

/** Cuántas puntualizaciones tiene un informe, para las tablas del workbench y del visor. */
export function curationCount(curation: ReportCuration | undefined): number {
  if (!curation) return 0;
  let count = curation.actions.length;
  for (const item of Object.values(curation.slides)) {
    if (item.hidden) count += 1;
    if (item.note) count += 1;
    if (item.hideReading) count += 1;
    count += (item.hiddenMetrics?.length ?? 0) + (item.hiddenLists?.length ?? 0) + (item.hiddenRows?.length ?? 0);
  }
  return count;
}
