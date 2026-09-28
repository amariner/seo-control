import type { Metadata } from "next";
import Link from "next/link";
import { Notice, StatusBadge } from "@seo/ui";
import { DetailPanel } from "@/components/editorial/detail-panel";
import { EditorialFrame } from "@/components/editorial/editorial-frame";
import { PieceDetail, statusBadge } from "@/components/editorial/piece-detail";
import { EditorialPlan } from "@/components/report/editorial-plan";
import { ThemeTimeline } from "@/components/editorial/theme-timeline";
import { generalCalendar, generalPlanRows } from "@/lib/brand-report";
import { brandName, findEvent, findPiece, getEditorial, hrefWith, parseBrand, pieceCurationMeta, relatedForEvent, type SearchInput } from "@/lib/editorial";

export const metadata: Metadata = { title: "Plan editorial general" };

const BASE = "/editorial/calendario";

/**
 * Plan editorial general (D-057): el mismo calendario de publicación y la misma
 * tabla de la ficha de marca, con las ocho marcas y un color por marca. Los
 * filtros viven en la barra de la tabla (D-060); `?brand=` se mantiene para los
 * enlaces desde proyectos y portafolio.
 */
export default async function CalendarPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const dataset = getEditorial();
  const brand = parseBrand(input);
  const eventId = Array.isArray(input.event) ? input.event[0] : input.event;
  const pieceId = Array.isArray(input.piece) ? input.piece[0] : input.piece;
  const selectedEvent = findEvent(eventId);
  const selectedPiece = findPiece(pieceId);
  const related = selectedEvent ? relatedForEvent(selectedEvent) : null;
  const closeHref = hrefWith(BASE, input, { event: null, piece: null });
  const pieces = generalPlanRows(brand);
  const calendar = generalCalendar(brand);
  const importedAt = dataset.report.importedAt.slice(0, 10);
  const label = brand === "all" ? "Plan editorial de las ocho marcas" : `Plan editorial de ${brandName(brand, brand)}`;

  return (
    <EditorialFrame dataset={dataset} current={BASE} title="Plan editorial general" description="Calendario de publicación y plan de las ocho marcas con las columnas de la hoja del equipo. Cada marca tiene su color.">
      {dataset.report.brandsWithoutEvents.length ? <Notice tone="info" className="ds-no-print">Marcas sin evento en el calendario importado: {dataset.report.brandsWithoutEvents.map((slug) => brandName(slug, slug)).join(", ")}.</Notice> : null}

      <section className="plan-general" aria-label={label}>
        <EditorialPlan
          pieces={pieces}
          caption={label}
          origin={{ label: `hoja «Plan editorial» del equipo, importada el ${importedAt}` }}
          calendar={calendar}
          filterable
          after={<ThemeTimeline themes={dataset.calendar.themes} pieces={pieces} currentMonth={new Date().toISOString().slice(0, 7)} />}
        />
      </section>
      <p className="plan-general-foot ds-meta"><a className="ds-evidence" href={`/api/v1/editorial/calendar${brand !== "all" ? `?brand=${brand}` : ""}`}>JSON del calendario</a></p>

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
