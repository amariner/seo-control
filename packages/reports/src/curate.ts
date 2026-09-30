import type { DeckList, DeckSlide } from "./project-report";
import { rowKeyOf, type ReportCuration, type ReportCurationInput } from "./schema";

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

/**
 * Mapa de lo que se puede puntualizar en un informe, para el chat (D-082):
 * `pnpm report:curate -- --show` lo imprime y las claves son las mismas que
 * espera `--file` (id del apartado, etiqueta de cifra, título de tabla y
 * clave de fila).
 */
export function describeSlides(slides: DeckSlide[]) {
  return slides.map((slide) => ({
    id: slide.id,
    title: slide.title,
    note: slide.note,
    ...(slide.reading ? { reading: slide.reading } : {}),
    metrics: slide.metrics.map((metric) => ({ label: metric.label, value: metric.value })),
    lists: [
      ...slide.lists.map((list) => ({ title: list.title, rows: list.rows.map((row) => rowKeyFor(list, row)) })),
      ...(slide.bars ? [{ title: "__bars", rows: [] as string[] }] : []),
      ...(slide.series && slide.series.length > 1 ? [{ title: "__series", rows: [] as string[] }] : []),
    ],
  }));
}

/**
 * Referencias que no existen en el informe: un apartado, cifra, tabla o fila
 * que no está no se puede ocultar, y aplicarlo sería un no-op silencioso.
 * `slides` debe calcularse con las acciones del equipo de `input` para que
 * sus filas del plan de acción cuenten.
 */
export function curationProblems(slides: DeckSlide[], input: Pick<ReportCurationInput, "slides">): string[] {
  const problems: string[] = [];
  for (const [id, item] of Object.entries(input.slides)) {
    const slide = slides.find((candidate) => candidate.id === id);
    if (!slide) {
      problems.push(`Apartado desconocido: «${id}» (hay: ${slides.map((candidate) => candidate.id).join(", ")})`);
      continue;
    }
    if (item.hideReading && !slide.reading) problems.push(`${id}: no tiene lectura SEO que ocultar`);
    for (const label of item.hiddenMetrics ?? [])
      if (!slide.metrics.some((metric) => metric.label === label)) problems.push(`${id}: cifra desconocida «${label}»`);
    for (const title of item.hiddenLists ?? []) {
      const known =
        title === "__bars" ? Boolean(slide.bars) : title === "__series" ? (slide.series?.length ?? 0) > 1 : slide.lists.some((list) => list.title === title);
      if (!known) problems.push(`${id}: tabla o gráfico desconocido «${title}»`);
    }
    const rows = new Set(slide.lists.flatMap((list) => list.rows.map((row) => rowKeyFor(list, row))));
    for (const key of item.hiddenRows ?? []) if (!rows.has(key)) problems.push(`${id}: fila desconocida «${key}»`);
  }
  return problems;
}
