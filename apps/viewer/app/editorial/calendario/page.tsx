import type { Metadata } from "next";
import Link from "next/link";
import { EDITORIAL_BRANDS, MONTH_NAMES_ES } from "@seo/contracts";
import { buildAgenda, buildMonthCells } from "@seo/editorial";
import { DataPanel, EmptyState, Notice, StatusBadge } from "@seo/ui";
import { DetailPanel } from "@/components/editorial/detail-panel";
import { EditorialFrame } from "@/components/editorial/editorial-frame";
import { PieceDetail, statusBadge } from "@/components/editorial/piece-detail";
import { brandColor, brandName, brandShortCode, findEvent, findPiece, hrefWith, pieceCurationMeta, queryCalendar, relatedForEvent, type SearchInput } from "@/lib/editorial";

export const metadata: Metadata = { title: "Calendario editorial" };

const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];
const BASE = "/editorial/calendario";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const { dataset, brand, year, years, month, view, months, events, themes } = queryCalendar(input);
  const eventId = Array.isArray(input.event) ? input.event[0] : input.event;
  const pieceId = Array.isArray(input.piece) ? input.piece[0] : input.piece;
  const selectedEvent = findEvent(eventId);
  const selectedPiece = findPiece(pieceId);
  const related = selectedEvent ? relatedForEvent(selectedEvent) : null;
  const closeHref = hrefWith(BASE, input, { event: null, piece: null });
  const countsByBrand = new Map(dataset.brands.map((item) => [item.slug, brand === "all" ? item.calendarEvents : events.filter((event) => event.brand.slug === item.slug).length]));
  const visibleMonths = view === "month" ? months.filter((item) => item.month === month) : months;
  const agenda = buildAgenda(view === "month" ? events.filter((event) => event.month === month) : events);

  return (
    <EditorialFrame dataset={dataset} current={BASE} title="Calendario editorial general" description={`Publicaciones y temas de ${year}. Filtra por marca y consulta cada pieza.`}>
      {dataset.report.brandsWithoutEvents.length ? <Notice tone="info" className="ds-no-print" >Marcas sin evento en el calendario importado: {dataset.report.brandsWithoutEvents.map((slug) => brandName(slug, slug)).join(", ")}.</Notice> : null}

      <div className="editorial-toolbar" role="group" aria-label="Vista del calendario">
        <div className="field"><span>Vista</span><div className="segmented"><Link className={view === "year" ? "segment-active" : ""} href={hrefWith(BASE, input, { view: "year", month: null })} aria-current={view === "year" ? "true" : undefined}>Anual</Link><Link className={view === "month" ? "segment-active" : ""} href={hrefWith(BASE, input, { view: "month", month: month ?? months[0]?.month ?? null })} aria-current={view === "month" ? "true" : undefined}>Mensual</Link></div></div>
        {years.length > 1 ? <div className="field"><span>Año</span><div className="segmented">{years.map((item) => <Link key={item} className={item === year ? "segment-active" : ""} href={hrefWith(BASE, input, { year: item, month: null })}>{item}</Link>)}</div></div> : null}
        {view === "month" ? <div className="field"><span>Mes</span><div className="segmented">{months.map((item) => <Link key={item.month} className={item.month === month ? "segment-active" : ""} href={hrefWith(BASE, input, { view: "month", month: item.month })}>{MONTH_NAMES_ES[item.month]?.slice(0, 3)}</Link>)}</div></div> : null}
        <div className="toolbar-actions"><span className="result-count"><strong>{events.length}</strong> eventos · {brand === "all" ? "todas las marcas" : brandName(brand, brand)}</span><a className="ds-button" href={`/api/v1/editorial/calendar?year=${year}${brand !== "all" ? `&brand=${brand}` : ""}`}>JSON del calendario</a></div>
      </div>

      <div className="calendar-layout">
        <section aria-label={`Calendario ${year}`}>
          {visibleMonths.length === 0 ? <EmptyState title="Sin meses planificados">El snapshot importado no contiene eventos para este año.</EmptyState> : null}
          <div className={view === "month" ? "calendar-single" : "calendar-year"}>
            {visibleMonths.map((item) => {
              const cells = buildMonthCells(item.year, item.month, events);
              const monthEvents = events.filter((event) => event.month === item.month);
              return (
                <article className="calendar-month" key={`${item.year}-${item.month}`} aria-labelledby={`mes-${item.month}`}>
                  <div className="calendar-month-head"><h2 id={`mes-${item.month}`} className="ds-h3"><Link href={hrefWith(BASE, input, { view: "month", month: item.month })}>{MONTH_NAMES_ES[item.month]} {item.year}</Link></h2><small>{monthEvents.length} publicaciones</small></div>
                  <div className="calendar-weekdays" aria-hidden>{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
                  <div className="calendar-cells" role="list">
                    {cells.map((cell, index) => cell.day === null ? <div className="calendar-cell calendar-cell-empty" key={`empty-${index}`} aria-hidden /> : (
                      <div className={`calendar-cell ${cell.weekday >= 5 ? "calendar-cell-weekend" : ""}`} key={cell.date} role="listitem" aria-label={`${cell.day} de ${MONTH_NAMES_ES[item.month]}${cell.events.length ? `, ${cell.events.length} publicaciones` : ""}`}>
                        <span className="calendar-day">{cell.day}</span>
                        {cell.events.length ? <div className="calendar-events">{cell.events.map((event) => <Link key={event.id} href={hrefWith(BASE, input, { event: event.id, piece: null })} scroll={false} className={`event-chip ${event.id === selectedEvent?.id ? "event-chip-active" : ""}`} style={{ "--brand-color": brandColor(event.brand.slug) } as React.CSSProperties} title={`${event.label} · ${event.date}`} aria-label={`${brandName(event.brand.slug, event.brand.literal)}${event.sequence ? ` ${event.sequence}` : ""}, ${cell.day} de ${MONTH_NAMES_ES[item.month]}`}>{view === "month" ? `${brandName(event.brand.slug, event.brand.literal)}${event.sequence ? ` · ${event.sequence}` : ""}` : `${brandShortCode(event.brand.slug, event.brand.literal)}${event.sequence ? `·${event.sequence}` : ""}`}</Link>)}</div> : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>

          <section className="calendar-agenda" aria-label="Agenda cronológica">
            {agenda.length === 0 ? <EmptyState title="Sin publicaciones con estos filtros" /> : agenda.map((day) => {
              const date = new Date(`${day.date}T00:00:00Z`);
              return <div className="agenda-day" key={day.date}><time dateTime={day.date}>{date.getUTCDate()} {MONTH_NAMES_ES[date.getUTCMonth() + 1]?.slice(0, 3)}<small>{date.toLocaleDateString("es-ES", { weekday: "long", timeZone: "UTC" })}</small></time><div>{day.events.map((event) => <Link key={event.id} href={hrefWith(BASE, input, { event: event.id, piece: null })} scroll={false} className={`event-chip ${event.id === selectedEvent?.id ? "event-chip-active" : ""}`} style={{ "--brand-color": brandColor(event.brand.slug) } as React.CSSProperties}>{brandName(event.brand.slug, event.brand.literal)}{event.sequence ? ` · ${event.sequence}` : ""} <span className="ds-meta" style={{ marginLeft: "auto" }}>{event.label}</span></Link>)}</div></div>;
            })}
          </section>

          <nav className="calendar-legend" aria-label="Leyenda y filtro por marca">
            <Link href={hrefWith(BASE, input, { brand: null, event: null })} className={brand === "all" ? "legend-active" : ""} aria-current={brand === "all" ? "true" : undefined}>Todas <span className="legend-count">{dataset.calendar.events.filter((event) => event.year === year).length}</span></Link>
            {EDITORIAL_BRANDS.map((item) => {
              const count = countsByBrand.get(item.slug) ?? 0;
              return <Link key={item.slug} href={hrefWith(BASE, input, { brand: brand === item.slug ? null : item.slug, event: null })} className={`${brand === item.slug ? "legend-active" : ""} ${count === 0 ? "legend-zero" : ""}`} aria-current={brand === item.slug ? "true" : undefined} style={{ "--brand-color": brandColor(item.slug) } as React.CSSProperties}><span className="legend-swatch" aria-hidden />{item.name}<span className="legend-count" title={`${count} publicaciones en ${year}`}>{count}</span>{count === 0 ? <span className="ds-sr-only">sin eventos</span> : null}</Link>;
            })}
          </nav>
        </section>

        <aside aria-labelledby="temas-titulo">
          <h2 id="temas-titulo" className="ds-h3" style={{ marginBottom: 10 }}>Bloques temáticos {year}</h2>
          <div className="theme-blocks">
            {themes.length === 0 ? <EmptyState title="Sin bloques temáticos" /> : themes.map((theme) => (
              <details className={`theme-block ${theme.month === month ? "theme-block-active" : ""}`} key={theme.id} open={theme.month === month || (month === null && theme.month === selectedEvent?.month)}>
                <summary><span className="theme-month">{String(theme.month).padStart(2, "0")}</span><span>{theme.theme}</span><StatusBadge tone="outline">{theme.subthemes.length}</StatusBadge></summary>
                <ul>{theme.subthemes.map((subtheme) => <li key={subtheme}><Link href={hrefWith("/editorial/backlog", {}, { theme: theme.theme, q: subtheme })}>{subtheme}</Link></li>)}</ul>
              </details>
            ))}
          </div>
          <DataPanel mineral style={{ marginTop: 16, padding: 14 }}>
            <p className="ds-meta" style={{ margin: 0 }}>Piezas relacionadas por marca y mes: <strong>{dataset.backlog.length}</strong> en backlog y <strong>{dataset.plan.length}</strong> en el plan histórico. Siguen siendo fuentes distintas hasta la decisión editorial.</p>
            <Link className="ds-evidence" href="/editorial/backlog" style={{ marginTop: 8, display: "inline-flex" }}>Abrir backlog y plan</Link>
          </DataPanel>
        </aside>
      </div>

      {selectedEvent && related ? (
        <DetailPanel title={`${brandName(selectedEvent.brand.slug, selectedEvent.brand.literal)}${selectedEvent.sequence ? ` · publicación ${selectedEvent.sequence}` : ""}`} closeHref={closeHref}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}><StatusBadge tone="info">{selectedEvent.typeLiteral}</StatusBadge><StatusBadge tone="outline">{new Date(`${selectedEvent.date}T00:00:00Z`).toLocaleDateString("es-ES", { weekday: "long", day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" })}</StatusBadge></div>
          <div className="detail-grid">
            <div className="info-box"><small>Etiqueta V1</small><strong>{selectedEvent.label}</strong></div>
            <div className="info-box"><small>Bloque temático</small><strong>{related.theme?.theme ?? "—"}</strong></div>
          </div>
          <section className="detail-section">
            <h3>Pieza vinculada</h3>
            {related.linkedPiece ? (
              <ul className="detail-list"><li><Link href={hrefWith(BASE, input, { piece: related.linkedPiece.id })} scroll={false}>{related.linkedPiece.title ?? related.linkedPiece.keyword ?? "Sin título"}<small>{statusBadge(related.linkedPiece)} · vínculo curado en el workbench</small></Link></li></ul>
            ) : (
              <Notice tone="info">Sin vínculo curado todavía. Las piezas de abajo son candidatas heurísticas por marca y mes; el workbench puede fijar la relación real.</Notice>
            )}
          </section>
          <section className="detail-section"><h3>Piezas candidatas · backlog ({related.backlog.length})</h3>{related.backlog.length ? <ul className="detail-list">{related.backlog.map((piece) => <li key={piece.id}><Link href={hrefWith(BASE, input, { piece: piece.id })} scroll={false}>{piece.title ?? piece.keyword ?? "Sin título"}<small>{statusBadge(piece)} · {piece.theme ?? "sin temática"}</small></Link></li>)}</ul> : <p className="pending">Ninguna fila del backlog coincide con esta marca y mes.</p>}</section>
          <section className="detail-section"><h3>Plan histórico ({related.plan.length})</h3>{related.plan.length ? <ul className="detail-list">{related.plan.slice(0, 12).map((piece) => <li key={piece.id}><Link href={hrefWith(BASE, input, { piece: piece.id })} scroll={false}>{piece.title ?? piece.keyword ?? "Sin título"}<small>{piece.typeLiteral} · {piece.market ?? piece.marketLiteral}</small></Link></li>)}{related.plan.length > 12 ? <li><Link className="ds-evidence" href={hrefWith("/editorial/backlog", {}, { kind: "plan", brand: selectedEvent.brand.slug, month: selectedEvent.month })}>Ver las {related.plan.length} filas</Link></li> : null}</ul> : <p className="pending">Sin filas del plan histórico para esta marca y mes.</p>}</section>
          <section className="detail-section"><h3>Huecos con propuestas ({related.slots.length})</h3>{related.slots.length ? <ul className="detail-list">{related.slots.map((slot) => <li key={slot.id}><Link href={hrefWith("/editorial/propuestas", {}, { brand: slot.brand.slug, month: slot.month.month, q: slot.slotLiteral })}>{slot.slotLiteral}<small>{slot.proposals.length} alternativas · {slot.theme}</small></Link></li>)}</ul> : <p className="pending">Sin huecos de propuestas para esta marca y mes.</p>}</section>
          <section className="detail-section"><h3>Procedencia</h3><p>Evento {selectedEvent.provenance.sourceIndex + 1} de <code>calendario-2026.json</code> · sha256 <code>{selectedEvent.provenance.sourceSha256.slice(0, 12)}…</code>.</p></section>
        </DetailPanel>
      ) : null}
      {selectedPiece && !selectedEvent ? <DetailPanel title={selectedPiece.title ?? selectedPiece.keyword ?? "Pieza editorial"} closeHref={closeHref}><PieceDetail piece={selectedPiece} curation={pieceCurationMeta(selectedPiece.id)} /></DetailPanel> : null}
      {selectedPiece && selectedEvent ? <DetailPanel title={selectedPiece.title ?? selectedPiece.keyword ?? "Pieza editorial"} closeHref={hrefWith(BASE, input, { piece: null })}><PieceDetail piece={selectedPiece} curation={pieceCurationMeta(selectedPiece.id)} /></DetailPanel> : null}
    </EditorialFrame>
  );
}
