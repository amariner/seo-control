import Link from "next/link";
import { EDITORIAL_LINK_KIND_LABELS, MONTH_NAMES_ES, type EditorialLinkKind, type EditorialPiece } from "@seo/contracts";
import { editorialPieceHref } from "@seo/editorial";
import { StatusBadge } from "@seo/ui";
import { editorialBacklinks, brandName } from "@/lib/editorial";
import { statusBadge } from "./piece-detail";

/**
 * Vista recíproca de `links` (P1.4, D-015): qué piezas del calendario editorial
 * referencian esta ficha. La relación la escribe el workbench en la pieza; aquí
 * solo se lee en la dirección contraria, de modo que la ficha nunca se convierte
 * en un segundo lugar donde editarla.
 */

const monthLabel = (piece: EditorialPiece) => (piece.month.month ? `${MONTH_NAMES_ES[piece.month.month]}${piece.month.year ? ` ${piece.month.year}` : ""}` : "Sin mes");

export function EditorialBacklinkList({ pieces }: { pieces: EditorialPiece[] }) {
  return (
    <ul className="detail-list backlink-list">
      {pieces.map((piece) => (
        <li key={piece.id}>
          <Link href={editorialPieceHref(piece)}>
            <span className="backlink-title">{piece.title ?? piece.keyword ?? "Pieza sin título"}</span>
            <small>{brandName(piece.brand.slug, piece.brand.literal)} · {monthLabel(piece)} · {piece.kind === "backlog" ? "Backlog" : "Plan"}{piece.theme ? ` · ${piece.theme}` : ""}</small>
          </Link>
          <div className="backlink-badges">{statusBadge(piece)}{piece.owner ? <StatusBadge tone="outline">{piece.owner}</StatusBadge> : null}</div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Bloque completo para una ficha de insight, acción, query, página o informe.
 * Cuando no hay ninguna pieza vinculada lo dice de forma explícita: la ausencia
 * de enlaces es un dato editorial (nadie ha curado la relación todavía), no un
 * fallo de carga ni una relación que el sistema deduzca por su cuenta.
 */
export function EditorialBacklinks({ kind, id, level = "section" }: { kind: EditorialLinkKind; id: string; level?: "section" | "detail" }) {
  const pieces = editorialBacklinks(kind, id);
  const heading = `Piezas editoriales vinculadas${pieces.length ? ` (${pieces.length})` : ""}`;
  if (level === "detail") {
    return (
      <section className="detail-section">
        <h3>{heading}</h3>
        {pieces.length ? <EditorialBacklinkList pieces={pieces} /> : <p className="pending">Ninguna pieza del calendario editorial referencia todavía esta ficha.</p>}
      </section>
    );
  }
  return (
    <section className="section backlinks" aria-labelledby={`backlinks-${kind}-${id}`}>
      <header className="section-heading">
        <div>
          <p className="eyebrow">Reciprocidad editorial</p>
          <h2 id={`backlinks-${kind}-${id}`}>{heading}</h2>
          <p>Relación curada en el workbench sobre la pieza ({EDITORIAL_LINK_KIND_LABELS[kind].toLowerCase()} <code>{id}</code>); esta vista solo la lee en sentido inverso.</p>
        </div>
        {pieces.length ? <Link className="section-link" href={`/api/v1/editorial/backlinks?kind=${kind}&id=${encodeURIComponent(id)}`}>Registro JSON</Link> : null}
      </header>
      {pieces.length ? <div className="card backlinks-card"><EditorialBacklinkList pieces={pieces} /></div> : <p className="pending">Ninguna pieza del calendario editorial referencia todavía esta ficha. El vínculo se crea desde el workbench, en el campo «Enlaces» de la pieza.</p>}
    </section>
  );
}
