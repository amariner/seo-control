import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BRANDS } from "@seo/contracts";
import { buildSummary, urlRows } from "@seo/site-audit";
import { SiteAuditPanel } from "@seo/site-audit/panel";
import { loadRun, readPublished } from "@seo/site-audit/runs";
import { Notice } from "@seo/ui";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { AutoRefresh } from "../../auto-refresh";
import { CrawlUrlTable } from "../../url-table";

export const metadata: Metadata = { title: "Crawl · Workbench" };
export const dynamic = "force-dynamic";

/**
 * Detalle de un crawl (D-070, D-071). Mientras corre, muestra el avance y se
 * refresca; al terminar, el panel que verá el visor (resumen que se publicaría)
 * y, debajo, todas las URL del crawl completo con enlace a su ficha.
 */
export default async function CrawlDetailPage({ params }: { params: Promise<{ project: string; runId: string }> }) {
  const { project, runId } = await params;
  const run = loadRun(project, runId);
  if (!run) notFound();
  const brand = BRANDS.find((item) => item.slug === run.project);
  const published = readPublished().audits[run.project]?.runId === run.runId;

  return (
    <WorkbenchFrame eyebrow={`Workbench · Crawls · ${brand?.name ?? run.project}`} title="Estado del sitio" description={`Crawl ${run.runId} de ${run.startUrl}.`} subtitle="Crawls" current="/crawls">
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
