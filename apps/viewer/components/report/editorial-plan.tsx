import type { CSSProperties, ReactNode } from "react";
import { X } from "lucide-react";
import type { EditorialPlanRow } from "@/lib/brand-report";
import { ReportDataTable, type ReportDataRow } from "./data-table";
import { PublicationSlider, type PublicationEvent } from "./publication-slider";
import { BriefCopy } from "./brief-copy";
import { Url } from "./url-label";
import "./brand-report.css";

const row = (id: string, values: ReportDataRow["values"], cells: ReportDataRow["cells"] = {}): ReportDataRow => ({
  id,
  values,
  cells,
  searchText: Object.values(values)
    .filter((value) => value !== null)
    .join(" "),
});
const monthLabel = (month: string | null) =>
  month ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString("es-ES", { month: "short", year: "numeric", timeZone: "UTC" }) : "Sin mes";
const dash = (value: string | null) => (value ? value : <span className="muted">—</span>);
/** Fecha corta dd/mm/aa para la tabla compacta del plan. */
const shortDate = (value: string | null) => (value ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(2, 4)}` : dash(null));

/** Columnas de la hoja «Plan editorial» del equipo, en su orden (D-055). */
const EDITORIAL_COLUMNS = [
  { key: "status", label: "Estado" },
  { key: "writingDate", label: "Fecha redacción" },
  { key: "publicationDate", label: "Fecha publicación" },
  { key: "type", label: "Tipo" },
  { key: "brand", label: "Marca" },
  { key: "market", label: "País" },
  { key: "month", label: "Mes" },
  { key: "theme", label: "Temática" },
  { key: "subtheme", label: "Subtema" },
  { key: "keyword", label: "Keyword principal" },
  { key: "title", label: "Título" },
  { key: "url", label: "URL (si existe)" },
  { key: "brief", label: "Notas / Brief", sortable: false },
];

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
  after,
}: {
  pieces: EditorialPlanRow[];
  caption: string;
  origin?: { label: string };
  calendar?: { events: PublicationEvent[]; source: string };
  /** Piezas que cuenta el calendario por mes; por defecto, las de la tabla. */
  calendarPieces?: EditorialPlanRow[];
  /** Filtros de columna en la barra de la tabla (plan general, D-060). */
  filterable?: boolean;
  /** Contenido debajo de la tabla (temas del plan general). */
  after?: ReactNode;
}) {
  const piecesByMonth: Record<string, string[]> = {};
  for (const item of calendarPieces) if (item.month) (piecesByMonth[item.month] ??= []).push(item.title ?? item.id);
  // La lista arranca en el mes en curso: lo pendiente de publicar, en orden (D-052).
  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const upcoming = pieces
    .filter((item) => !item.month || item.month >= currentMonth)
    .sort((a, b) => (a.month ?? "9999").localeCompare(b.month ?? "9999") || (a.publicationDate ?? "9999").localeCompare(b.publicationDate ?? "9999"));
  const earlier = pieces.length - upcoming.length;
  const options = (pickValue: (row: EditorialPlanRow) => string | null, label: (value: string) => string = (value) => value) =>
    [...new Set(upcoming.map(pickValue).filter((value): value is string => Boolean(value)))]
      .sort((a, b) => a.localeCompare(b, "es"))
      .map((value) => ({ value, label: label(value) }));
  const brands = options((row) => row.brand);
  const filters = filterable
    ? [
        ...(brands.length > 1 ? [{ key: "brand", label: "Marca", options: brands }] : []),
        { key: "status", label: "Estado", options: options((row) => row.status) },
        { key: "type", label: "Tipo", options: options((row) => row.type) },
        { key: "market", label: "País", options: options((row) => row.market) },
        { key: "month", label: "Mes", options: options((row) => row.month, (value) => monthLabel(value)) },
        { key: "subtheme", label: "Subtema", options: options((row) => row.subtheme) },
      ]
    : undefined;
  return (
    <>
      {calendar && calendar.events.length > 0 && <PublicationSlider events={calendar.events} piecesByMonth={piecesByMonth} today={today} source={calendar.source} />}
      <ReportDataTable
        id="editorial"
        caption={caption}
        searchPlaceholder="Buscar pieza, marca, keyword, URL o brief…"
        columns={EDITORIAL_COLUMNS}
        filters={filters}
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
              writingDate: shortDate(item.writingDate),
              publicationDate: shortDate(item.publicationDate),
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
