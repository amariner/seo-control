import type { Metadata } from "next";
import Link from "next/link";
import { BRANDS, SOURCE_LABELS, marketPath, type Site } from "@seo/contracts";
import { Badge } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { PageFrame } from "@/components/page-frame";
import { getDashboard, parseFilters } from "@/lib/data";
import {
  connectedSources,
  isTier1,
  listSites,
  tier1Count,
  totalMarkets,
} from "@/lib/sites";
import "@/components/overview.css";

export const metadata: Metadata = { title: "Proyectos del grupo" };

/** Configuración real importada de V1, separada de la disponibilidad analítica. */
function SourceList({ site }: { site: Site }) {
  const sources = connectedSources(site);
  return sources.length ? (
    <span className="source-list">
      {sources.map((key) => (
        <code key={key}>{SOURCE_LABELS[key]}</code>
      ))}
    </span>
  ) : (
    <span className="muted">Sin fuentes</span>
  );
}

function MarketChips({ site }: { site: Site }) {
  return (
    <ul className="market-chips">
      {site.markets.map((market) => (
        <li
          key={market.code}
          className={
            isTier1(market.code)
              ? "market-chip market-chip-tier1"
              : "market-chip"
          }
          title={`${market.label} · ${marketPath(market)} · SEMrush ${market.semrushDatabase}`}
        >
          <span aria-hidden="true">{market.flag}</span>
          <span>{market.code}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const data = await getDashboard(filters);
  const sites = listSites(filters.project);
  const pilots = sites.filter(
    (site) => BRANDS.find((brand) => brand.slug === site.brand)?.pilot,
  );

  return (
    <PageFrame
      eyebrow="Webs del grupo"
      title="Proyectos"
      description="Informes, mercados y fuentes de cada web."
      generatedAt={data.generatedAt}
    >
      <dl className="overview-stats">
        <div>
          <dt>Proyectos</dt>
          <dd>{sites.length}</dd>
        </div>
        <div>
          <dt>Con informe analítico</dt>
          <dd>{pilots.length}</dd>
        </div>
        <div>
          <dt>Mercados configurados</dt>
          <dd>{totalMarkets(sites)}</dd>
        </div>
        <div>
          <dt>Con plan editorial</dt>
          <dd>{sites.length}</dd>
        </div>
      </dl>

      <section className="section" aria-labelledby="directorio">
        <div className="section-heading">
          <h2 id="directorio">Directorio</h2>
          <Link className="section-link" href="/portfolio">
            Ver conjunto →
          </Link>
        </div>
        <ReportDataTable
          key={filters.project}
          id="projects-directory"
          caption="Proyectos del grupo"
          searchPlaceholder="Buscar proyecto, dominio, mercado o fuente…"
          columns={[
            { key: "name", label: "Proyecto" },
            { key: "domain", label: "Dominio" },
            { key: "markets", label: "Mercados", numeric: true },
            { key: "sources", label: "Fuentes en V1" },
            { key: "report", label: "Analítica" },
          ]}
          rows={sites.map((site) => {
            const pilot =
              BRANDS.find((brand) => brand.slug === site.brand)?.pilot ?? false;
            const sources = connectedSources(site)
              .map((key) => SOURCE_LABELS[key])
              .join(", ");
            return {
              id: site.slug,
              searchText: `${site.name} ${site.hosts.join(" ")} ${site.markets.map((market) => `${market.code} ${market.label}`).join(" ")} ${sources}`,
              values: {
                name: site.name,
                domain: site.hosts[0] ?? null,
                markets: site.markets.length,
                sources,
                report: pilot ? "Informe disponible" : "Sin serie",
              },
              cells: {
                name: (
                  <>
                    <Link
                      className="cell-primary"
                      href={`/projects/${site.slug}`}
                    >
                      {site.name}
                    </Link>
                    <Link
                      className="cell-secondary"
                      href={`/editorial/calendario?brand=${site.brand}`}
                    >
                      Plan editorial →
                    </Link>
                  </>
                ),
                markets: (
                  <details className="overview-table-details">
                    <summary>{site.markets.length} mercados</summary>
                    <span className="cell-secondary">
                      {tier1Count(site)} con filtro Tier 1
                    </span>
                    <MarketChips site={site} />
                  </details>
                ),
                sources: <SourceList site={site} />,
                report: pilot ? (
                  <Link
                    className="section-link"
                    href={`/projects/${site.slug}`}
                  >
                    Abrir informe →
                  </Link>
                ) : (
                  <Badge tone="neutral">Sin serie</Badge>
                ),
              },
            };
          })}
          note="Mercados y fuentes: configuración real importada de V1. La conexión actual de cada fuente se indica en el informe del proyecto."
        />
      </section>

      <section className="section" aria-label="Configuración de marca">
        <details className="overview-details">
          <summary>Términos de marca</summary>
          <ReportDataTable
            key={filters.project}
            id="projects-brand-terms"
            caption="Términos paraguas de marca"
            searchPlaceholder="Buscar proyecto o término…"
            columns={[
              { key: "name", label: "Proyecto" },
              { key: "terms", label: "Términos paraguas" },
            ]}
            rows={sites.map((site) => ({
              id: site.slug,
              searchText: `${site.name} ${(site.brandTerms?.umbrella ?? []).join(" ")}`,
              values: {
                name: site.name,
                terms: site.brandTerms?.umbrella.join(", ") || null,
              },
              cells: {
                terms: site.brandTerms?.umbrella.length ? (
                  <span className="source-list">
                    {site.brandTerms.umbrella.map((term) => (
                      <code key={term}>{term}</code>
                    ))}
                  </span>
                ) : (
                  <span className="muted">Sin términos configurados</span>
                ),
              },
            }))}
            note="Términos importados de la configuración de V1. Se usan para distinguir búsquedas de marca."
          />
        </details>
      </section>
    </PageFrame>
  );
}
