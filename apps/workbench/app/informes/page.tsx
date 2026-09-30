import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, FolderOpen } from "lucide-react";
import { PILOT_PROJECTS } from "@seo/contracts";
import { ScrollRegion } from "@/components/scroll-region";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { listAdditionalReports } from "@/lib/additional-reports";
import { reportCatalog, viewerReportUrl } from "@/lib/reports";

export const metadata: Metadata = { title: "Informes" };
export const dynamic = "force-dynamic";

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
 * Informes (D-076, D-082): una sola tabla con el último trimestre cerrado de
 * las ocho marcas, el informe que el equipo SEO revisa y comenta. La pantalla
 * es de solo lectura: congelar, puntualizar y subir al visor se piden en el
 * chat del asistente (Claude Code o Codex), que ejecuta los scripts `pnpm`.
 * Los informes adicionales, pedidos ad hoc, se quedan siempre en local.
 */
export default async function ReportsPage() {
  const { rows, quarter, pending, archived, invalid } = reportCatalog();
  const frozen = rows.filter((row) => row.published?.snapshot);
  const curated = rows.filter((row) => row.notes > 0);
  const additional = listAdditionalReports();
  const example = PILOT_PROJECTS[0]!.slug;

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Informes"
      title="Informes"
      description={`Informe trimestral de las ocho marcas: ${quarter.label}, congelado con datos reales y revisado por el equipo SEO. Aquí solo se consulta; congelar, puntualizar y subir al visor se piden en el chat.`}
    >
      <section className="rp-kpis" aria-label="Resumen">
        <article className="wb-card rp-kpi">
          <span>Congelados</span>
          <strong>{frozen.length}</strong>
          <small>de {PILOT_PROJECTS.length} marcas del piloto · {quarter.label}</small>
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

      {invalid.length ? (
        <p className="notice">Entradas que ya no cumplen el contrato y se han leído en parte: {invalid.join(", ")}. Pide en el chat que se regeneren.</p>
      ) : null}

      <section className="rp-brand" aria-labelledby="rp-trimestre">
        <header className="rp-brand-head">
          <h2 id="rp-trimestre">{quarter.label}</h2>
          <span className="rp-domain">
            {day(quarter.start)} – {day(quarter.end)} · último trimestre cerrado
          </span>
        </header>
        <ScrollRegion label={`Informes del ${quarter.label}`}>
          <table className="rp-table">
            <thead>
              <tr>
                <th>Marca</th>
                <th>Versión</th>
                <th>Puntualizaciones</th>
                <th>Sincronización</th>
                <th>Visor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.brand.name}</strong>
                    <span className="rp-sub">{row.brand.domain}</span>
                  </td>
                  <td>
                    {row.published?.snapshot ? (
                      <>
                        Congelada el {when(row.published.snapshot.generatedAt)}
                        <span className="rp-sub">
                          {row.published.snapshot.generatedBy} · corte {day(row.published.snapshot.cutoff)}
                          {row.stale ? " · contrato antiguo, pide regenerarla" : ""}
                        </span>
                      </>
                    ) : row.brand.pilot ? (
                      <span className="rp-muted">Sin congelar: el visor lo calcula en vivo</span>
                    ) : (
                      <span className="rp-muted">Sin datos analíticos hasta P11</span>
                    )}
                  </td>
                  <td>{row.notes ? `${row.notes} ${row.notes === 1 ? "ajuste" : "ajustes"}` : <span className="rp-muted">Ninguna</span>}</td>
                  <td>{row.sync ? <span className={`badge ${SYNC[row.sync].tone}`}>{SYNC[row.sync].label}</span> : <span className="rp-muted">—</span>}</td>
                  <td>
                    {row.brand.pilot ? (
                      <a className="button button-small button-ghost" href={viewerReportUrl(row.brand.slug, row.period.id)} target="_blank" rel="noopener">
                        <ExternalLink size={14} aria-hidden /> Ver<span className="sr-only"> el informe de {row.brand.name}</span>
                      </a>
                    ) : (
                      <span className="rp-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      </section>

      {archived.length ? (
        <p className="tool-note">
          Otros informes guardados de periodos anteriores (siguen en el archivo <code>/reports</code> del visor): {archived.join(", ")}.
        </p>
      ) : null}

      <section className="wb-card panel rp-sync" aria-labelledby="chat">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Desde el chat</p>
            <h2 id="chat">Cómo se prepara y se sube un informe</h2>
          </div>
        </div>
        <ul className="rp-howto">
          <li>
            <strong>«Congela el {quarter.label} de {PILOT_PROJECTS[0]!.name}»</strong>
            <code>pnpm report:generate -- --project {example} --period {quarter.id}</code>
            <span>Datos reales de GA4 y Search Console, el plan editorial curado y el último crawl publicado. Si una fuente falla, no se congela.</span>
          </li>
          <li>
            <strong>«Puntualiza el informe de {PILOT_PROJECTS[0]!.name}: …»</strong>
            <code>pnpm report:curate -- --project {example} --period {quarter.id} [--file puntualizaciones.json]</code>
            <span>Notas por apartado, cifras, tablas o filas ocultas y acciones del equipo. Sin <code>--file</code> enseña los apartados y lo ya puntualizado.</span>
          </li>
          <li>
            <strong>«Sube los informes»</strong>
            <code>git commit · vercel deploy --prod</code>
            <span>Se revisa el diff de <code>packages/reports/data/published/</code> y se confirma contigo antes del commit y del despliegue.</span>
          </li>
        </ul>
        <p className="tool-note">
          El visor local (puerto 3000) muestra cada cambio al instante. En la pestaña «Informes» de cada proyecto el visor enseña este trimestre y un informe en vivo del periodo que se elija arriba.
        </p>
        <p className="tool-note">
          <Link href="/informes/adicionales"><FolderOpen size={14} aria-hidden /> Informes adicionales (solo local) →</Link>
        </p>
      </section>
    </WorkbenchFrame>
  );
}
