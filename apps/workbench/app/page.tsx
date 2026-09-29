import Link from "next/link";
import { ArrowUpRight, Bot, FileCheck2, ScanSearch, ShieldCheck, UploadCloud } from "lucide-react";
import { BRANDS } from "@seo/contracts";
import { listRuns } from "@seo/site-audit/runs";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { listAdditionalReports } from "@/lib/additional-reports";
import { reportCatalog } from "@/lib/reports";
import { getWorkbenchState } from "@/lib/state";
import { publishStatus } from "@/lib/sync-status";

export const dynamic = "force-dynamic";

/**
 * Inicio del workbench (D-077): estado real de lo que se prepara en local y de
 * lo que falta por llevar al visor. Cada cifra sale de un fichero o de git;
 * nada es de demostración.
 */
const STAGES = [
  ["01", ScanSearch, "Adquirir", "Crawls hasta 1.000 URL e importación editorial con procedencia.", "disponible"],
  ["02", Bot, "Depurar", "Curación editorial, puntualizaciones de informes y revisión.", "disponible"],
  ["03", FileCheck2, "Aprobar", "Autor y revisor distintos antes de publicar.", "P5"],
  ["04", ShieldCheck, "Firmar", "Contrato, allowlist, hash y firma del paquete.", "P5"],
  ["05", UploadCloud, "Promover", "Hoy: commit y despliegue pedidos en el chat.", "manual"],
] as const;

const when = (iso: string) => new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });
const brandName = (slug: string) => BRANDS.find((brand) => brand.slug === slug)?.name ?? slug;
const nf = (value: number) => value.toLocaleString("es-ES");

type Activity = { id: string; at: string; title: string; detail: string; href?: string; tone: "good" | "warn" | "neutral" };

export default async function Page() {
  const state = await getWorkbenchState();
  const { preflight, curation } = state;
  const catalog = reportCatalog();
  const runs = listRuns();
  const additional = listAdditionalReports();
  const sync = publishStatus();
  const frozen = catalog.rows.filter((row) => row.published?.snapshot);
  const pendingReports = catalog.rows.filter((row) => row.sync === "pending" || row.sync === "new");
  const lastRun = runs[0];
  const curated = curation.curatedPieces + curation.createdPieces + curation.curatedSlots + curation.curatedEvents;
  const toSync = sync.channels.filter((channel) => channel.changed.length);

  const activity: Activity[] = [
    ...state.history.map((event) => ({ ...event, href: event.id === "curation" ? "/editorial" : undefined })),
    ...frozen.map((row) => ({
      id: `snapshot-${row.id}`,
      at: row.published!.snapshot!.generatedAt,
      title: `Informe congelado · ${row.brand.name} · ${row.period.label}`,
      detail: `${row.published!.snapshot!.generatedBy} · corte ${row.published!.snapshot!.cutoff}`,
      href: `/informes/${row.brand.slug}/${row.period.id}`,
      tone: "good" as const,
    })),
    ...catalog.rows
      .filter((row) => row.published?.curation)
      .map((row) => ({
        id: `curation-${row.id}`,
        at: row.published!.curation!.updatedAt,
        title: `Puntualizaciones · ${row.brand.name} · ${row.period.label}`,
        detail: `${row.notes} ajustes · ${row.published!.curation!.updatedBy}`,
        href: `/informes/${row.brand.slug}/${row.period.id}`,
        tone: "neutral" as const,
      })),
    ...runs.slice(0, 5).map((run) => ({
      id: `run-${run.runId}`,
      at: run.startedAt,
      title: `Crawl ${run.status === "complete" ? "completo" : run.status === "running" ? "en curso" : run.status === "failed" ? "fallido" : "detenido"} · ${brandName(run.project)}`,
      detail: `${nf(run.crawled)} de ${nf(run.maxUrls)} URL${run.published ? " · publicado en el visor" : ""}`,
      href: `/crawls/${run.project}/${run.runId}`,
      tone: run.status === "failed" ? ("warn" as const) : ("neutral" as const),
    })),
    ...additional.slice(0, 5).map((report) => ({
      id: `add-${report.path}`,
      at: report.updatedAt,
      title: `Informe adicional · ${report.title}`,
      detail: `${report.projectName} · ${report.status} · dato ${report.data}`,
      href: `/informes/adicionales/${report.path}`,
      tone: report.status === "solicitado" ? ("warn" as const) : ("neutral" as const),
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 8);

  return (
    <WorkbenchFrame
      eyebrow="Workbench local"
      title="Inicio"
      description="Lo que se prepara en este equipo —plan editorial, informes y crawls— y lo que falta por llevar al visor. Todo lo que ves sale de ficheros locales o de git."
      aside={
        <div className="wb-card preflight">
          <div className="preflight-head">
            <span className="eyebrow" style={{ margin: 0 }}>Espacio disponible</span>
            <span className={`status-dot ${preflight && preflight.freeGiB >= 3 ? "status-dot-ready" : ""}`} aria-hidden />
          </div>
          <strong>{preflight ? `${preflight.freeGiB} GiB libres` : "No se pudo medir"}</strong>
          <small>{preflight?.ready ? "Preparado para crawls grandes" : `Crawls de hasta 1.000 URL; los grandes piden ${preflight?.requiredGiB ?? 50} GiB`}</small>
        </div>
      }
    >
      <section className="wb-kpis" aria-label="Resumen">
        <Link className="wb-card wb-kpi" href="/editorial/plan">
          <span>Plan editorial</span>
          <strong>{nf(state.editorialRows)}</strong>
          <small>piezas · {nf(state.events)} eventos · {curated ? `${nf(curated)} cambios curados` : "sin curación"}</small>
        </Link>
        <Link className="wb-card wb-kpi" href="/informes">
          <span>Informes congelados</span>
          <strong>{frozen.length}</strong>
          <small>{pendingReports.length ? `${pendingReports.length} sin subir al visor` : "al día con el último commit"}</small>
        </Link>
        <Link className="wb-card wb-kpi" href="/crawls">
          <span>Crawls locales</span>
          <strong>{runs.length}</strong>
          <small>{lastRun ? `Último: ${brandName(lastRun.project)}, ${when(lastRun.startedAt)}` : "Ninguno todavía"}</small>
        </Link>
        <Link className="wb-card wb-kpi" href="/informes/adicionales">
          <span>Informes adicionales</span>
          <strong>{additional.length}</strong>
          <small>{additional.filter((report) => report.status === "solicitado").length} solicitados · solo en local</small>
        </Link>
      </section>

      <div className="wb-grid wb-grid-even">
        <section className="wb-card panel" aria-labelledby="preview">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Sincronización con preview</p>
              <h2 id="preview">Pendiente de llevar al visor</h2>
            </div>
            <span className={`badge ${toSync.length ? "badge-warn" : "badge-good"}`}>{toSync.length ? `${toSync.length} por subir` : "al día"}</span>
          </div>
          <ul className="wb-sync">
            {sync.channels.map((channel) => (
              <li key={channel.id}>
                <Link href={channel.href}>
                  <strong>{channel.label}</strong>
                  <span>{channel.changed.length ? `${channel.changed.length} ${channel.changed.length === 1 ? "fichero cambiado" : "ficheros cambiados"} sin commit` : "Igual que el último commit"}</span>
                </Link>
                {channel.changed.length ? <code>«{channel.ask}»</code> : <span className="badge badge-good">al día</span>}
              </li>
            ))}
          </ul>
          <p className="tool-note">
            El visor desplegado se construye desde un commit: lo que no está en él no ha llegado. Pídelo en el chat con la frase de cada fila; Claude revisa el diff, confirma contigo, hace commit y <code>vercel deploy --prod</code>.
            {sync.head ? ` Último commit: ${sync.head}.` : ""}
          </p>
        </section>

        <section className="wb-card panel timeline" aria-labelledby="actividad">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Trazabilidad</p>
              <h2 id="actividad">Actividad reciente</h2>
            </div>
          </div>
          {activity.map((event) => (
            <div className="timeline-row" key={event.id}>
              <time dateTime={event.at}>{new Date(event.at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</time>
              <span className="timeline-dot" />
              <div>
                <strong>{event.href ? <Link href={event.href}>{event.title}</Link> : event.title}</strong>
                <p>{event.detail}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <section className="wb-flow" aria-labelledby="flujo">
        <div className="section-heading">
          <div>
            <h2 id="flujo">Flujo de publicación</h2>
            <p>Del dato local al visor. Aprobar y firmar llegan con P5; hasta entonces, promover es un commit y un despliegue pedidos en el chat.</p>
          </div>
          <Link className="section-link" href="/herramientas">Herramientas locales <ArrowUpRight size={14} aria-hidden /></Link>
        </div>
        <div className="pipeline">
          {STAGES.map(([number, Icon, title, copy, status]) => (
            <article className="wb-card stage" key={number}>
              <span className="stage-number">{number}</span>
              <Icon size={20} aria-hidden />
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className={`badge ${status === "disponible" ? "badge-good" : status === "manual" ? "" : "badge-warn"}`}>{status}</span>
            </article>
          ))}
        </div>
      </section>
    </WorkbenchFrame>
  );
}
