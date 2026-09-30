import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS } from "@seo/contracts";
import { buildSummary, urlRows } from "@seo/site-audit";
import { SiteAuditPanel } from "@seo/site-audit/panel";
import { diffRuns } from "@seo/site-audit/diff";
import { listRuns, loadRun, readPublished } from "@seo/site-audit/runs";
import { Notice } from "@seo/ui";
import { CrawlDiffPanel } from "@/components/crawl-diff";
import { CrawlSitemaps } from "@/components/crawl-sitemaps";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { AutoRefresh } from "../../auto-refresh";
import { CrawlUrlTable } from "../../url-table";

export const metadata: Metadata = { title: "Crawl" };
export const dynamic = "force-dynamic";

/**
 * Detalle de un crawl (D-070, D-071). Mientras corre, muestra el avance y se
 * refresca; al terminar, el panel que verá el visor (resumen que se publicaría)
 * y, debajo, los sitemaps encontrados con su estructura de URL y todas las URL
 * del crawl completo con enlace a su ficha.
 */
export default async function CrawlDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ project: string; runId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { project, runId } = await params;
  const run = loadRun(project, runId);
  if (!run) notFound();
  // D-080: por defecto se compara con el crawl completo anterior del proyecto; `?vs=` elige otro.
  const vs = (await searchParams).vs;
  const others = listRuns(run.project).filter((item) => item.runId !== run.runId && item.status !== "running" && item.status !== "failed");
  const baseMeta = others.find((item) => item.runId === (Array.isArray(vs) ? vs[0] : vs)) ?? others.find((item) => item.startedAt < run.startedAt) ?? null;
  const base = baseMeta && run.status !== "running" ? loadRun(run.project, baseMeta.runId) : null;
  const brand = BRANDS.find((item) => item.slug === run.project);
  const published = readPublished().audits[run.project]?.runId === run.runId;

  return (
    <WorkbenchFrame eyebrow={`Workbench · Crawls · ${brand?.name ?? run.project}`} title="Estado del sitio" description={`Crawl ${run.runId} de ${run.startUrl}.`} crumb={brand?.name ?? run.project}>
      <p className="tool-note">
        <Link href="/crawls">← Todos los crawls</Link>
      </p>
      {run.status === "running" ? (
        <section className="crawl-progress" aria-live="polite">
          <AutoRefresh />
          <h2>Crawl en curso</h2>
          <progress max={run.config.maxUrls} value={run.pages.length} />
          <p>
            {run.pages.length.toLocaleString("es-ES")} de {run.config.maxUrls.toLocaleString("es-ES")} URL · última: {run.pages.at(-1)?.url ?? "leyendo robots.txt y sitemap…"}
          </p>
          <p>Para detenerlo, pídelo en el chat.</p>
        </section>
      ) : run.status === "failed" ? (
        <Notice tone="danger">El crawl falló: {run.error}</Notice>
      ) : (
        <>
          {published ? <Notice tone="info">Este es el crawl publicado en el visor (pestaña «Estado del sitio» del proyecto).</Notice> : <Notice tone="info">Vista previa del resumen que llegaría al visor. Para publicarlo, pídelo en el chat: «publica el crawl de {brand?.name ?? run.project}».</Notice>}
          {run.status === "stopped" ? <Notice tone="warn">Crawl detenido antes del tope: el resumen solo cubre las URL rastreadas.</Notice> : null}
          <SiteAuditPanel summary={buildSummary(run)} showPages={false} note={`${run.queuedWhenDone.toLocaleString("es-ES")} URL quedaron en cola al llegar al tope`} />
          {base ? (
            <CrawlDiffPanel diff={diffRuns(base, run)} project={run.project} current={run.runId} others={others.map((item) => ({ runId: item.runId, startedAt: item.startedAt }))} />
          ) : (
            <p className="tool-note">Es el primer crawl de {brand?.name ?? run.project}: con el siguiente aparecerá aquí qué se ha corregido y qué es nuevo.</p>
          )}
          <CrawlSitemaps run={run} base={`/crawls/${run.project}/${run.runId}`} brandName={brand?.name ?? run.project} />
          <section className="crawl-urls" aria-labelledby="urls-titulo">
            <h2 id="urls-titulo">URL rastreadas</h2>
            <p>Todas las URL del crawl con sus datos on-page. Abre una para ver su ficha completa: metadatos, encabezados, enlaces, hreflang, schema e incidencias explicadas.</p>
            <CrawlUrlTable rows={urlRows(run)} base={`/crawls/${run.project}/${run.runId}`} />
          </section>
        </>
      )}
    </WorkbenchFrame>
  );
}
