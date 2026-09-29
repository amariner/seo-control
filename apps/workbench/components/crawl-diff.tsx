import Link from "next/link";
import type { CrawlDiff } from "@seo/site-audit/diff";
import { ScrollRegion } from "./scroll-region";

/**
 * «Cambios desde el crawl anterior» (P5, D-080): incidencias corregidas y
 * nuevas en las URL de los dos crawls, URL que entran o salen del recorrido y
 * cambios de respuesta, indexabilidad y metadatos URL a URL.
 */
const SEVERITY = { critica: "Crítica", alta: "Alta", media: "Media", baja: "Baja" } as const;
const FIELD = { status: "HTTP", indexable: "Indexable", noindex: "noindex", canonical: "Canonical", title: "Title", h1: "H1" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const pathOf = (url: string) => {
  try {
    return decodeURIComponent(new URL(url).pathname);
  } catch {
    return url;
  }
};

export function CrawlDiffPanel({ diff, project, others, current }: { diff: CrawlDiff; project: string; others: Array<{ runId: string; startedAt: string }>; current: string }) {
  const changed = diff.issues.filter((issue) => issue.fixed.length || issue.introduced.length || issue.inNewUrls);
  return (
    <section className="crawl-diff" aria-labelledby="diff-titulo">
      <div className="section-heading">
        <div>
          <h2 id="diff-titulo">Cambios desde el crawl anterior</h2>
          <p>
            Frente al crawl del {when(diff.base.startedAt)}. Se comparan las {diff.urls.common.toLocaleString("es-ES")} URL rastreadas en los dos; las que solo están en uno se cuentan aparte, sin darlas por corregidas ni por rotas.
          </p>
        </div>
        {others.length > 1 ? (
          <nav className="rp-filter" aria-label="Comparar con otro crawl">
            {others.map((item) => (
              <Link key={item.runId} href={`/crawls/${project}/${current}?vs=${item.runId}`} aria-current={item.runId === diff.base.runId ? "page" : undefined}>
                {when(item.startedAt)}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <div className="wb-kpis">
        <div className="wb-card wb-kpi">
          <span>Incidencias corregidas</span>
          <strong className={diff.totals.fixed ? "tone-good" : undefined}>{diff.totals.fixed.toLocaleString("es-ES")}</strong>
          <small>{diff.totals.severeFixed} críticas o altas</small>
        </div>
        <div className="wb-card wb-kpi">
          <span>Incidencias nuevas</span>
          <strong className={diff.totals.introduced ? "tone-bad" : undefined}>{diff.totals.introduced.toLocaleString("es-ES")}</strong>
          <small>{diff.totals.severeIntroduced} críticas o altas</small>
        </div>
        <div className="wb-card wb-kpi">
          <span>URL nuevas en el recorrido</span>
          <strong>{diff.urls.added.length.toLocaleString("es-ES")}</strong>
          <small>{diff.urls.removed.length.toLocaleString("es-ES")} ya no aparecen</small>
        </div>
        <div className="wb-card wb-kpi">
          <span>Cambios URL a URL</span>
          <strong>{diff.changes.length.toLocaleString("es-ES")}</strong>
          <small>HTTP, indexabilidad, canonical, title y H1</small>
        </div>
      </div>

      {changed.length ? (
        <ScrollRegion label="Incidencias que cambian entre crawls">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Incidencia</th>
                <th>Prioridad</th>
                <th>Antes</th>
                <th>Ahora</th>
                <th>Corregidas</th>
                <th>Nuevas</th>
                <th>En URL nuevas</th>
              </tr>
            </thead>
            <tbody>
              {changed.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <strong>{issue.label}</strong>
                    {issue.introduced.length ? <span className="rp-sub">Nueva en {issue.introduced.slice(0, 3).map(pathOf).join(", ")}{issue.introduced.length > 3 ? "…" : ""}</span> : null}
                  </td>
                  <td>{SEVERITY[issue.severity]}</td>
                  <td>{issue.before}</td>
                  <td>{issue.after}</td>
                  <td className={issue.fixed.length ? "tone-good" : undefined}>{issue.fixed.length || "—"}</td>
                  <td className={issue.introduced.length ? "tone-bad" : undefined}>{issue.introduced.length || "—"}</td>
                  <td>{issue.inNewUrls || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      ) : (
        <p className="tool-note">Ninguna incidencia cambia en las URL que están en los dos crawls.</p>
      )}

      {diff.changes.length ? (
        <details className="crawl-diff-changes">
          <summary>Ver los {diff.changes.length.toLocaleString("es-ES")} cambios URL a URL</summary>
          <ScrollRegion label="Cambios URL a URL">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Campo</th>
                  <th>Antes</th>
                  <th>Ahora</th>
                </tr>
              </thead>
              <tbody>
                {diff.changes.slice(0, 300).map((change, index) => (
                  <tr key={`${change.url}-${change.field}-${index}`}>
                    <td>
                      <Link href={`/crawls/${project}/${current}/url?${new URLSearchParams({ u: change.url })}`}>{pathOf(change.url)}</Link>
                    </td>
                    <td>{FIELD[change.field]}</td>
                    <td>{change.before}</td>
                    <td>{change.after}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollRegion>
        </details>
      ) : null}
    </section>
  );
}
