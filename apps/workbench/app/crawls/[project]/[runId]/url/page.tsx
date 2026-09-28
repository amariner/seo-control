import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SITE_AUDIT_CATEGORY_LABELS, SITE_AUDIT_SEVERITY_LABELS } from "@seo/contracts";
import { THRESHOLDS, urlReport, type LinkedUrl } from "@seo/site-audit";
import { loadRun } from "@seo/site-audit/runs";
import { Notice } from "@seo/ui";
import { WorkbenchFrame } from "@/components/workbench-frame";

export const metadata: Metadata = { title: "URL del crawl · Workbench" };
export const dynamic = "force-dynamic";

const fmt = (value: number) => value.toLocaleString("es-ES");
const none = <span className="sa-muted">—</span>;
const statusClass = (status: number | null) => (status === null ? "sa-muted" : status >= 400 || status === 0 ? "url-bad" : status >= 300 ? "url-warn" : "url-ok");
const pathOf = (url: string) => {
  const parsed = new URL(url);
  return `${decodeURI(parsed.pathname)}${parsed.search}`;
};

function Facts({ items }: { items: Array<[string, ReactNode]> }) {
  return (
    <dl className="url-facts">
      {items.map(([term, value]) => (
        <div key={term} style={{ display: "contents" }}>
          <dt>{term}</dt>
          <dd>{value ?? none}</dd>
        </div>
      ))}
    </dl>
  );
}

function length(value: string | null, min: number, max: number) {
  if (!value) return none;
  const size = value.length;
  const flag = size > max ? `más de ${max}` : size < min ? `menos de ${min}` : null;
  return (
    <>
      {value}
      <small className={flag ? "url-warn" : undefined}>
        {size} caracteres{flag ? ` · ${flag}` : ""}
      </small>
    </>
  );
}

/**
 * Ficha de una URL del crawl (D-071): todo lo que el crawler sabe de ella,
 * con las incidencias explicadas y sus enlaces entrantes y salientes, para
 * decidir qué corregir sin salir del workbench.
 */
export default async function CrawlUrlPage({ params, searchParams }: { params: Promise<{ project: string; runId: string }>; searchParams: Promise<{ u?: string }> }) {
  const { project, runId } = await params;
  const { u } = await searchParams;
  const run = loadRun(project, runId);
  if (!run || !u) notFound();
  const report = urlReport(run, u);
  if (!report) notFound();
  const { page, row } = report;
  const facts = page.facts;
  const base = `/crawls/${run.project}/${run.runId}`;
  const linkTo = (item: LinkedUrl) =>
    item.crawled ? (
      <Link href={`${base}/url?u=${encodeURIComponent(item.url)}`}>{pathOf(item.url)}</Link>
    ) : (
      <span title={item.blocked ? "Bloqueada por robots.txt: no se rastreó" : "Fuera del tope del crawl: no se rastreó"}>{pathOf(item.url)}</span>
    );

  return (
    <WorkbenchFrame eyebrow={`Workbench · Crawls · ${run.domain}`} title={row.path} description={row.title ?? "Sin title"} subtitle="Crawls" current="/crawls">
      <div className="url-head">
        <Link href={base}>← Crawl del {new Date(run.startedAt).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" })}</Link>
        <a href={page.url} target="_blank" rel="noreferrer">
          Abrir {page.url} ↗
        </a>
      </div>

      {row.indexable ? null : <Notice tone="warn">No indexable: {row.notIndexableReason}.</Notice>}

      <div className="url-grid">
        <section className="url-block" aria-labelledby="url-http">
          <h2 id="url-http">Respuesta y rastreo</h2>
          <Facts
            items={[
              ["Código HTTP", <span className={statusClass(page.status)}>{page.status || `Sin respuesta${page.error ? `: ${page.error}` : ""}`}</span>],
              ["Redirige a", page.redirectTo ? <Link href={`${base}/url?u=${encodeURIComponent(page.redirectTo)}`}>{page.redirectTo}</Link> : null],
              ["Le redirigen", report.redirectedFrom.length ? report.redirectedFrom.map(pathOf).join(", ") : null],
              ["Indexable", row.indexable ? "Sí" : `No · ${row.notIndexableReason}`],
              ["Profundidad", `${row.depth} ${row.depth === 1 ? "clic" : "clics"} desde la portada`],
              ["En el sitemap", row.inSitemap ? "Sí" : "No"],
              ["Tipo de contenido", page.contentType],
              ["X-Robots-Tag", page.xRobotsTag],
              ["Tiempo de respuesta", <>{fmt(page.responseMs)} ms{page.responseMs > THRESHOLDS.slowMs ? <small className="url-warn">lento</small> : null}<small>medido desde local</small></>],
              ["Peso del HTML", page.bytes ? `${fmt(Math.round(page.bytes / 1024))} KB` : null],
            ]}
          />
        </section>

        <section className="url-block" aria-labelledby="url-issues">
          <h2 id="url-issues">Incidencias ({report.issues.length})</h2>
          {report.issues.length ? (
            <ul className="url-issues">
              {report.issues.map((issue) => (
                <li key={issue.id}>
                  <span className={`sa-sev is-${issue.severity}`}>{SITE_AUDIT_SEVERITY_LABELS[issue.severity]}</span>
                  <strong>{issue.label}</strong>
                  <small>
                    {SITE_AUDIT_CATEGORY_LABELS[issue.category]} · {issue.description}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">Sin incidencias.</p>
          )}
        </section>

        {facts ? (
          <>
            <section className="url-block" aria-labelledby="url-meta">
              <h2 id="url-meta">Metadatos</h2>
              <Facts
                items={[
                  ["Title", length(facts.title, THRESHOLDS.titleMin, THRESHOLDS.titleMax)],
                  ["Meta description", length(facts.description, THRESHOLDS.descriptionMin, THRESHOLDS.descriptionMax)],
                  ["Canonical", facts.canonical ? <>{facts.canonical}{facts.canonical === page.url ? <small>propio</small> : <small className="url-warn">a otra URL</small>}</> : null],
                  ["Meta robots", facts.robotsMeta],
                  ["Idioma (lang)", facts.lang],
                  ["Open Graph", facts.openGraph ? "Sí" : "No"],
                  ["Schema (JSON-LD)", facts.schemaTypes.length ? facts.schemaTypes.join(", ") : null],
                ]}
              />
            </section>

            <section className="url-block" aria-labelledby="url-content">
              <h2 id="url-content">Contenido</h2>
              <Facts
                items={[
                  [`H1 (${facts.h1.length})`, facts.h1.length ? facts.h1.map((text, index) => <div key={index}>{text || <span className="sa-muted">(vacío)</span>}</div>) : null],
                  ["H2", fmt(facts.h2Count)],
                  ["Palabras", <>{fmt(facts.wordCount)}{facts.wordCount < THRESHOLDS.thinWords ? <small className="url-warn">escaso</small> : null}</>],
                  ["Imágenes", `${fmt(facts.images)}${facts.imagesWithoutAlt ? ` · ${fmt(facts.imagesWithoutAlt)} sin alt` : ""}`],
                  ["Enlaces internos", `${fmt(facts.internalLinks.length)} salientes · ${fmt(report.inlinks.length)} entrantes`],
                  ["Enlaces externos", fmt(facts.externalLinks)],
                  ["Enlaces nofollow", fmt(facts.nofollowLinks)],
                ]}
              />
            </section>

            <section className="url-block" aria-labelledby="url-hreflang">
              <h2 id="url-hreflang">Hreflang ({facts.hreflang.length})</h2>
              {facts.hreflang.length ? (
                <ul className="url-list">
                  {facts.hreflang.map((item) => (
                    <li key={`${item.lang}-${item.href}`}>
                      <span>{item.lang}</span>
                      <a href={item.href} target="_blank" rel="noreferrer">
                        {item.href}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="sa-muted">Sin hreflang.</p>
              )}
            </section>
          </>
        ) : null}

        <section className="url-block" aria-labelledby="url-inlinks">
          <h2 id="url-inlinks">Enlaces entrantes ({report.inlinks.length})</h2>
          {report.inlinks.length ? (
            <ul className="url-list">
              {report.inlinks.map((item) => (
                <li key={item.url}>{linkTo(item)}</li>
              ))}
            </ul>
          ) : (
            <p className="sa-muted">Ninguna página rastreada enlaza aquí.</p>
          )}
        </section>

        {facts ? (
          <section className="url-block" aria-labelledby="url-outlinks">
            <h2 id="url-outlinks">Enlaces internos salientes ({report.outlinks.length})</h2>
            <ul className="url-list">
              {report.outlinks.map((item) => (
                <li key={item.url}>
                  {linkTo(item)}
                  <span className={statusClass(item.status)}>{item.status ?? (item.blocked ? "bloqueada por robots" : "fuera del tope")}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </WorkbenchFrame>
  );
}
