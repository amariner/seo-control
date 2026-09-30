import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";
import { EDITORIAL_COLUMNS, planMonthLabel, sortPlanRows, statusTone, type EditorialPlanRow } from "./rows";
import { PublicationSlider, type PublicationEvent } from "./publication-slider";
import { brandShortCode } from "./brands";
import { PublicationDateEditor, StatusEditor, type PieceEditAction } from "./plan-editors";
import { BriefCopy } from "./brief-copy";
import { Url } from "./url-label";
import "./editorial-plan.css";

const row = (id: string, values: ReportDataRow["values"], cells: ReportDataRow["cells"] = {}): ReportDataRow => ({
  id,
  values,
  cells,
  searchText: Object.values(values)
    .filter((value) => value !== null)
    .join(" "),
});
const monthLabel = planMonthLabel;
const dash = (value: string | null) => (value ? value : <span className="muted">—</span>);
/** Fecha corta dd/mm/aa para la tabla compacta del plan. */
const shortDate = (value: string | null) => (value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(2, 4)}` : dash(null));

const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });


/**
 * Calendario de publicación y tabla del plan con las columnas de la hoja del
 * equipo. Lo comparten la ficha de marca y el plan editorial general (D-057);
 * cuando las filas traen color de marca, la columna «Marca» lo muestra.
 */
export function EditorialPlan({
  pieces,
  caption,
  origin,
  calendar,
  calendarPieces = pieces,
  filterable = false,
  showPast = false,
  after,
  edit,
  exportHref,
}: {
  pieces: EditorialPlanRow[];
  caption: string;
  origin?: { label: string };
  calendar?: { events: PublicationEvent[]; source: string };
  /** Piezas que cuenta el calendario por mes; por defecto, las de la tabla. */
  calendarPieces?: EditorialPlanRow[];
  /** Filtros de columna en la barra de la tabla (plan general, D-060). */
  filterable?: boolean;
  /** Incluye los meses anteriores (plan general, D-064); la ficha arranca en el mes en curso. */
  showPast?: boolean;
  /** Contenido debajo de la tabla (temas del plan general). */
  after?: ReactNode;
  /** Estado y fecha de publicación editables en la tabla (D-067); sin él, solo lectura. */
  edit?: PieceEditAction;
  /** Ruta del Excel del plan; la tabla le añade búsqueda y filtros activos. */
  exportHref?: string;
}) {
  const piecesByMonth: Record<string, string[]> = {};
  for (const item of calendarPieces) if (item.month) (piecesByMonth[item.month] ??= []).push(item.title ?? item.id);
  // Las piezas con mes y sin fecha también se ven en el calendario, en su mes (D-084).
  const undated: Record<string, PublicationEvent[]> = {};
  for (const item of calendarPieces)
    if (item.month && !item.publicationDate)
      (undated[item.month] ??= []).push({
        date: item.month,
        type: "POST",
        label: item.status,
        title: item.title ?? item.keyword ?? "Pieza sin título",
        brand: item.brand,
        code: brandShortCode(item.brandSlug ?? null, item.brand),
        color: item.brandColor,
      });
  // La lista arranca en el mes en curso: lo pendiente de publicar, en orden (D-052).
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const upcoming = pieces
    .filter((item) => showPast || !item.month || item.month >= currentMonth)
    .sort(sortPlanRows);
  const earlier = pieces.length - upcoming.length;
  const options = (pickValue: (row: EditorialPlanRow) => string | null, label: (value: string) => string = (value) => value) =>
    [...new Set(upcoming.map(pickValue).filter((value): value is string => Boolean(value)))]
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((value) => ({ value, label: label(value) }));
  const brands = options((row) => row.brand);
  const filters = filterable
    ? [
        { key: "status", label: "Estado", options: options((row) => row.status) },
        ...(brands.length > 1 ? [{ key: "brand", label: "Marca", options: brands, allLabel: "Todas" }] : []),
        { key: "type", label: "Tipo", options: options((row) => row.type) },
        { key: "market", label: "País", options: options((row) => row.market) },
        { key: "month", label: "Mes", options: options((row) => row.month, (value) => monthLabel(value)) },
        { key: "subtheme", label: "Subtema", options: options((row) => row.subtheme) },
      ]
    : undefined;
  return (
    <>
      {calendar && calendar.events.length > 0 && <PublicationSlider events={calendar.events} undated={undated} piecesByMonth={piecesByMonth} today={today} source={calendar.source} />}
      <ReportDataTable
        id="editorial"
        caption={caption}
        searchPlaceholder={filterable ? "Buscar en el plan…" : "Buscar pieza, marca, keyword, URL o brief…"}
        columns={[...EDITORIAL_COLUMNS]}
        filters={filters}
        exportHref={exportHref}
        rows={upcoming.map((item) =>
          row(
            item.id,
            {
              status: item.status,
              writingDate: item.writingDate,
              publicationDate: item.publicationDate,
              type: item.type,
              brand: item.brand,
              market: item.market,
              month: item.month,
              theme: item.theme,
              subtheme: item.subtheme,
              keyword: item.keyword,
              title: item.title,
              url: item.url,
              brief: item.brief,
            },
            {
              status: (
                <span className="plan-status-cell">
                  {edit ? <StatusEditor pieceId={item.id} value={item.statusKey} label={item.title ?? item.keyword ?? item.id} action={edit} /> : <span className={`plan-status is-${statusTone(item.statusKey)}`}>{item.status}</span>}
                  {item.pending ? (
                    <span className="plan-pending" title={`Cambio en el visor de ${item.pending.actor} (${when(item.pending.createdAt)}), pendiente de sincronizar con el workbench`}>
                      <span className="ds-sr-only">Pendiente de sincronizar</span>
                    </span>
                  ) : null}
                </span>
              ),
              writingDate: shortDate(item.writingDate),
              publicationDate: edit ? <PublicationDateEditor pieceId={item.id} value={item.publicationDate} label={item.title ?? item.keyword ?? item.id} action={edit} /> : shortDate(item.publicationDate),
              brand: item.brandColor ? (
                <span className="plan-brand" style={{ "--brand-color": item.brandColor } as CSSProperties}>
                  {item.brand}
                </span>
              ) : (
                item.brand
              ),
              market: dash(item.market),
              month: monthLabel(item.month),
              theme: dash(item.theme),
              subtheme: dash(item.subtheme),
              keyword: dash(item.keyword),
              title: dash(item.title),
              url: item.url ? (
                <a href={item.url} target="_blank" rel="noreferrer">
                  <Url value={item.url} />
                </a>
              ) : (
                dash(null)
              ),
              brief: item.brief ? (
                <>
                  <button type="button" className="brand-brief-open" popoverTarget={`brief-${item.id}`}>
                    Ver brief
                  </button>
                  <div id={`brief-${item.id}`} popover="auto" className="brand-brief-panel">
                    <header>
                      <strong>{item.title ?? item.keyword}</strong>
                      <BriefCopy title={item.title ?? item.keyword} text={item.brief} />
                      <button type="button" popoverTarget={`brief-${item.id}`} popoverTargetAction="hide" aria-label="Cerrar brief">
                        <X size={16} aria-hidden />
                      </button>
                    </header>
                    <div>{item.brief}</div>
                  </div>
                </>
              ) : (
                dash(null)
              ),
            },
          ),
        )}
        note={`${earlier ? `Desde ${new Date(`${currentMonth}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "long", year: "numeric", timeZone: "UTC" })}: ${earlier === 1 ? "se oculta 1 pieza" : `se ocultan ${earlier} piezas`} de meses anteriores. ` : ""}${origin ? `Fuente: ${origin.label}.` : ""}`}
      />
      {after}
    </>
  );
}
