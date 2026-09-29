import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FolderOpen, RefreshCw, SlidersHorizontal } from "lucide-react";
import { PILOT_PROJECTS } from "@seo/contracts";
import { ScrollRegion } from "@/components/scroll-region";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { FlashMessages } from "@/components/flash-messages";
import { SubmitButton } from "@/components/submit-button";
import { listAdditionalReports } from "@/lib/additional-reports";
import { reportCatalog, viewerReportUrl, type CatalogRow } from "@/lib/reports";
import { regenerateQuarter, regenerateReport } from "./actions";

export const metadata: Metadata = { title: "Informes" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const day = (value: string) =>
  new Date(`${value}T00:00:00Z`).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

const SYNC = {
  synced: { label: "En el último commit", tone: "badge-good" },
  pending: { label: "Cambios sin subir", tone: "badge-warn" },
  new: { label: "Nuevo, sin subir", tone: "badge-warn" },
} as const;

/**
 * Informes (D-076): control de los informes de las ocho marcas. Se congelan
 * los trimestres cerrados con datos reales, se personalizan con
 * puntualizaciones y llegan al visor con «sube los informes» en el chat. Los
 * informes adicionales, pedidos ad hoc, se quedan siempre en local.
 */
export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const brandFilter = pick("marca");
  const { rows, quarters, month, archived, invalid } = reportCatalog();
  const visible = rows.filter((row) => !brandFilter || row.brand.slug === brandFilter);
  const frozen = rows.filter((row) => row.published?.snapshot);
  const curated = rows.filter((row) => row.notes > 0);
  const pending = rows.filter((row) => row.sync === "pending" || row.sync === "new");
  const additional = listAdditionalReports();
  const latest = quarters[0]!;
  const latestMissing = PILOT_PROJECTS.filter((brand) => !rows.find((row) => row.id === `${brand.slug}:${latest.id}`)?.published?.snapshot);
  const byBrand = new Map<string, CatalogRow[]>();
  for (const row of visible) byBrand.set(row.brand.slug, [...(byBrand.get(row.brand.slug) ?? []), row]);

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Informes"
      title="Informes"
      description="Informes trimestrales y mensuales de las ocho marcas: congela un periodo cerrado con datos reales, añade puntualizaciones y súbelo al visor. Los informes adicionales se quedan en este equipo."
    >
      <FlashMessages ok={pick("ok")} error={pick("error")} />

      <section className="rp-kpis" aria-label="Resumen">
        <article className="wb-card rp-kpi">
          <span>Versiones congeladas</span>
          <strong>{frozen.length}</strong>
          <small>de {PILOT_PROJECTS.length * (quarters.length + 1)} posibles en el piloto</small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Con puntualizaciones</span>
          <strong>{curated.length}</strong>
          <small>{curated.reduce((sum, row) => sum + row.notes, 0)} ajustes en total</small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Pendientes de subir</span>
          <strong>{pending.length}</strong>
          <small>{pending.length ? "Pide «sube los informes» en el chat" : "El último commit está al día"}</small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Informes adicionales</span>
          <strong>{additional.length}</strong>
          <small>Solo en local, nunca se suben</small>
        </article>
      </section>

      <section className="wb-card panel rp-bulk" aria-labelledby="regenerar">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Regenerar</p>
            <h2 id="regenerar">{latest.label}</h2>
          </div>
          <span className={`badge ${latestMissing.length ? "badge-warn" : "badge-good"}`}>
            {latestMissing.length ? `${latestMissing.length} sin congelar` : "piloto completo"}
          </span>
        </div>
        <p className="tool-note">
          Congela el último trimestre cerrado ({day(latest.start)} – {day(latest.end)}) para {PILOT_PROJECTS.map((brand) => brand.name).join(", ")} con datos reales de GA4 y Search Console, el plan editorial curado y el último crawl publicado. Si una fuente falla, esa marca no se congela. Tarda unos 15 s por marca.
        </p>
        <form action={regenerateQuarter} className="rp-bulk-form">
          <input type="hidden" name="period" value={latest.id} />
          <SubmitButton className="button button-primary" pending="Regenerando…">
            <RefreshCw size={15} aria-hidden /> Regenerar {latest.label}
          </SubmitButton>
        </form>
      </section>

      <nav className="rp-filter" aria-label="Filtrar por marca">
        <Link href="/informes" aria-current={!brandFilter ? "page" : undefined}>Todas</Link>
        {[...new Set(rows.map((row) => row.brand))].map((brand) => (
          <Link key={brand.slug} href={`/informes?marca=${brand.slug}`} aria-current={brandFilter === brand.slug ? "page" : undefined}>
            {brand.name}
          </Link>
        ))}
      </nav>

      {invalid.length ? (
        <p className="notice">Entradas que ya no cumplen el contrato y se han leído en parte: {invalid.join(", ")}. Regenera esos informes.</p>
      ) : null}

      {[...byBrand.entries()].map(([slug, items]) => {
        const brand = items[0]!.brand;
        return (
          <section className="rp-brand" key={slug} aria-labelledby={`rp-${slug}`}>
            <header className="rp-brand-head">
              <h2 id={`rp-${slug}`}>{brand.name}</h2>
              <span className="rp-domain">{brand.domain}</span>
              {!brand.pilot ? <span className="badge">Sin datos analíticos hasta P11</span> : null}
            </header>
            <ScrollRegion label={`Informes de ${brand.name}`}>
              <table className="rp-table">
                <thead>
                  <tr>
                    <th>Informe</th>
                    <th>Periodo</th>
                    <th>Versión</th>
                    <th>Puntualizaciones</th>
                    <th>Visor</th>
                    <th><span className="sr-only">Acciones</span></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.period.kind === "quarter" ? "Trimestral" : "Mensual"}</strong>
                        <span className="rp-sub">{row.period.label}</span>
                      </td>
                      <td>{day(row.period.start)} – {day(row.period.end)}</td>
                      <td>
                        {row.published?.snapshot ? (
                          <>
                            Congelada el {when(row.published.snapshot.generatedAt)}
                            <span className="rp-sub">
                              {row.published.snapshot.generatedBy} · corte {day(row.published.snapshot.cutoff)}
                              {row.stale ? " · contrato antiguo, regenerar" : ""}
                            </span>
                          </>
                        ) : brand.pilot ? (
                          <span className="rp-muted">En vivo en el visor</span>
                        ) : (
                          <span className="rp-muted">—</span>
                        )}
                      </td>
                      <td>{row.notes ? `${row.notes} ${row.notes === 1 ? "ajuste" : "ajustes"}` : <span className="rp-muted">Ninguna</span>}</td>
                      <td>{row.sync ? <span className={`badge ${SYNC[row.sync].tone}`}>{SYNC[row.sync].label}</span> : <span className="rp-muted">—</span>}</td>
                      <td className="rp-actions">
                        {brand.pilot ? (
                          <>
                            <form action={regenerateReport}>
                              <input type="hidden" name="id" value={row.id} />
                              <SubmitButton className="button button-small" pending="Congelando…" title={row.published?.snapshot ? "Volver a pedir los datos y sustituir la versión" : "Congelar con los datos de hoy"}>
                                <RefreshCw size={14} aria-hidden /> {row.published?.snapshot ? "Regenerar" : "Congelar"}
                              </SubmitButton>
                            </form>
                            <Link className="button button-small" href={`/informes/${slug}/${row.period.id}`}>
                              <SlidersHorizontal size={14} aria-hidden /> Personalizar
                            </Link>
                            <a className="button button-small button-ghost" href={viewerReportUrl(slug, row.period.id)} target="_blank" rel="noopener">
                              <ExternalLink size={14} aria-hidden /> Ver
                            </a>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollRegion>
          </section>
        );
      })}

      {archived.length ? (
        <p className="tool-note">Otros informes guardados fuera de estos periodos: {archived.join(", ")}.</p>
      ) : null}

      <section className="wb-card panel rp-sync" aria-labelledby="sincronizar">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Sincronización</p>
            <h2 id="sincronizar">Llevar los informes al visor</h2>
          </div>
        </div>
        <p className="tool-note">
          Lo que se congela y se puntualiza aquí se guarda en <code>packages/reports/data/published/</code>. Llega al visor desplegado con un commit y <code>vercel deploy --prod</code>: pídelo en el chat con «sube los informes». El visor local (puerto 3000) ya lo muestra al instante. El mensual de {month.label} y los trimestres sin congelar se calculan en vivo en el visor, con las puntualizaciones aplicadas igual.
        </p>
        <p className="tool-note">
          <Link href="/informes/adicionales"><FolderOpen size={14} aria-hidden /> Informes adicionales (solo local) →</Link>
        </p>
      </section>
    </WorkbenchFrame>
  );
}
