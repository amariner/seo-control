import type { Metadata } from "next";
import Link from "next/link";
import {
  EDITORIAL_BRANDS,
  EDITORIAL_STATUS_LABELS,
  EDITORIAL_TYPE_LABELS,
  MONTH_NAMES_ES,
  editorialLanguageSchema,
  editorialPieceTypeSchema,
  editorialPiecePriority,
  editorialStatusSchema,
  intentSchema,
  marketCodeSchema,
  type EditorialBrandSlug,
  type EditorialDataset,
  type EditorialPiece,
  type EditorialPieceCurationRevision,
} from "@seo/contracts";
import { DataPanel, EmptyState, Notice, StatusBadge } from "@seo/ui";
import { brandLabel, candidatesForEvent, findPiece, getDataset, listPieces, pieceCurationRecord, type PieceListFilters } from "@/lib/editorial";
import { createPiece, linkEvent, selectProposal, savePieceCuration } from "./actions";

export const metadata: Metadata = { title: "Curación editorial · Workbench" };

type SearchInput = Record<string, string | string[] | undefined>;
type Section = "piezas" | "propuestas" | "eventos";

const pick = (input: SearchInput, key: string) => {
  const value = input[key];
  return Array.isArray(value) ? value[0] : value;
};

function brandDisplay(brand: { slug: EditorialBrandSlug | null; literal: string }) {
  return brand.slug ? brandLabel(brand.slug) : brand.literal;
}

export default async function EditorialCurationPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const section = ((pick(input, "section") as Section) || "piezas") satisfies Section;
  const saved = pick(input, "saved") === "1";
  const dataset = getDataset();

  return (
    <div className="wb-shell">
      <header className="wb-top">
        <div className="wb-brand"><span className="wb-mark">P</span><div><strong>SEO Workbench</strong><span>Curación editorial</span></div></div>
        <nav style={{ marginLeft: 28, display: "flex", gap: 16 }}>
          <Link href="/" style={{ color: "rgb(255 255 255 / 75%)", font: "600 13px/1 var(--ds-font-sans)" }}>Preparación y aprobación</Link>
          <Link href="/editorial" style={{ color: "#fff", font: "600 13px/1 var(--ds-font-sans)" }}>Editorial</Link>
        </nav>
        <span className="local-pill">● Solo este equipo · 127.0.0.1</span>
      </header>
      <main className="wb-main">
        <header className="wb-heading">
          <div>
            <p className="eyebrow">Workbench · Curación editorial (P1.4)</p>
            <h1>Editar, priorizar y vincular el calendario</h1>
            <p className="lede">Crea y edita piezas, elige la propuesta ganadora de cada hueco y sustituye la relación heurística evento → pieza por un vínculo real. Cada cambio queda versionado; el visor solo lee el resultado.</p>
          </div>
        </header>

        {saved ? <Notice tone="info">Guardado. La versión ha quedado registrada en el historial y el visor la mostrará en su próxima carga.</Notice> : null}

        <nav className="ed-tabs" aria-label="Secciones de curación">
          <Link href="/editorial?section=piezas" className={section === "piezas" ? "ed-tab-active" : ""} aria-current={section === "piezas" ? "page" : undefined}>Piezas ({dataset.backlog.length + dataset.plan.length})</Link>
          <Link href="/editorial?section=propuestas" className={section === "propuestas" ? "ed-tab-active" : ""} aria-current={section === "propuestas" ? "page" : undefined}>Propuestas ({dataset.slots.length})</Link>
          <Link href="/editorial?section=eventos" className={section === "eventos" ? "ed-tab-active" : ""} aria-current={section === "eventos" ? "page" : undefined}>Eventos ({dataset.calendar.events.length})</Link>
        </nav>

        {section === "piezas" ? <PiezasSection input={input} /> : null}
        {section === "propuestas" ? <PropuestasSection dataset={dataset} /> : null}
        {section === "eventos" ? <EventosSection dataset={dataset} /> : null}
      </main>
    </div>
  );
}

function PiezasSection({ input }: { input: SearchInput }) {
  const brand = (pick(input, "brand") as EditorialBrandSlug | "all") || "all";
  const kind = (pick(input, "kind") as PieceListFilters["kind"]) || "backlog";
  const q = pick(input, "q") ?? "";
  const editParam = pick(input, "edit");
  const { items, total } = listPieces({ brand, kind, q });
  const editingPiece = editParam && editParam !== "new" ? findPiece(editParam) : null;

  return (
    <>
      <form className="ed-toolbar" method="get">
        <input type="hidden" name="section" value="piezas" />
        <label className="field"><span>Buscar</span><input className="input" name="q" defaultValue={q} placeholder="Título, keyword, tema…" /></label>
        <label className="field"><span>Marca</span>
          <select className="input" name="brand" defaultValue={brand}>
            <option value="all">Todas las marcas</option>
            {EDITORIAL_BRANDS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Fuente</span>
          <select className="input" name="kind" defaultValue={kind}>
            <option value="backlog">Backlog</option>
            <option value="plan">Plan histórico</option>
            <option value="all">Ambas</option>
          </select>
        </label>
        <button type="submit" className="button">Filtrar</button>
        <Link className="button button-primary" href="/editorial?section=piezas&edit=new" style={{ marginLeft: "auto" }}>+ Nueva pieza</Link>
      </form>

      {editParam === "new" ? <CreatePieceForm /> : null}
      {editParam && editParam !== "new" ? (
        editingPiece ? <EditPieceForm piece={editingPiece} record={pieceCurationRecord(editingPiece.id)} /> : <Notice tone="warn">No se encontró la pieza «{editParam}».</Notice>
      ) : null}

      <DataPanel style={{ padding: 0, overflowX: "auto" }}>
        <table className="ds-table" style={{ minWidth: 720 }}>
          <thead><tr><th>Estado</th><th>Marca</th><th>Mes</th><th>Título / keyword</th><th>Prioridad</th><th aria-hidden /></tr></thead>
          <tbody>
            {items.length === 0 ? <tr><td colSpan={6}><EmptyState title="Ninguna pieza coincide con los filtros" /></td></tr> : items.map((piece) => {
              const priority = editorialPiecePriority(piece);
              return (
                <tr key={piece.id}>
                  <td><StatusBadge tone="outline">{EDITORIAL_STATUS_LABELS[piece.status]}</StatusBadge></td>
                  <td>{brandDisplay(piece.brand)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{piece.month.month ? `${MONTH_NAMES_ES[piece.month.month]?.slice(0, 3)} ${piece.month.year ?? ""}` : "—"}</td>
                  <td>{piece.title ?? piece.keyword ?? <span className="pending">Sin título</span>}</td>
                  <td>{priority ? priority.score : "—"}</td>
                  <td><Link className="button" href={`/editorial?section=piezas&edit=${encodeURIComponent(piece.id)}`}>Editar</Link></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataPanel>
      <p className="ds-meta" style={{ marginTop: 8, color: "var(--ds-muted)" }}>{items.length} de {total} filas · fuente: {kind === "backlog" ? "backlog" : kind === "plan" ? "plan histórico" : "backlog + plan"}.</p>
    </>
  );
}

function CreatePieceForm() {
  return (
    <DataPanel style={{ padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Nueva pieza de backlog</h2>
        <Link className="button" href="/editorial?section=piezas">Cancelar</Link>
      </div>
      <form action={createPiece} className="ed-grid" style={{ marginTop: 14 }}>
        <label className="field"><span>Marca</span>
          <select className="input" name="brand" required defaultValue="">
            <option value="" disabled>Selecciona una marca</option>
            {EDITORIAL_BRANDS.map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}
          </select>
        </label>
        <label className="field"><span>Mercado</span>
          <select className="input" name="market" defaultValue="">
            <option value="">Sin definir</option>
            {marketCodeSchema.options.map((code) => <option key={code} value={code}>{code}</option>)}
          </select>
        </label>
        <label className="field"><span>Idioma</span>
          <select className="input" name="language" defaultValue="">
            <option value="">Sin definir</option>
            {editorialLanguageSchema.options.map((code) => <option key={code} value={code}>{code.toUpperCase()}</option>)}
          </select>
        </label>
        <label className="field"><span>Tipo</span>
          <select className="input" name="type" defaultValue="nuevo">
            {editorialPieceTypeSchema.options.map((key) => <option key={key} value={key}>{EDITORIAL_TYPE_LABELS[key]}</option>)}
          </select>
        </label>
        <label className="field"><span>Año</span><input className="input" type="number" name="year" min={2000} max={2100} /></label>
        <label className="field"><span>Mes</span>
          <select className="input" name="month" defaultValue="">
            <option value="">—</option>
            {MONTH_NAMES_ES.map((name, index) => index > 0 ? <option key={index} value={index}>{name}</option> : null)}
          </select>
        </label>
        <label className="field"><span>Publicación prevista</span><input className="input" type="date" name="publicationDate" /></label>
        <label className="field"><span>Temática</span><input className="input" name="theme" /></label>
        <label className="field"><span>Subtema</span><input className="input" name="subtheme" /></label>
        <label className="field"><span>Keyword principal</span><input className="input" name="keyword" /></label>
        <label className="field ed-span-3"><span>Título</span><input className="input" name="title" /></label>
        <label className="field ed-span-3"><span>URL</span><input className="input" name="url" placeholder="https://" /></label>
        <label className="field ed-span-3"><span>Brief</span><textarea className="textarea" name="briefText" /></label>
        <div className="ed-span-3" style={{ display: "flex", justifyContent: "flex-end" }}><button type="submit" className="button button-primary">Crear pieza</button></div>
      </form>
    </DataPanel>
  );
}

function EditPieceForm({ piece, record }: { piece: EditorialPiece; record: ReturnType<typeof pieceCurationRecord> }) {
  const priority = editorialPiecePriority(piece);
  const current: EditorialPieceCurationRevision | null = record?.current ?? null;
  const action = savePieceCuration.bind(null, piece.id);
  const linksText = piece.links.map((link) => `${link.kind}:${link.id}`).join("\n");

  return (
    <DataPanel style={{ padding: 20, marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p className="eyebrow" style={{ margin: "0 0 4px" }}>{piece.kind === "backlog" ? "Backlog" : "Plan histórico"} · {piece.provenance.source === "workbench" ? "creada en workbench" : "importada de V1"}</p>
          <h2 style={{ margin: 0 }}>{piece.title ?? piece.keyword ?? "Pieza sin título"}</h2>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="badge">{current ? `v${current.version}` : "sin curar"}</span>
          <Link className="button" href="/editorial?section=piezas">Cerrar</Link>
        </div>
      </div>

      <dl className="ed-summary">
        <div><dt>Marca</dt><dd>{brandDisplay(piece.brand)}{piece.brand.line ? ` · ${piece.brand.line}` : ""}</dd></div>
        <div><dt>Mercado / idioma</dt><dd>{piece.market ?? (piece.marketLiteral || "—")}{piece.language ? ` · ${piece.language.toUpperCase()}` : ""}</dd></div>
        <div><dt>Mes (literal V1)</dt><dd>{piece.month.literal || "—"}</dd></div>
        <div><dt>Keyword</dt><dd>{piece.keyword ?? "—"}</dd></div>
        <div className="ed-span-3"><dt>Brief</dt><dd>{piece.brief ? `${piece.brief.normalizedLength.toLocaleString("es-ES")} caracteres normalizados` : "sin brief en el snapshot"}</dd></div>
      </dl>

      <form action={action} className="ed-grid">
        <label className="field"><span>Curador</span><input className="input" name="updatedBy" autoComplete="name" defaultValue={current?.updatedBy ?? ""} /></label>
        <label className="field ed-span-3"><span>Nota de esta versión</span><input className="input" name="note" placeholder="Motivo del cambio (opcional)" /></label>

        <label className="field"><span>Estado</span>
          <select className="input" name="status" defaultValue={current?.status ?? ""}>
            <option value="">Sin curar (V1: {piece.statusLiteral || "sin estado"})</option>
            {editorialStatusSchema.options.map((key) => <option key={key} value={key}>{EDITORIAL_STATUS_LABELS[key]}</option>)}
          </select>
        </label>
        <label className="field"><span>Tipo</span>
          <select className="input" name="type" defaultValue={current?.type ?? ""}>
            <option value="">Sin curar (V1: {piece.typeLiteral || "sin tipo"})</option>
            {editorialPieceTypeSchema.options.map((key) => <option key={key} value={key}>{EDITORIAL_TYPE_LABELS[key]}</option>)}
          </select>
        </label>
        <label className="field"><span>Intención</span>
          <select className="input" name="intent" defaultValue={current?.intent ?? ""}>
            <option value="">Sin curar</option>
            {intentSchema.options.map((key) => <option key={key} value={key}>{key}</option>)}
          </select>
        </label>

        {/* Año/mes/fechas nunca heredan el valor V1 como valor de campo: si el formulario los reenviara
            tal cual, cualquier guardado (aunque solo tocara owner) fijaría ese valor como curado y
            falsearía `yearSource`. Solo se guarda lo que el curador escribe; el actual se ve como pista. */}
        <label className="field"><span>Año {piece.month.year ? `(actual: ${piece.month.year})` : ""}</span><input className="input" type="number" name="year" min={2000} max={2100} placeholder={piece.month.year ? String(piece.month.year) : "—"} defaultValue={current?.year != null ? String(current.year) : ""} /></label>
        <label className="field"><span>Mes {piece.month.month ? `(actual: ${MONTH_NAMES_ES[piece.month.month]})` : ""}</span>
          <select className="input" name="month" defaultValue={current?.month != null ? String(current.month) : ""}>
            <option value="">— sin cambiar —</option>
            {MONTH_NAMES_ES.map((name, index) => index > 0 ? <option key={index} value={index}>{name}</option> : null)}
          </select>
        </label>
        <label className="field"><span>Publicación {piece.publicationDate ? `(actual: ${piece.publicationDate})` : ""}</span><input className="input" type="date" name="publicationDate" placeholder={piece.publicationDate ?? ""} defaultValue={current?.publicationDate ?? ""} /></label>
        <label className="field"><span>Redacción {piece.writingDate ? `(actual: ${piece.writingDate})` : ""}</span><input className="input" type="date" name="writingDate" placeholder={piece.writingDate ?? ""} defaultValue={current?.writingDate ?? ""} /></label>
        <label className="field"><span>Cluster</span><input className="input" name="cluster" defaultValue={current?.cluster ?? ""} /></label>
        <label className="field"><span>Criterio de éxito</span><input className="input" name="successKpi" defaultValue={current?.successKpi ?? ""} /></label>

        <label className="field"><span>Impacto (1-5)</span>
          <select className="input" name="impact" defaultValue={String(current?.impact ?? "")}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <label className="field"><span>Esfuerzo (1-5)</span>
          <select className="input" name="effort" defaultValue={String(current?.effort ?? "")}><option value="">—</option>{[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}</select>
        </label>
        <div className="field"><span>Prioridad</span><strong style={{ fontSize: 18 }}>{priority ? priority.score : "—"}</strong><small style={{ color: "var(--ds-muted)" }}>{priority ? priority.formula : "Impacto ÷ esfuerzo; requiere ambos"}</small></div>

        <label className="field"><span>Owner</span><input className="input" name="owner" defaultValue={current?.owner ?? ""} /></label>
        <label className="field"><span>Autor</span><input className="input" name="author" defaultValue={current?.author ?? ""} /></label>
        <label className="field"><span>Revisor</span><input className="input" name="reviewer" defaultValue={current?.reviewer ?? ""} /></label>

        <label className="field ed-span-3"><span>Objetivo</span><textarea className="textarea" name="objective" defaultValue={current?.objective ?? ""} /></label>
        <label className="field ed-span-3"><span>Hipótesis</span><textarea className="textarea" name="hypothesis" defaultValue={current?.hypothesis ?? ""} /></label>
        <label className="field ed-span-3"><span>Enlaces · uno por línea, formato tipo:id (insight, action, query, page, cluster, report, result)</span><textarea className="textarea" name="links" defaultValue={linksText} /></label>

        <div className="ed-span-3" style={{ display: "flex", justifyContent: "flex-end" }}><button type="submit" className="button button-primary">Guardar versión</button></div>
      </form>

      {record && record.history.length ? (
        <details className="ed-history">
          <summary>Historial de versiones ({record.history.length})</summary>
          {[...record.history].reverse().map((revision) => (
            <div className="ed-history-row" key={revision.version}>
              <strong>v{revision.version}</strong> · {new Date(revision.updatedAt).toLocaleString("es-ES")}{revision.updatedBy ? ` · ${revision.updatedBy}` : ""}
              {revision.note ? <span> — {revision.note}</span> : null}
            </div>
          ))}
        </details>
      ) : null}
    </DataPanel>
  );
}

function PropuestasSection({ dataset }: { dataset: EditorialDataset }) {
  return (
    <div className="ed-list">
      {dataset.slots.length === 0 ? <EmptyState title="Sin huecos con propuestas" /> : dataset.slots.map((slot) => (
        <DataPanel key={slot.id} style={{ padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
            <div>
              <strong>{brandDisplay(slot.brand)} · {slot.slotLiteral}</strong>
              <div style={{ color: "var(--ds-muted)", fontSize: 12, marginTop: 3 }}>{slot.month.month ? MONTH_NAMES_ES[slot.month.month] : "sin mes"} · {slot.theme ?? "sin bloque"} · {slot.proposals.length} alternativas</div>
            </div>
            {slot.selectedProposalId ? <StatusBadge tone="good">Seleccionada</StatusBadge> : <StatusBadge tone="warn">Pendiente</StatusBadge>}
          </div>
          <form action={selectProposal.bind(null, slot.id)} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
            <select className="input" name="selectedProposalId" defaultValue={slot.selectedProposalId ?? ""} style={{ maxWidth: 460, flex: "1 1 320px" }}>
              <option value="">Sin seleccionar</option>
              {slot.proposals.map((proposal) => <option key={proposal.id} value={proposal.id}>{proposal.titles[0] ?? proposal.subtheme ?? proposal.id} ({proposal.format === "rework" ? "Reutilizar" : "Nuevo"})</option>)}
            </select>
            <button type="submit" className="button button-primary">Guardar selección</button>
          </form>
        </DataPanel>
      ))}
    </div>
  );
}

function EventosSection({ dataset }: { dataset: EditorialDataset }) {
  return (
    <div className="ed-list">
      {dataset.calendar.events.map((event) => {
        const candidates = candidatesForEvent(event);
        return (
          <DataPanel key={event.id} style={{ padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "flex-start" }}>
              <div>
                <strong>{brandDisplay(event.brand)}{event.sequence ? ` · ${event.sequence}` : ""}</strong>
                <div style={{ color: "var(--ds-muted)", fontSize: 12, marginTop: 3 }}>{event.date} · {event.label}</div>
              </div>
              {event.pieceId ? <StatusBadge tone="good">Vínculo real</StatusBadge> : <StatusBadge tone="outline">Heurístico</StatusBadge>}
            </div>
            <form action={linkEvent.bind(null, event.id)} style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <select className="input" name="pieceId" defaultValue={event.pieceId ?? ""} style={{ maxWidth: 460, flex: "1 1 320px" }}>
                <option value="">Sin vincular</option>
                {candidates.map((piece) => <option key={piece.id} value={piece.id}>{piece.title ?? piece.keyword ?? piece.id} · {piece.month.month ? MONTH_NAMES_ES[piece.month.month] : "s/mes"}</option>)}
              </select>
              <button type="submit" className="button">Vincular</button>
            </form>
          </DataPanel>
        );
      })}
    </div>
  );
}
