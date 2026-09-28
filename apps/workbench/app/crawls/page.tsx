import type { Metadata } from "next";
import Link from "next/link";
import { BRANDS } from "@seo/contracts";
import { SMALL_CRAWL_MAX_URLS, diskPreflight } from "@seo/local-data";
import { listRuns } from "@seo/site-audit/runs";
import { Notice } from "@seo/ui";
import { WorkbenchFrame } from "@/components/workbench-frame";

export const metadata: Metadata = { title: "Crawls · Workbench" };
export const dynamic = "force-dynamic";

const STATUS = { running: "En curso", complete: "Completo", stopped: "Detenido", failed: "Fallido" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

/**
 * Crawls (D-070, D-071): listado de los crawls locales. Se lanzan desde el chat
 * (`pnpm crawl`, proceso aparte que sobrevive a reinicios del workbench); aquí
 * se consultan URL a URL. Al visor solo llega el resumen, al publicarlo.
 */
export default async function CrawlsPage() {
  const runs = listRuns();
  const disk = await diskPreflight(process.cwd());

  return (
    <WorkbenchFrame eyebrow="Workbench · Técnico" title="Crawls" description="SEO on-page de las URL principales de cada proyecto. Aquí se consulta el crawl completo, URL a URL; al visor solo llega el resumen del estado del sitio." subtitle="Crawls" current="/crawls">
      <p className="tool-note crawl-howto">
        Los crawls se lanzan desde el chat de Claude Code («lanza un crawl de XTONE», «crawl de 500 URL de noken.com»), que ejecuta <code>pnpm crawl</code> como proceso aparte. Recorre en anchura desde la portada, respeta robots.txt y hace 2 peticiones a la vez con pausa. Hasta {SMALL_CRAWL_MAX_URLS.toLocaleString("es-ES")} URL basta con 3 GiB libres; más exige 50 GiB (ahora hay {disk.freeGiB} GiB).
      </p>

      <section className="crawl-runs" aria-labelledby="historial">
        <h2 id="historial">Crawls locales</h2>
        {runs.length ? (
          <table className="crawl-table">
            <thead>
              <tr>
                <th>Inicio</th>
                <th>Proyecto</th>
                <th>URL de inicio</th>
                <th>Estado</th>
                <th>URL</th>
                <th>En el visor</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId}>
                  <td>
                    <Link href={`/crawls/${run.project}/${run.runId}`}>{when(run.startedAt)}</Link>
                  </td>
                  <td>{BRANDS.find((brand) => brand.slug === run.project)?.name ?? run.project}</td>
                  <td className="crawl-start">{run.startUrl}</td>
                  <td>{STATUS[run.status]}</td>
                  <td>
                    {run.crawled.toLocaleString("es-ES")} / {run.maxUrls.toLocaleString("es-ES")}
                  </td>
                  <td>{run.published ? "Publicado" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Notice tone="info">Todavía no hay crawls locales.</Notice>
        )}
      </section>
    </WorkbenchFrame>
  );
}
