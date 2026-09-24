import type { Metadata } from "next";
import Link from "next/link";
import { EDITORIAL_BRANDS, EDITORIAL_STATUS_LABELS, EDITORIAL_TYPE_LABELS, MONTH_NAMES_ES, type EditorialPieceType, type EditorialStatus } from "@seo/contracts";
import type { PieceSortKey } from "@seo/editorial";
import { DataPanel, EmptyState, StatusBadge } from "@seo/ui";
import { ArrowDown, ArrowUp, ArrowUpDown, ExternalLink } from "lucide-react";
import { DetailPanel } from "@/components/editorial/detail-panel";
import { EditorialPagination } from "@/components/editorial/editorial-pagination";
import { editorialPagination } from "@/components/editorial/pagination";
import { EditorialFrame } from "@/components/editorial/editorial-frame";
import { EditorialToolbar } from "@/components/editorial/editorial-toolbar";
import { LegacyNotice } from "@/components/legacy-notice";
import { PieceDetail, statusBadge } from "@/components/editorial/piece-detail";
import { brandColor, brandName, findPiece, hrefWith, pieceCurationMeta, queryPieces, type SearchInput } from "@/lib/editorial";

export const metadata: Metadata = { title: "Backlog y plan editorial" };

const BASE = "/editorial/backlog";
const columns: Array<{ key: PieceSortKey; label: string; className?: string }> = [
  { key: "title", label: "Título", className: "col-title" },
  { key: "keyword", label: "Keyword" },
  { key: "brand", label: "Marca" },
  { key: "status", label: "Estado" },
  { key: "month", label: "Mes" },
  { key: "market", label: "País" },
  { key: "type", label: "Tipo" },
  { key: "theme", label: "Temática", className: "col-theme" },
];

export default async function BacklogPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const { dataset, filters, sort, dir, items, total, options } = queryPieces(input);
  const pagination = editorialPagination(input, items.length);
  const pieceId = Array.isArray(input.piece) ? input.piece[0] : input.piece;
  const selected = findPiece(pieceId);
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) { const single = Array.isArray(value) ? value[0] : value; if (single && key !== "piece") exportParams.set(key, single); }
  const kindLabel = filters.kind === "backlog" ? "backlog" : filters.kind === "plan" ? "plan histórico" : "backlog + plan";

  return (
    <EditorialFrame dataset={dataset} current={BASE} title="Backlog y plan editorial" description="Piezas, keywords y URLs de las ocho marcas. El CSV incluye todos los resultados filtrados.">
      <LegacyNotice from={input.from} />
      <div className="editorial-toolbar" role="group" aria-label="Fuente editorial" style={{ marginBottom: 12 }}>
        <div className="field"><span>Fuente</span><div className="segmented">
          <Link className={filters.kind === "all" ? "segment-active" : ""} href={hrefWith(BASE, input, { kind: null, piece: null, page: null })}>Ambas ({dataset.backlog.length + dataset.plan.length})</Link>
          <Link className={filters.kind === "backlog" ? "segment-active" : ""} href={hrefWith(BASE, input, { kind: "backlog", piece: null, page: null })}>Backlog ({dataset.backlog.length})</Link>
          <Link className={filters.kind === "plan" ? "segment-active" : ""} href={hrefWith(BASE, input, { kind: "plan", piece: null, page: null })}>Plan histórico ({dataset.plan.length})</Link>
        </div></div>
        <div className="toolbar-actions"><span className="result-count"><strong>{items.length}</strong> de {total} filas · {kindLabel}</span></div>
      </div>
      <EditorialToolbar
        search={{ value: filters.q ?? "", placeholder: "Buscar título, keyword, temática, brief o URL…" }}
        exportHref={`/api/v1/editorial/export/plan-editorial-conjunto.csv${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
        resetKeys={["piece"]}
        selects={[
          { key: "brand", label: "Marca", value: filters.brand ?? "all", allLabel: "Todas las marcas", options: EDITORIAL_BRANDS.map((brand) => ({ value: brand.slug, label: brand.name })) },
          { key: "market", label: "Mercado", value: filters.market ?? "all", allLabel: "Todos", options: options.markets.map((market) => ({ value: market, label: market })) },
          { key: "status", label: "Estado", value: filters.status ?? "all", allLabel: "Todos", options: options.statuses.map((status) => ({ value: status, label: EDITORIAL_STATUS_LABELS[status as EditorialStatus] ?? status })) },
          { key: "type", label: "Tipo", value: filters.type ?? "all", allLabel: "Todos", options: options.types.map((type) => ({ value: type, label: EDITORIAL_TYPE_LABELS[type as EditorialPieceType] ?? type })) },
          { key: "month", label: "Mes", value: filters.month === "all" || filters.month === undefined ? "all" : String(filters.month), allLabel: "Todos", options: options.months.map((month) => ({ value: String(month), label: MONTH_NAMES_ES[month] ?? String(month) })) },
          { key: "theme", label: "Temática", value: filters.theme ?? "all", allLabel: "Todas", options: options.themes.map((theme) => ({ value: theme, label: theme })) },
        ]}
      />

      <EditorialPagination total={items.length} {...pagination} />
      {items.length === 0 ? <EmptyState title="Ninguna fila coincide con los filtros">Prueba a limpiar la búsqueda o cambiar de fuente.</EmptyState> : (
        <DataPanel className="editorial-table-wrap">
          <table className="ds-table editorial-table">
            <caption className="ds-sr-only">Piezas editoriales: {items.length} filas ordenadas por {columns.find((column) => column.key === sort)?.label ?? sort} {dir === "asc" ? "ascendente" : "descendente"}</caption>
            <thead>
              <tr>
                {columns.map((column) => {
                  const active = sort === column.key;
                  const nextDir = active && dir === "asc" ? "desc" : "asc";
                  const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return <th key={column.key} className={column.className} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}><Link href={hrefWith(BASE, input, { sort: column.key, dir: nextDir, piece: null, page: null })} scroll={false} className={active ? "sort-active" : ""}>{column.label}<Icon size={12} aria-hidden /></Link></th>;
                })}
                <th>Brief</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {items.map((piece, index) => (
                <tr key={piece.id} className={index < pagination.start || index >= pagination.end ? "editorial-off-page" : undefined}>
                  <td className="col-title row-title"><Link href={hrefWith(BASE, input, { piece: piece.id })} scroll={false}>{piece.title ?? <span className="pending">Sin título</span>}</Link>{piece.warnings.length ? <span className="cell-secondary warn-mark" title={piece.warnings.join(" · ")}>{piece.warnings.length} aviso{piece.warnings.length > 1 ? "s" : ""} de importación</span> : null}<span className="cell-secondary">{piece.kind === "backlog" ? "Backlog" : "Plan histórico"}</span></td>
                  <td>{piece.keyword ?? "—"}</td>
                  <td><span className="brand-cell" style={{ "--brand-color": brandColor(piece.brand.slug) } as React.CSSProperties}>{brandName(piece.brand.slug, piece.brand.literal)}{piece.brand.line ? <span className="ds-meta"> · {piece.brand.line}</span> : null}</span></td>
                  <td>{statusBadge(piece)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{piece.month.month ? `${String(piece.month.month).padStart(2, "0")} ${MONTH_NAMES_ES[piece.month.month]}` : "—"}{piece.publicationDate ? <span className="cell-secondary">pub. {piece.publicationDate}</span> : null}</td>
                  <td>{piece.market ?? (piece.marketLiteral || "—")}</td>
                  <td><StatusBadge tone="outline" title={piece.typeLiteral}>{EDITORIAL_TYPE_LABELS[piece.type]}</StatusBadge></td>
                  <td className="col-theme">{piece.theme ?? "—"}{piece.subtheme ? <span className="cell-secondary">{piece.subtheme}</span> : null}</td>
                  <td>{piece.brief ? <details className="brief-toggle"><summary>Ver brief ({piece.brief.normalizedLength.toLocaleString("es-ES")} car.)</summary><pre className="brief-text">{piece.brief.text}</pre></details> : <span className="pending">—</span>}</td>
                  <td className="col-url">{piece.url ? <span className="row-url"><a href={piece.url} target="_blank" rel="noopener noreferrer" title={piece.url}><ExternalLink size={12} aria-hidden style={{ verticalAlign: -2, marginRight: 4 }} />{piece.url.replace(/^https?:\/\/(www\.)?/, "")}</a></span> : <span className="pending">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataPanel>
      )}

      {selected ? <DetailPanel title={selected.title ?? selected.keyword ?? "Pieza editorial"} closeHref={hrefWith(BASE, input, { piece: null })}><PieceDetail piece={selected} curation={pieceCurationMeta(selected.id)} /></DetailPanel> : null}
    </EditorialFrame>
  );
}
