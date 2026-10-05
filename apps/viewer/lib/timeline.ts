import {
  buildTimeline,
  parseTimelineFilters,
  timelineFilterQuery,
  trackAction,
  type TimelineEntry,
  type TimelineFilters,
} from "@seo/contracts";
import { linkTargetHref } from "@seo/editorial";
import { dueState, isClosedStatus } from "@seo/reports";
import { getPublishedTracking } from "@seo/reports/tracking-published";
import { resolveRepository } from "@seo/repository";
import { getDashboard } from "./data";
import { getEditorial } from "./editorial";
import { getReportArchive } from "./reports";

/**
 * Ensamblado de la cronología del visor (P2.3).
 *
 * Los hitos no se generan: se traducen de lo que ya existe. Cuatro fuentes, cada
 * una con su carril, y ninguna copia de datos:
 *
 * - `annotations` del payload de métricas (releases, incidencias, campañas…).
 * - Versiones publicadas del archivo de informes, incluidas las correcciones.
 * - Eventos del calendario editorial, que es dato real importado de V1.
 * - Acciones con fecha de vencimiento: las del repositorio y las que el equipo
 *   sigue (D-090), estas en su plazo o, si se cerraron, en su cierre.
 *
 * El carril de contexto externo (radar de V1) llega vacío a propósito: P2.1
 * decidió no conservarlo como vertical hasta automatizar su recogida (P4).
 */

const ANNOTATION_TONE = {
  publicacion: "info",
  migracion: "warn",
  release: "info",
  campana: "neutral",
  incidencia: "bad",
  update: "warn",
  medicion: "neutral",
} as const;

const ANNOTATION_KIND = {
  publicacion: "Publicación",
  migracion: "Migración",
  release: "Release",
  campana: "Campaña",
  incidencia: "Incidencia",
  update: "Actualización del buscador",
  medicion: "Medición",
} as const;

export async function getTimeline(filters: TimelineFilters) {
  // Con el origen real las anotaciones están en su configuración: pedir la
  // portada de 24 meses solo para leerlas costaba ~110 s en frío. Su portada
  // no trae acciones, así que no se pierde nada.
  const repository = resolveRepository();
  const data = repository.annotations ? null : await getDashboard({ project: "all", market: "all", period: "24m" });
  const annotations = data ? data.annotations : await repository.annotations!("24m");
  const generatedAt = data?.generatedAt ?? new Date().toISOString();
  const archive = getReportArchive({ project: "all", type: "all", status: "all", year: "all" });
  const dataset = getEditorial();
  const asOf = generatedAt.slice(0, 10);

  const entries: TimelineEntry[] = [
    ...annotations.map((annotation) => ({
      id: `tl-ann-${annotation.id}`,
      date: annotation.date,
      lane: "anotacion" as const,
      kind: ANNOTATION_KIND[annotation.type],
      title: annotation.label,
      detail: null,
      project: null,
      href: "/data",
      tone: ANNOTATION_TONE[annotation.type],
    })),

    // Cada versión publicada es su propio hito: una fe de erratas cambió lo que
    // se leyó, así que esconderla tras la versión vigente falsearía la historia.
    ...archive.entries.flatMap((report) =>
      report.versions
        .filter((version) => version.publishedAt !== null)
        .map((version) => ({
          id: `tl-report-${report.id}-v${version.version}`,
          date: version.publishedAt!,
          lane: "informe" as const,
          kind: version.changeNote ? `Corrección · ${report.type}` : `Informe ${report.type}`,
          title: `${report.title} · v${version.version}`,
          detail: version.changeNote ?? report.executiveSummary,
          project: report.project,
          href: `/reports/${report.id}`,
          tone: version.changeNote ? ("warn" as const) : ("good" as const),
        })),
    ),

    ...dataset.calendar.events.map((event) => ({
      id: `tl-ed-${event.id}`,
      date: event.date,
      lane: "editorial" as const,
      kind: "Evento editorial",
      title: event.label,
      detail: null,
      project: event.brand.slug,
      href: `/editorial/calendario?year=${event.year}&view=month&month=${event.month}&event=${event.id}`,
      tone: "neutral" as const,
    })),

    ...(data?.actions ?? [])
      .filter((action) => action.dueDate !== null)
      .map((action) => {
        const tracked = trackAction(action, asOf);
        return {
          id: `tl-action-${action.id}`,
          date: action.dueDate!,
          lane: "accion" as const,
          kind: tracked.tracking === "vencida" ? "Acción vencida" : tracked.tracking === "cerrada" ? "Acción cerrada" : "Acción comprometida",
          title: action.title,
          detail: `${action.owner} · ${action.successCriterion}`,
          project: action.project,
          href: `/actions#${action.id}`,
          tone: tracked.tracking === "vencida" ? ("bad" as const) : tracked.tracking === "cerrada" ? ("good" as const) : ("info" as const),
        };
      }),

    ...Object.values(getPublishedTracking().actions).map((record) => {
      const closed = isClosedStatus(record.status);
      const overdue = dueState(record, asOf).state === "vencida";
      return {
        id: `tl-tracked-${record.brand}-${record.key}`,
        date: closed && record.closedAt ? record.closedAt.slice(0, 10) : record.due,
        lane: "accion" as const,
        kind: closed ? (record.status === "completada" ? "Acción completada" : "Acción descartada") : overdue ? "Acción vencida" : "Acción comprometida",
        title: record.title,
        detail: `${record.owner ?? "Sin responsable"} · ${record.criterion}`,
        project: record.brand,
        href: linkTargetHref("action", `${record.brand}:${record.key}`) ?? "/actions",
        tone: closed ? ("good" as const) : overdue ? ("bad" as const) : ("info" as const),
      };
    }),
  ];

  return buildTimeline({ generatedAt, asOf, filters, entries });
}

export function timelineFiltersFromUrl(request: Request): TimelineFilters {
  return parseTimelineFilters(Object.fromEntries(new URL(request.url).searchParams));
}

export function timelineHref(filters: TimelineFilters, changes: Partial<TimelineFilters> = {}) {
  const query = timelineFilterQuery({ ...filters, ...changes });
  return query ? `/cronologia?${query}` : "/cronologia";
}
