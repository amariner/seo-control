import Link from "next/link";
import { EDITORIAL_LINK_KIND_LABELS, EDITORIAL_STATUS_LABELS, EDITORIAL_TYPE_LABELS, MONTH_NAMES_ES, editorialPiecePriority, type EditorialPiece, type EditorialPieceCurationRevision } from "@seo/contracts";
import { linkTargetHref } from "@seo/editorial";
import { StatusBadge } from "@seo/ui";
import { brandName } from "@/lib/editorial";

const statusTone = { backlog: "neutral", aceptado: "info", redactando: "info", revision: "warn", programado: "info", publicado: "good", descartado: "bad", desconocido: "outline" } as const;

export function statusBadge(piece: Pick<EditorialPiece, "status" | "statusLiteral">) {
  return <StatusBadge tone={statusTone[piece.status]} title={piece.statusLiteral ? `Literal V1: ${piece.statusLiteral}` : undefined}>{EDITORIAL_STATUS_LABELS[piece.status]}</StatusBadge>;
}

const formatDate = (value: string | null) => (value ? new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

/** Detalle de una pieza: evidencia, brief íntegro, dependencias, acción y criterio de éxito. */
export function PieceDetail({ piece, curation }: { piece: EditorialPiece; curation?: EditorialPieceCurationRevision | null }) {
  const monthLabel = piece.month.month ? `${MONTH_NAMES_ES[piece.month.month]}${piece.month.year ? ` ${piece.month.year}` : ""}` : "Sin mes";
  const priority = editorialPiecePriority(piece);
  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {statusBadge(piece)}
        <StatusBadge tone="outline">{EDITORIAL_TYPE_LABELS[piece.type]}</StatusBadge>
        <StatusBadge tone="outline">{piece.provenance.source === "workbench" ? "Creada en workbench" : piece.kind === "backlog" ? "Backlog V1" : "Plan histórico V1"}</StatusBadge>
        {curation ? <StatusBadge tone="info" title={curation.note ?? undefined}>Curada · v{curation.version}{curation.updatedBy ? ` · ${curation.updatedBy}` : ""}</StatusBadge> : null}
        {piece.warnings.length ? <StatusBadge tone="warn" title={piece.warnings.join(" · ")}>{piece.warnings.length} aviso{piece.warnings.length > 1 ? "s" : ""}</StatusBadge> : null}
      </div>
      <div className="detail-grid">
        <div className="info-box"><small>Marca</small><strong>{brandName(piece.brand.slug, piece.brand.literal)}{piece.brand.line ? ` · ${piece.brand.line}` : ""}</strong></div>
        <div className="info-box"><small>Mercado / idioma</small><strong>{piece.market ?? (piece.marketLiteral || "—")}{piece.language ? ` · ${piece.language.toUpperCase()}` : ""}</strong></div>
        <div className="info-box"><small>Mes estimado</small><strong>{monthLabel}</strong><small style={{ marginTop: 4 }}>{piece.month.yearSource === "date" ? "derivado de fecha" : piece.month.yearSource === "calendar" ? "año del calendario" : piece.month.literal || "—"}</small></div>
        <div className="info-box"><small>Redacción → publicación</small><strong>{formatDate(piece.writingDate)} → {formatDate(piece.publicationDate)}</strong></div>
        <div className="info-box"><small>Temática</small><strong>{piece.theme ?? "—"}</strong>{piece.subtheme ? <small style={{ marginTop: 4, textTransform: "none", letterSpacing: 0 }}>{piece.subtheme}</small> : null}</div>
        <div className="info-box"><small>Keyword principal</small><strong>{piece.keyword ?? "—"}</strong></div>
      </div>
      {piece.url ? <p className="row-url" style={{ maxWidth: "100%" }}>URL: <a href={piece.url} target="_blank" rel="noopener noreferrer">{piece.url}</a></p> : <p className="pending">Sin URL asignada.</p>}

      <section className="detail-section">
        <h3>Brief íntegro</h3>
        {piece.brief ? <><pre className="brief-text">{piece.brief.text}</pre><div className="brief-meta"><span>{piece.brief.normalizedLength.toLocaleString("es-ES")} caracteres normalizados</span><span>sha256 <code>{piece.brief.sha256.slice(0, 12)}…</code></span></div></> : <p className="pending">Esta fila no tiene brief en el snapshot V1.</p>}
      </section>

      <section className="detail-section">
        <h3>Decisión y medición</h3>
        <p><strong>Objetivo:</strong> {piece.objective ?? <span className="pending">pendiente de curación en el workbench</span>}</p>
        <p><strong>Hipótesis:</strong> {piece.hypothesis ?? <span className="pending">pendiente</span>}</p>
        <p><strong>Owner / autor / revisor:</strong> {[piece.owner, piece.author, piece.reviewer].some(Boolean) ? [piece.owner ?? "—", piece.author ?? "—", piece.reviewer ?? "—"].join(" / ") : <span className="pending">sin asignar en V1</span>}</p>
        <p><strong>Impacto × esfuerzo:</strong> {piece.impact !== null && piece.effort !== null ? `${piece.impact} × ${piece.effort}` : <span className="pending">sin estimar</span>}</p>
        <p><strong>Prioridad:</strong> {priority ? <>{priority.score} <span className="ds-meta">({priority.formula})</span></> : <span className="pending">requiere impacto y esfuerzo curados</span>}</p>
        <p><strong>Dependencias:</strong> {piece.dependencies.length ? piece.dependencies.join(", ") : <span className="pending">ninguna registrada</span>}</p>
        <p><strong>Criterio de éxito:</strong> {piece.successKpi ?? <span className="pending">se define al aceptar la pieza</span>}</p>
        <div className="measure-grid">
          {[28, 90, 180].map((window) => {
            const measurement = piece.measurements.find((item) => item.windowDays === window);
            return <div key={window}><strong>{measurement?.result !== null && measurement?.result !== undefined ? measurement.result.toLocaleString("es-ES") : "—"}</strong><small>{window} días · {measurement?.status ?? "pendiente"}</small></div>;
          })}
        </div>
      </section>

      <section className="detail-section">
        <h3>Enlaces</h3>
        {piece.links.length ? <ul className="detail-list">{piece.links.map((link) => {
          const href = linkTargetHref(link.kind, link.id);
          const body = <>{EDITORIAL_LINK_KIND_LABELS[link.kind]}<small>{link.id}</small></>;
          // `cluster` y `result` todavía no tienen ficha propia (P6/P9): se
          // muestran como texto en lugar de enlazar a una URL que daría 404.
          return <li key={`${link.kind}-${link.id}`}>{href ? <Link href={href}>{body}</Link> : <span className="detail-link-plain">{body}</span>}</li>;
        })}</ul> : <p className="pending">Sin enlaces curados a insight, acción, query, página, cluster o informe.</p>}
      </section>

      <section className="detail-section">
        <h3>Procedencia</h3>
        <p>Fuente <code>{piece.provenance.source}</code>, fila {piece.provenance.sourceIndex + 1}, importada el {new Date(piece.provenance.importedAt).toLocaleDateString("es-ES")}.{piece.provenance.identityOrdinal > 1 ? ` Identidad compartida (ordinal ${piece.provenance.identityOrdinal}).` : ""}</p>
        <p>Literales V1: estado «{piece.statusLiteral || "—"}», tipo «{piece.typeLiteral || "—"}», marca «{piece.brand.literal}», mes «{piece.month.literal || "—"}».</p>
        {piece.warnings.length ? <ul className="detail-list">{piece.warnings.map((warning) => <li key={warning} className="warn-mark">{warning}</li>)}</ul> : null}
        <p><Link className="ds-evidence" href={`/api/v1/editorial/pieces/${piece.id}`}>Registro JSON de la pieza</Link></p>
      </section>
    </>
  );
}
