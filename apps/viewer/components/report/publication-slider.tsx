"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, GalleryHorizontal } from "lucide-react";

/** `brand`, `code` y `color` solo en el plan general, con varias marcas a la vez (D-057). */
export type PublicationEvent = { date: string; type: string; label: string; brand?: string; code?: string; color?: string };

const tint = (event: PublicationEvent) => (event.color ? ({ "--pub-color": event.color } as CSSProperties) : undefined);
const kind = (event: PublicationEvent) => (event.type === "POST" ? "Post" : "News");

const WEEKDAYS = ["D", "L", "M", "X", "J", "V", "S"];
const WEEK_HEAD = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const pad = (value: number) => String(value).padStart(2, "0");

/** Meses completos entre el primer y el último evento, día a día. */
function buildMonths(events: PublicationEvent[]) {
  const sorted = events.map((event) => event.date).sort();
  const [fy, fm] = sorted[0]!.split("-").map(Number) as [number, number];
  const [ly, lm] = sorted.at(-1)!.split("-").map(Number) as [number, number];
  const months: Array<{ key: string; year: number; month: number; days: Array<{ date: string; day: number; weekday: number }> }> = [];
  for (let year = fy, month = fm; year < ly || (year === ly && month <= lm); month === 12 ? ((month = 1), (year += 1)) : (month += 1)) {
    const length = new Date(Date.UTC(year, month, 0)).getUTCDate();
    months.push({
      key: `${year}-${pad(month)}`,
      year,
      month,
      days: Array.from({ length }, (_, index) => ({
        date: `${year}-${pad(month)}-${pad(index + 1)}`,
        day: index + 1,
        weekday: new Date(Date.UTC(year, month - 1, index + 1)).getUTCDay(),
      })),
    });
  }
  return months;
}

type View = "strip" | "month";

/**
 * Calendario de publicación de la marca (D-051). Dos vistas deslizables: la
 * tira de días (varios meses a la vista) y el mes completo en cuadrícula, uno
 * por pantalla (D-054). Se abre en el mes actual; al cambiar de vista conserva
 * el mes que se estaba mirando.
 */
export function PublicationSlider({
  events,
  piecesByMonth,
  today,
  source,
}: {
  events: PublicationEvent[];
  /** Títulos de las piezas del plan por mes (`AAAA-MM`). */
  piecesByMonth: Record<string, string[]>;
  today: string;
  source: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const months = events.length ? buildMonths(events) : [];
  const byDate = new Map<string, PublicationEvent[]>();
  for (const event of events) byDate.set(event.date, [...(byDate.get(event.date) ?? []), event]);
  const anchor = months.some((month) => month.key === today.slice(0, 7)) ? today.slice(0, 7) : months[0]?.key;
  const [view, setView] = useState<View>("strip");
  const [focus, setFocus] = useState(anchor);

  useEffect(() => {
    const node = track.current;
    const target = node?.querySelector<HTMLElement>(`[data-month="${focus}"]`);
    if (node && target) node.scrollLeft = target.offsetLeft - node.offsetLeft;
  }, [focus, view]);

  if (!months.length) return null;
  /** Mes que ocupa el borde izquierdo de la pista ahora mismo. */
  const visibleMonth = () => {
    const node = track.current;
    if (!node) return focus;
    const sections = [...node.querySelectorAll<HTMLElement>("[data-month]")];
    const hit = sections.find((element) => element.offsetLeft - node.offsetLeft + element.offsetWidth > node.scrollLeft + 4);
    return hit?.dataset.month ?? focus;
  };
  const switchView = (next: View) => {
    if (next === view) return;
    setFocus(visibleMonth());
    setView(next);
  };
  const scroll = (direction: 1 | -1) => {
    const node = track.current;
    if (!node) return;
    const starts = [...node.querySelectorAll<HTMLElement>("[data-month]")].map((element) => element.offsetLeft - node.offsetLeft);
    const next = direction === 1 ? starts.find((start) => start > node.scrollLeft + 4) : [...starts].reverse().find((start) => start < node.scrollLeft - 4);
    node.scrollTo({ left: next ?? (direction === 1 ? node.scrollWidth : 0), behavior: "smooth" });
  };
  const posts = events.filter((event) => event.type === "POST").length;
  const news = events.length - posts;
  const multi = events.some((event) => event.color);
  const slotText = (slot: PublicationEvent) => (multi ? `${slot.brand} · ${kind(slot)}` : slot.label);

  return (
    <div className={`pub-slider${multi ? " is-multi" : ""}`}>
      <div className="pub-slider-head">
        <div>
          <h3>Calendario de publicación</h3>
          <p>
            {posts} posts · {news} newsletters · {source}
          </p>
        </div>
        <div className="pub-slider-tools">
          <div className="pub-views" role="group" aria-label="Vista del calendario">
            <button type="button" aria-pressed={view === "strip"} onClick={() => switchView("strip")}>
              <GalleryHorizontal size={14} aria-hidden /> Tira
            </button>
            <button type="button" aria-pressed={view === "month"} onClick={() => switchView("month")}>
              <CalendarDays size={14} aria-hidden /> Mes completo
            </button>
          </div>
          <span className="pub-legend">
            <i className="pub-dot is-post" aria-hidden /> Post
          </span>
          <span className="pub-legend">
            <i className="pub-dot is-news" aria-hidden /> Newsletter
          </span>
          <button type="button" className="pub-nav" onClick={() => scroll(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} aria-hidden />
          </button>
          <button type="button" className="pub-nav" onClick={() => scroll(1)} aria-label="Mes siguiente">
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
      <div className={`pub-track${view === "month" ? " is-month" : ""}`} ref={track} tabIndex={0} role="region" aria-label="Días de publicación, desplazable horizontalmente">
        {view === "month" && months.map((month) => {
          const lead = (month.days[0]!.weekday + 6) % 7;
          const pieces = piecesByMonth[month.key] ?? [];
          return (
            <section key={month.key} className="pub-grid-month" data-month={month.key} aria-label={`${MONTHS[month.month - 1]} ${month.year}`}>
              <header className="pub-month-head">
                <strong>
                  {MONTHS[month.month - 1]} {month.year}
                </strong>
                {pieces.length ? <span>{pieces.length} piezas</span> : <span>Sin piezas en el plan</span>}
              </header>
              <div className="pub-grid" role="grid">
                {WEEK_HEAD.map((label) => (
                  <span key={label} className="pub-grid-head" role="columnheader">
                    {label}
                  </span>
                ))}
                {Array.from({ length: lead }, (_, index) => (
                  <span key={`lead-${index}`} className="pub-cell is-empty" aria-hidden />
                ))}
                {month.days.map((day) => {
                  const slots = byDate.get(day.date) ?? [];
                  return (
                    <div
                      key={day.date}
                      role="gridcell"
                      className={`pub-cell${day.weekday === 0 || day.weekday === 6 ? " is-weekend" : ""}${day.date === today ? " is-today" : ""}${slots.length ? " is-marked" : ""}`}
                      aria-label={slots.length ? `${day.day} de ${MONTHS[month.month - 1]}: ${slots.map(slotText).join(" · ")}` : undefined}
                      title={multi && slots.length ? slots.map(slotText).join("\n") : undefined}
                    >
                      <span className="pub-num">{day.day}</span>
                      {slots.map((slot) => (
                        <span key={slot.label} className={`pub-chip ${slot.type === "POST" ? "is-post" : "is-news"}`} style={tint(slot)}>
                          {multi ? slot.code : kind(slot)}
                        </span>
                      ))}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
        {view === "strip" && months.map((month) => (
          <section key={month.key} className="pub-month" data-month={month.key} aria-label={`${MONTHS[month.month - 1]} ${month.year}`}>
            <header className="pub-month-head">
              <strong>
                {MONTHS[month.month - 1]} {month.year}
              </strong>
              {piecesByMonth[month.key]?.length ? <span>{piecesByMonth[month.key]!.length} piezas</span> : null}
            </header>
            <ol className="pub-days">
              {month.days.map((day) => {
                const slots = byDate.get(day.date) ?? [];
                const label = slots.map(slotText).join(" · ");
                return (
                  <li
                    key={day.date}
                    className={`pub-day${day.weekday === 0 || day.weekday === 6 ? " is-weekend" : ""}${day.date === today ? " is-today" : ""}${slots.length ? " is-marked" : ""}`}
                    title={label || undefined}
                    aria-label={slots.length ? `${day.day} de ${MONTHS[month.month - 1]}: ${label}` : undefined}
                  >
                    <span className="pub-weekday" aria-hidden>
                      {WEEKDAYS[day.weekday]}
                    </span>
                    <span className="pub-num">{day.day}</span>
                    <span className="pub-marks">
                      {slots.map((slot) => (
                        <i key={slot.label} className={`pub-dot ${slot.type === "POST" ? "is-post" : "is-news"}`} style={tint(slot)} aria-hidden />
                      ))}
                    </span>
                    {slots.length > 0 && (
                      <span className="pub-tag" aria-hidden>
                        {multi ? (slots.length > 1 ? `${slots.length}` : slots[0]!.code) : slots.map(kind).join(" + ")}
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
