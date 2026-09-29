import type { Metadata } from "next";
import Link from "next/link";
import { FilePlus2 } from "lucide-react";
import { FlashMessages } from "@/components/flash-messages";
import { SubmitButton } from "@/components/submit-button";
import { ScrollRegion } from "@/components/scroll-region";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { ADDITIONAL_PROJECTS, listAdditionalReports } from "@/lib/additional-reports";
import { requestAdditionalReport } from "./actions";

export const metadata: Metadata = { title: "Informes adicionales" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS = { solicitado: "badge-warn", "en curso": "badge-warn", entregado: "badge-good" } as const;
const DATA = { real: "badge-good", sintético: "badge-warn", mixto: "badge-warn", "sin declarar": "" } as const;

/**
 * Informes adicionales (D-076): los análisis puntuales de
 * `informes-adicionales/`, siempre en local. Se listan, se consultan y se
 * solicitan desde aquí; los elabora Claude desde el chat.
 */
export default async function AdditionalReportsPage({ searchParams }: Props) {
  const params = await searchParams;
  const pick = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const project = pick("proyecto");
  const reports = listAdditionalReports();
  const visible = reports.filter((report) => !project || report.project === project);
  const projects = [...new Set(reports.map((report) => report.project))];

  return (
    <WorkbenchFrame
      eyebrow="Informes · Solo local"
      title="Informes adicionales"
      description="Análisis puntuales pedidos fuera del flujo del producto. Viven en informes-adicionales/ de este equipo y nunca se suben al repositorio ni al visor."
      aside={
        <Link className="button button-small button-ghost" href="/informes">
          ← Informes de las marcas
        </Link>
      }
    >
      <FlashMessages ok={pick("ok")} error={pick("error")} />

      <nav className="rp-filter" aria-label="Filtrar por proyecto">
        <Link href="/informes/adicionales" aria-current={!project ? "page" : undefined}>Todos ({reports.length})</Link>
        {projects.map((slug) => (
          <Link key={slug} href={`/informes/adicionales?proyecto=${slug}`} aria-current={project === slug ? "page" : undefined}>
            {ADDITIONAL_PROJECTS.find((item) => item.slug === slug)?.name ?? slug} ({reports.filter((report) => report.project === slug).length})
          </Link>
        ))}
      </nav>

      {visible.length ? (
        <ScrollRegion label="Informes adicionales">
          <table className="rp-table">
            <thead>
              <tr>
                <th>Informe</th>
                <th>Proyecto</th>
                <th>Fecha</th>
                <th>Dato</th>
                <th>Estado</th>
                <th>Ficheros</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((report) => (
                <tr key={report.path}>
                  <td>
                    <Link href={`/informes/adicionales/${report.path}`}><strong>{report.title}</strong></Link>
                    <span className="rp-sub">{report.path}</span>
                  </td>
                  <td>{report.projectName}</td>
                  <td>{report.date ?? "—"}</td>
                  <td><span className={`badge ${DATA[report.data]}`}>{report.data}</span></td>
                  <td><span className={`badge ${STATUS[report.status]}`}>{report.status}</span></td>
                  <td>{report.files.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      ) : (
        <p className="tool-note">Todavía no hay informes adicionales{project ? " de este proyecto" : ""}.</p>
      )}

      <section className="wb-card panel rp-request" aria-labelledby="solicitar">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Nuevo</p>
            <h2 id="solicitar">Solicitar un informe adicional</h2>
          </div>
          <span className="badge">se queda en local</span>
        </div>
        <p className="tool-note">
          Crea la carpeta <code>informes-adicionales/&lt;proyecto&gt;/&lt;fecha&gt;-&lt;tema&gt;/</code> con su README según la convención. Después, en el chat: «haz el informe adicional &lt;ruta&gt;». El README tiene que decir siempre si el dato es real (GA4/GSC en directo, dataset editorial) o sintético.
        </p>
        <form action={requestAdditionalReport} className="rp-request-form">
          <label className="field">
            <span>Proyecto</span>
            <select className="input" name="project" defaultValue={project ?? "conjunto"}>
              {ADDITIONAL_PROJECTS.map((item) => (
                <option key={item.slug} value={item.slug}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Tema corto (carpeta)</span>
            <input className="input" name="topic" placeholder="ctr-branded-vs-generico" maxLength={60} />
          </label>
          <label className="field rp-span-2">
            <span>Título</span>
            <input className="input" name="title" required minLength={4} maxLength={160} placeholder="CTR de consultas con marca frente a genéricas, Q3" />
          </label>
          <label className="field rp-span-2">
            <span>Pregunta de negocio</span>
            <textarea className="textarea" name="question" required minLength={10} maxLength={2000} rows={3} placeholder="Qué decisión se quiere tomar con este informe" />
          </label>
          <label className="field">
            <span>Periodo de datos</span>
            <input className="input" name="period" placeholder="2026-07-01 → 2026-09-30" maxLength={120} />
          </label>
          <label className="field">
            <span>Fuente(s)</span>
            <input className="input" name="source" placeholder="Search Console real, dataset editorial…" maxLength={300} />
          </label>
          <div className="rp-span-2">
            <SubmitButton className="button button-primary" pending="Creando…">
              <FilePlus2 size={15} aria-hidden /> Crear solicitud
            </SubmitButton>
          </div>
        </form>
      </section>
    </WorkbenchFrame>
  );
}
