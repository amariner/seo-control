import type { Metadata } from "next";
import { EDITORIAL_BRANDS, EDITORIAL_TYPE_LABELS, MONTH_NAMES_ES } from "@seo/contracts";
import { DataPanel, EmptyState, StatusBadge } from "@seo/ui";
import { ExternalLink } from "lucide-react";
import { EditorialFrame } from "@/components/editorial/editorial-frame";
import { EditorialToolbar } from "@/components/editorial/editorial-toolbar";
import { brandColor, brandName, querySlots, type SearchInput } from "@/lib/editorial";

export const metadata: Metadata = { title: "Propuestas editoriales" };

export default async function ProposalsPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const input = await searchParams;
  const { dataset, filters, items, total, options } = querySlots(input);
  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) { const single = Array.isArray(value) ? value[0] : value; if (single) exportParams.set(key, single); }
  const proposalCount = items.reduce((sum, slot) => sum + slot.proposals.length, 0);

  return (
    <EditorialFrame dataset={dataset} current="/editorial/propuestas" title="Propuestas por hueco" description="Cada hueco del calendario de prensa reúne sus alternativas editoriales (reutilizar o crear). El número real de alternativas es dinámico; prensa y SEO eligen una y la selección se registrará desde el workbench.">
      <EditorialToolbar
        search={{ value: filters.q, placeholder: "Buscar hueco, keyword, subtema o título…" }}
        exportHref={`/api/v1/editorial/export/plan-editorial-propuestas.csv${exportParams.toString() ? `?${exportParams.toString()}` : ""}`}
        selects={[
          { key: "brand", label: "Marca", value: filters.brand, allLabel: "Todas las marcas", options: EDITORIAL_BRANDS.map((brand) => ({ value: brand.slug, label: brand.name })) },
          { key: "month", label: "Mes", value: filters.month === "all" ? "all" : String(filters.month), allLabel: "Todos", options: options.months.map((month) => ({ value: String(month), label: MONTH_NAMES_ES[month] ?? String(month) })) },
          { key: "theme", label: "Bloque temático", value: filters.theme, allLabel: "Todos", options: options.themes.map((theme) => ({ value: theme, label: theme })) },
        ]}
      >
        <span className="result-count"><strong>{items.length}</strong> de {total} huecos · {proposalCount} alternativas</span>
      </EditorialToolbar>

      {items.length === 0 ? <EmptyState title="Ningún hueco coincide con los filtros" /> : (
        <div className="slot-list">
          {items.map((slot) => (
            <DataPanel as="article" className="slot-card" key={slot.id} aria-labelledby={`slot-${slot.id}`}>
              <div className="slot-head">
                <span className="brand-cell" style={{ "--brand-color": brandColor(slot.brand.slug) } as React.CSSProperties}>{brandName(slot.brand.slug, slot.brand.literal)}{slot.brand.line ? <span className="ds-meta"> · {slot.brand.line}</span> : null}</span>
                <h3 id={`slot-${slot.id}`}>{slot.slotLiteral}</h3>
                <span className="slot-meta">{slot.month.month ? MONTH_NAMES_ES[slot.month.month] : "Sin mes"} · {slot.market ?? (slot.marketLiteral || "—")} · {slot.theme ?? "sin bloque"}</span>
                <StatusBadge tone="outline">{slot.proposals.length} alternativas</StatusBadge>
                {slot.selectedProposalId ? <StatusBadge tone="good">Seleccionada</StatusBadge> : <StatusBadge tone="neutral">Pendiente de elección</StatusBadge>}
                {slot.warnings.length ? <StatusBadge tone="warn" title={slot.warnings.join(" · ")}>{slot.warnings.length} aviso{slot.warnings.length > 1 ? "s" : ""}</StatusBadge> : null}
              </div>
              <div className="proposal-grid">
                {slot.proposals.map((proposal) => (
                  <div className="proposal" key={proposal.id}>
                    <div className="proposal-head"><StatusBadge tone={proposal.format === "rework" ? "info" : "neutral"} title="Origen de la alternativa">{proposal.format === "rework" ? "Reutilizar" : proposal.format === "nuevo" ? "Crear" : proposal.formatLiteral || "Formato desconocido"}</StatusBadge><StatusBadge tone="outline" title={`Tipo en V1: ${proposal.typeLiteral || "sin tipo"}`}>{EDITORIAL_TYPE_LABELS[proposal.type]}</StatusBadge>{proposal.selected ? <StatusBadge tone="good">Elegida</StatusBadge> : null}</div>
                    <h4>{proposal.titles[0] ?? proposal.subtheme ?? "Sin título propuesto"}</h4>
                    {proposal.titles.slice(1).map((title) => <p key={title}>Alternativa: {title}</p>)}
                    {proposal.angle ? <p>{proposal.angle}</p> : null}
                    <dl>
                      <dt>Keyword</dt><dd>{proposal.keyword ?? "—"}{proposal.searchVolume !== null ? ` · ${proposal.searchVolume.toLocaleString("es-ES")} búsquedas/mes` : ""}</dd>
                      <dt>Subtema</dt><dd>{proposal.subtheme ?? "—"}</dd>
                      <dt>URL</dt><dd>{proposal.url ? <a className="ds-evidence" href={proposal.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={11} aria-hidden />{proposal.url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            </DataPanel>
          ))}
        </div>
      )}
    </EditorialFrame>
  );
}
