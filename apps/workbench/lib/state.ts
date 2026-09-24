import { diskPreflight } from "@seo/local-data";
import { readCurationStore } from "@seo/editorial/curation-store";
import { getDataset } from "./editorial";

/**
 * Estado real de preparación del workbench (P2.3).
 *
 * Sustituye a los paneles de demostración que la portada traía escritos a mano:
 * anunciaban «Porcelanosa · Crawl v4 · 2.020 URLs · aprobado» y un historial de
 * preparación inventado, cuando no se ha ejecutado ni un crawl —el preflight lo
 * impide— y la curación estaba vacía. Presentar trabajo operativo que no ha
 * ocurrido es la peor variante del problema que corrige D-025: aquí el operador
 * decide sobre lo que cree que ya está hecho.
 *
 * Todo lo que devuelve esta capa sale de tres fuentes locales reales: el informe
 * de importación editorial, el almacén de curación y la medición de disco.
 */

export type PreparationEvent = {
  id: string;
  at: string;
  title: string;
  detail: string;
  tone: "good" | "warn" | "neutral";
};

export async function getWorkbenchState() {
  const dataset = getDataset();
  const curation = readCurationStore();
  const report = dataset.report;

  let preflight: { freeGiB: number; ready: boolean; requiredGiB: number } | null = null;
  try {
    const measured = await diskPreflight(process.cwd());
    preflight = { freeGiB: measured.freeGiB, ready: measured.ready, requiredGiB: Math.round(measured.requiredBytes / 1024 ** 3) };
  } catch {
    // Sin medición no se inventa una: la portada dirá que no pudo comprobarlo.
    preflight = null;
  }

  const curatedPieces = Object.keys(curation.pieces).length;
  const curatedSlots = Object.keys(curation.slots).length;
  const curatedEvents = Object.keys(curation.events).length;
  const createdPieces = curation.createdPieces.length;

  /**
   * Historial en orden inverso. Solo entra lo que consta con fecha en una fuente
   * local; si no hay nada curado todavía, la lista queda corta y eso es el dato.
   */
  const history: PreparationEvent[] = [
    {
      id: "import",
      at: report.importedAt,
      title: "Importación editorial de V1 completada",
      detail: `${report.archives.map((archive) => `${archive.importedCount}/${archive.expectedCount}`).join(" · ")} filas de ${report.archives.length} fuentes · ${report.rejections.length} rechazos · ${report.identityCollisions} colisiones de identidad`,
      tone: report.rejections.length === 0 ? ("good" as const) : ("warn" as const),
    },
    ...(curatedPieces + curatedSlots + curatedEvents + createdPieces > 0
      ? [
          {
            id: "curation",
            at: curation.updatedAt,
            title: "Última publicación de curación",
            detail: `${curatedPieces} pieza(s) editada(s) · ${createdPieces} creada(s) · ${curatedSlots} hueco(s) resuelto(s) · ${curatedEvents} evento(s) vinculado(s)`,
            tone: "good" as const,
          },
        ]
      : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    preflight,
    report,
    curation: { updatedAt: curation.updatedAt, curatedPieces, curatedSlots, curatedEvents, createdPieces },
    history,
    /** Total de filas editoriales bajo control local, contadas del dataset efectivo. */
    editorialRows: dataset.backlog.length + dataset.plan.length,
    events: dataset.calendar.events.length,
    slots: dataset.slots.length,
  };
}
