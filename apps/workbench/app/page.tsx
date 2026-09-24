import Link from "next/link";
import { Archive, Bot, CheckCircle2, FileCheck2, FileInput, ScanSearch, ShieldCheck, UploadCloud } from "lucide-react";
import { CrawlForm } from "@/components/crawl-form";
import { ReportEditor } from "@/components/report-editor";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { getWorkbenchState } from "@/lib/state";

const STAGES = [
  ["01", ScanSearch, "Adquirir", "Crawl o importación con límite y procedencia."],
  ["02", Bot, "Depurar", "Taxonomías, señales, IA UE y revisión."],
  ["03", FileCheck2, "Aprobar", "Autor y revisor deben ser distintos."],
  ["04", ShieldCheck, "Firmar", "Contrato, allowlist, hash y firma."],
  ["05", UploadCloud, "Promover", "Preview privada y aprobación GitHub."],
] as const;

const toneClass = { good: "badge-good", warn: "badge-warn", neutral: "" } as const;

export default async function Page() {
  const state = await getWorkbenchState();
  const { preflight, report, curation, history } = state;

  return (
    <WorkbenchFrame
      current="/"
      subtitle="Preparación y aprobación local"
      eyebrow="Piloto · Porcelanosa + Noken"
      title="Preparación de datos"
      description="Importa datos, prepara informes y revisa su estado."
      aside={
        <div className="wb-card preflight">
          <div className="preflight-head">
            <span className="eyebrow" style={{ margin: 0 }}>Espacio disponible</span>
            <span className={`status-dot ${preflight?.ready ? "status-dot-ready" : ""}`} aria-hidden />
          </div>
          <strong>{preflight ? `${preflight.freeGiB} GiB libres` : "No se pudo medir"}</strong>
          <small>{preflight?.ready ? "Preparado para crawls" : `Se requieren al menos ${preflight?.requiredGiB ?? 50} GiB libres`}</small>
        </div>
      }
    >
      <section className="pipeline" aria-label="Flujo de publicación">
        {STAGES.map(([number, Icon, title, copy]) => (
          <article className="wb-card stage" key={number}>
            <span className="stage-number">{number}</span>
            <Icon size={20} />
            <h2 className="ds-h3">{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>

      <div className="wb-grid">
        <div>
          <section className="wb-card panel">
            <div className="panel-head">
              <div><p className="eyebrow">Adquisición local</p><h2>Crawls e importaciones</h2></div>
              <span className="badge badge-good">Límite 50.000</span>
            </div>
            {/* Estado real, no demostración. Antes esta lista anunciaba dos
                crawls aprobados con recuentos inventados, cuando el preflight
                nunca ha permitido lanzar uno. */}
            <div className="job-list">
              <div className="job">
                <span className="job-icon"><FileInput size={15} /></span>
                <div>
                  <strong>Importación editorial de V1</strong>
                  <small>{state.editorialRows} filas · {state.events} eventos · {state.slots} huecos · {new Date(report.importedAt).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</small>
                </div>
                <span className={`badge ${report.rejections.length === 0 ? "badge-good" : "badge-warn"}`}>{report.rejections.length === 0 ? "íntegra" : `${report.rejections.length} rechazos`}</span>
              </div>
              <div className="job">
                <span className="job-icon"><Archive size={15} /></span>
                <div>
                  <strong>Crawls del piloto</strong>
                  <small>{preflight?.ready ? "Preflight aprobado: ningún crawl ejecutado todavía" : `Bloqueados por disco: ${preflight?.freeGiB ?? "?"} GiB de los ${preflight?.requiredGiB ?? 50} GiB exigidos`}</small>
                </div>
                <span className="badge badge-warn">{preflight?.ready ? "sin ejecutar" : "bloqueado"}</span>
              </div>
              <div className="job">
                <span className="job-icon"><CheckCircle2 size={15} /></span>
                <div>
                  <strong>Curación publicada</strong>
                  <small>
                    {curation.curatedPieces + curation.createdPieces + curation.curatedSlots + curation.curatedEvents === 0
                      ? "Sin curación todavía: el dataset que lee el visor es el importado de V1"
                      : `${curation.curatedPieces} editadas · ${curation.createdPieces} creadas · ${curation.curatedSlots} huecos · ${curation.curatedEvents} eventos`}
                  </small>
                </div>
                <span className="badge">{curation.curatedPieces + curation.createdPieces > 0 ? "activa" : "vacía"}</span>
              </div>
            </div>
            <CrawlForm ready={Boolean(preflight?.ready)} freeGiB={preflight?.freeGiB ?? null} requiredGiB={preflight?.requiredGiB ?? 50} />
            <p className="tool-note" style={{ marginTop: 12 }}>
              <Link href="/herramientas">Ver herramientas →</Link>
            </p>
          </section>

          <section className="wb-card panel timeline">
            <div className="panel-head">
              <div><p className="eyebrow">Trazabilidad</p><h2>Actividad reciente</h2></div>
              <span className="badge">{history.length} hito(s)</span>
            </div>
            {/* Solo entra lo que consta con fecha en una fuente local. Si la
                lista es corta, eso es el dato: no se rellena con actividad
                verosímil. */}
            {history.map((event) => (
              <div className="timeline-row" key={event.id}>
                <time dateTime={event.at}>{new Date(event.at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</time>
                <span className="timeline-dot" />
                <div>
                  <strong>{event.title}</strong>
                  <p>{event.detail}</p>
                </div>
                <span className={`badge ${toneClass[event.tone]}`}>{event.tone === "good" ? "ok" : event.tone === "warn" ? "revisar" : "—"}</span>
              </div>
            ))}
            <p className="tool-note" style={{ marginTop: 10 }}>Importaciones y versiones de curación registradas en local.</p>
          </section>
        </div>

        <section className="wb-card panel">
          <div className="panel-head">
            <div><p className="eyebrow">Editor local</p><h2>Borrador de informe</h2></div>
            <span className="badge badge-warn">revisión humana</span>
          </div>
          <ReportEditor />
          <div className="contract">Borrador en esta sesión. La publicación de informes aún no está disponible.</div>
        </section>
      </div>
    </WorkbenchFrame>
  );
}
