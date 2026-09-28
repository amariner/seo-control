import { SITE_AUDIT_CATEGORY_LABELS, SITE_AUDIT_SEVERITY_LABELS, type SiteAuditSeverity, type SiteAuditSummary } from "@seo/contracts";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";
import "./panel.css";

const fmt = (value: number) => value.toLocaleString("es-ES");
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "—");
const date = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const SEVERITIES: SiteAuditSeverity[] = ["critica", "alta", "media", "baja"];

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="sa-metric">
      <span className="sa-metric-label">{label}</span>
      <strong className="sa-metric-value">{value}</strong>
      {note ? <span className="sa-metric-note">{note}</span> : null}
    </div>
  );
}

/**
 * Estado del sitio (D-070): panel del resumen de un crawl. Lo usan la pestaña
 * del proyecto en el visor y el detalle del crawl en el workbench, con el mismo
 * resumen que se publica. Sin puntuación opaca: páginas afectadas por severidad.
 */
export function SiteAuditPanel({ summary, note, showPages = true }: { summary: SiteAuditSummary; note?: string; /** El workbench pinta su propia tabla con el crawl completo (D-071). */ showPages?: boolean }) {
  const t = summary.totals;
  const origin = `https://${summary.domain}`;
  const bySeverity = Object.fromEntries(SEVERITIES.map((severity) => [severity, summary.issues.filter((issue) => issue.severity === severity)])) as Record<SiteAuditSeverity, SiteAuditSummary["issues"]>;
  const label = Object.fromEntries(summary.issues.map((issue) => [issue.id, issue.label]));
  const severityOf = Object.fromEntries(summary.issues.map((issue) => [issue.id, issue.severity]));
  const errors = t.clientErrors + t.serverErrors + t.failed;

  const rows: ReportDataRow[] = summary.pages.map((page) => {
    const worst = SEVERITIES.find((severity) => page.issues.some((id) => severityOf[id] === severity)) ?? null;
    const values = {
      path: page.path,
      status: String(page.status || "Sin respuesta"),
      indexable: page.indexable ? "Sí" : "No",
      depth: page.depth,
      title: page.title,
      titleLength: page.titleLength,
      descriptionLength: page.descriptionLength,
      h1Count: page.h1Count,
      wordCount: page.wordCount,
      responseMs: page.responseMs,
      worst: worst ? SITE_AUDIT_SEVERITY_LABELS[worst] : "Sin incidencias",
      issues: page.issues.length,
    };
    return {
      id: page.path,
      values,
      searchText: `${page.path} ${page.title ?? ""} ${page.issues.map((id) => label[id]).join(" ")}`,
      cells: {
        path: (
          <a href={`${origin}${page.path}`} target="_blank" rel="noreferrer" className="sa-path" title={`${origin}${page.path}`}>
            {page.path}
          </a>
        ),
        status: <span className={`sa-status is-${page.status >= 400 || page.status === 0 ? "bad" : page.status >= 300 ? "warn" : "ok"}`}>{page.status || "—"}</span>,
        title: page.title ?? <span className="sa-muted">—</span>,
        responseMs: `${fmt(page.responseMs)} ms`,
        worst: worst ? <span className={`sa-sev is-${worst}`}>{SITE_AUDIT_SEVERITY_LABELS[worst]}</span> : <span className="sa-muted">—</span>,
        issues: page.issues.length ? <span title={page.issues.map((id) => label[id]).join("\n")}>{page.issues.length}</span> : <span className="sa-muted">0</span>,
      },
    };
  });
  const opts = (values: string[]) => [...new Set(values)].sort().map((value) => ({ value, label: value }));

  return (
    <div className="sa-panel">
      <p className="sa-meta">
        Crawl del {date(summary.completedAt)} · {fmt(t.crawled)} URL desde <a href={summary.startUrl} target="_blank" rel="noreferrer">{summary.startUrl}</a> (tope {fmt(summary.config.maxUrls)}) · robots.txt {summary.config.respectRobots ? "respetado" : "ignorado"}
        {note ? ` · ${note}` : ""}
      </p>

      <div className="sa-metrics">
        <Metric label="URL rastreadas" value={fmt(t.crawled)} note={`${fmt(t.html)} páginas HTML`} />
        <Metric label="Indexables" value={pct(t.indexable, t.crawled)} note={`${fmt(t.indexable)} de ${fmt(t.crawled)}`} />
        <Metric label="Con incidencias graves" value={fmt(t.pagesWithSevere)} note="críticas o altas" />
        <Metric label="Errores HTTP" value={fmt(errors)} note={`${fmt(t.redirects)} redirecciones`} />
        <Metric label="Respuesta media" value={`${(t.avgResponseMs / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} s`} note={`p90 ${(t.p90ResponseMs / 1000).toLocaleString("es-ES", { maximumFractionDigits: 1 })} s, desde local`} />
      </div>

      <section className="sa-block" aria-labelledby="sa-issues">
        <h3 id="sa-issues">Incidencias</h3>
        <p className="sa-sub">
          {summary.issues.length} tipos detectados. Cada fila dice cuántas URL rastreadas afecta y enseña hasta 10 ejemplos.
        </p>
        {SEVERITIES.map((severity) =>
          bySeverity[severity].length ? (
            <div key={severity} className="sa-group">
              <h4>
                <span className={`sa-sev is-${severity}`}>{SITE_AUDIT_SEVERITY_LABELS[severity]}</span>
              </h4>
              <ul className="sa-issues">
                {bySeverity[severity].map((issue) => (
                  <li key={issue.id}>
                    <details>
                      <summary>
                        <span className="sa-issue-name">
                          <strong>{issue.label}</strong>
                          <small>
                            {SITE_AUDIT_CATEGORY_LABELS[issue.category]} · {issue.description}
                          </small>
                        </span>
                        <span className="sa-issue-count">
                          {fmt(issue.affected)} <small>{pct(issue.affected, t.crawled)}</small>
                        </span>
                      </summary>
                      <ul className="sa-sample">
                        {issue.sample.map((path) => (
                          <li key={path}>
                            <a href={`${origin}${path}`} target="_blank" rel="noreferrer">
                              {path}
                            </a>
                          </li>
                        ))}
                        {issue.affected > issue.sample.length ? <li className="sa-muted">y {fmt(issue.affected - issue.sample.length)} más en la tabla de páginas</li> : null}
                      </ul>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </section>

      <section className="sa-block sa-facts" aria-label="Rastreo e idiomas">
        <div>
          <h3>Respuestas HTTP</h3>
          <ul className="sa-dist">
            {summary.statusDistribution.map((item) => (
              <li key={item.status}>
                <span>{item.status || "Sin respuesta"}</span>
                <strong>{fmt(item.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Profundidad (clics desde la portada)</h3>
          <ul className="sa-dist">
            {summary.depthDistribution.map((item) => (
              <li key={item.depth}>
                <span>{item.depth === 0 ? "Portada" : `${item.depth} ${item.depth === 1 ? "clic" : "clics"}`}</span>
                <strong>{fmt(item.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Idiomas (atributo lang)</h3>
          <ul className="sa-dist">
            {summary.languages.map((item) => (
              <li key={item.lang}>
                <span>{item.lang}</span>
                <strong>{fmt(item.count)}</strong>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Cobertura</h3>
          <ul className="sa-dist">
            <li>
              <span>URL en el sitemap</span>
              <strong>{fmt(t.sitemapUrls)}</strong>
            </li>
            <li>
              <span>Rastreadas y en el sitemap</span>
              <strong>{fmt(t.crawledInSitemap)}</strong>
            </li>
            <li>
              <span>Descubiertas y bloqueadas por robots.txt</span>
              <strong>{fmt(t.blockedByRobots)}</strong>
            </li>
          </ul>
        </div>
      </section>

      {showPages ? (
      <section className="sa-block" aria-labelledby="sa-pages">
        <h3 id="sa-pages">Páginas</h3>
        <ReportDataTable
          id="estado-paginas"
          caption="Páginas rastreadas"
          searchPlaceholder="Buscar URL, title o incidencia…"
          columns={[
            { key: "path", label: "URL" },
            { key: "status", label: "HTTP" },
            { key: "indexable", label: "Indexable" },
            { key: "worst", label: "Peor incidencia" },
            { key: "issues", label: "Incidencias", numeric: true },
            { key: "depth", label: "Profundidad", numeric: true },
            { key: "title", label: "Title" },
            { key: "titleLength", label: "Long. title", numeric: true },
            { key: "descriptionLength", label: "Long. description", numeric: true },
            { key: "h1Count", label: "H1", numeric: true },
            { key: "wordCount", label: "Palabras", numeric: true },
            { key: "responseMs", label: "Respuesta", numeric: true },
          ]}
          filters={[
            { key: "worst", label: "Peor incidencia", options: opts(rows.map((row) => String(row.values.worst))) },
            { key: "status", label: "HTTP", options: opts(rows.map((row) => String(row.values.status))) },
            { key: "indexable", label: "Indexable", options: opts(rows.map((row) => String(row.values.indexable))) },
          ]}
          rows={rows}
          note={`${summary.pagesTruncated ? `Se muestran ${fmt(summary.pages.length)} de ${fmt(t.crawled)} URL (primero las de peor severidad). ` : ""}Fuente: crawl local del workbench (${summary.runId}), publicado el ${date(summary.publishedAt)}. ${summary.config.selection}`}
        />
      </section>
      ) : null}
    </div>
  );
}
