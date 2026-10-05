import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { PILOT_PROJECTS, findBrand } from "@seo/contracts";
import {
  ACTION_SLA_DAYS,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  TRACKED_STATUS_LABEL,
  VERDICT_LABEL,
  dueState,
  dueText,
  formatMetricValue,
  resultOf,
  shortDate,
  trackedIdOf,
  trackingSummary,
} from "@seo/reports";
import { readTracking, trackingPending } from "@seo/reports/tracking-store";
import { actionLinkOf, actionPieces } from "@seo/reports/action-journey";
import { buildBacklinkIndex } from "@seo/editorial";
import { getEffectiveEditorialDataset } from "@seo/editorial/dataset";
import { ScrollRegion } from "@/components/scroll-region";
import { WorkbenchFrame } from "@/components/workbench-frame";
import { VIEWER_URL } from "@/lib/reports";

export const metadata: Metadata = { title: "Acciones" };
export const dynamic = "force-dynamic";

const when = (iso: string) =>
  new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" });

const STATUS_TONE = { planificada: "", en_curso: "badge-info", bloqueada: "badge-bad", completada: "badge-good", descartada: "" } as const;
const VERDICT_TONE = { cumplido: "badge-good", mejora: "badge-good", igual: "", empeora: "badge-bad", "sin-dato": "badge-warn" } as const;

/**
 * Bandeja de acciones (D-090, H10): lo que el equipo SEO sigue de lo que
 * proponen las pestañas «Acciones» del visor, con estado, responsable, plazo,
 * criterio y último resultado, y lo que falta por subir. Solo consulta (D-082):
 * seguir, cambiar, medir y subir se piden en el chat, que ejecuta
 * `pnpm action:track` y `pnpm action:measure`.
 */
export default function ActionsPage() {
  const tracking = readTracking();
  const today = new Date().toISOString().slice(0, 10);
  const records = Object.values(tracking.actions).sort(
    (a, b) =>
      Number(dueState(b, today).state === "vencida") - Number(dueState(a, today).state === "vencida") ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.due.localeCompare(b.due),
  );
  const summary = trackingSummary(records, today);
  // Recorrido (D-092): piezas del plan curado que enlazan cada acción, derivadas de `piece.links`.
  const backlinks = buildBacklinkIndex(getEffectiveEditorialDataset());
  const pending = trackingPending();
  const pendingIds = new Set([...pending.added, ...pending.changed]);
  const toUpload = pending.added.length + pending.changed.length + pending.removed.length;
  const example = PILOT_PROJECTS.find((project) => project.slug === "xtone")?.slug ?? PILOT_PROJECTS[0]!.slug;

  return (
    <WorkbenchFrame
      eyebrow="Workbench · Acciones"
      title="Acciones en seguimiento"
      description="Las acciones que proponen los datos de cada marca y que el equipo SEO ha decidido seguir: responsable, plazo, criterio de éxito y resultado medido con datos reales. Aquí solo se consulta; seguir, cambiar, medir y subir al visor se piden en el chat."
    >
      <section className="rp-kpis" aria-label="Resumen">
        <article className="wb-card rp-kpi">
          <span>Abiertas</span>
          <strong>{summary.open}</strong>
          <small>{summary.unassigned ? `${summary.unassigned} sin responsable` : "todas con responsable"}</small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Vencidas</span>
          <strong>{summary.overdue}</strong>
          <small>{summary.blocked ? `${summary.blocked} bloqueadas` : "ninguna bloqueada"}</small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Cumplen el criterio</span>
          <strong>{summary.met}</strong>
          <small>
            {summary.completed} {summary.completed === 1 ? "completada" : "completadas"}
          </small>
        </article>
        <article className="wb-card rp-kpi">
          <span>Pendientes de subir</span>
          <strong>{toUpload}</strong>
          <small>{toUpload ? "Pide «sube las acciones» en el chat" : "El último commit está al día"}</small>
        </article>
      </section>

      {tracking.invalid ? <p className="notice">El fichero de seguimiento no cumple el contrato y no se muestra: {tracking.invalid}.</p> : null}
      {pending.removed.length ? <p className="notice">Retiradas sin subir: {pending.removed.join(", ")}.</p> : null}

      <section className="rp-brand" aria-labelledby="ac-bandeja">
        <header className="rp-brand-head">
          <h2 id="ac-bandeja">Bandeja</h2>
          <span className="rp-domain">
            {records.length} {records.length === 1 ? "acción" : "acciones"} · plazos al {shortDate(today)}
            {tracking.updatedAt !== new Date(0).toISOString() ? ` · último cambio ${when(tracking.updatedAt)}` : ""}
          </span>
        </header>
        {records.length ? (
          <ScrollRegion label="Acciones en seguimiento">
            <table className="rp-table">
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Marca</th>
                  <th>Estado</th>
                  <th>Plazo</th>
                  <th>Resultado</th>
                  <th>Sincronización</th>
                  <th>Visor</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const id = trackedIdOf(record.brand, record.key);
                  const reading = resultOf(record);
                  const due = dueState(record, today);
                  const unit = record.metric?.unit ?? "";
                  const brand = findBrand(record.brand)?.name ?? record.brand;
                  return (
                    <tr key={id}>
                      <td>
                        <strong>{record.title}</strong>
                        <span className="rp-sub">
                          {PRIORITY_LABEL[record.priority]} · {record.area} · <code>{record.key}</code>
                        </span>
                        <span className="rp-sub">Criterio: {record.criterion}</span>
                        {record.note ? <span className="rp-sub">Nota: {record.note}</span> : null}
                        {actionPieces(backlinks, record.brand, record.key).map((piece) => (
                          <span key={piece.id} className="rp-sub">
                            Pieza: {piece.title} · {piece.status}
                            {piece.result ? ` · ${piece.result}` : ""}
                          </span>
                        ))}
                        <span className="rp-sub">
                          Enlace para una pieza: <code>{actionLinkOf(record.brand, record.key)}</code>
                        </span>
                      </td>
                      <td>{brand}</td>
                      <td>
                        <span className={`badge ${STATUS_TONE[record.status]}`}>{TRACKED_STATUS_LABEL[record.status]}</span>
                        <span className="rp-sub">{record.owner ?? "Sin responsable"}</span>
                        <span className="rp-sub">
                          {record.history.at(-1)!.by} · {when(record.history.at(-1)!.at)}
                        </span>
                      </td>
                      <td>
                        <span className={due.state === "vencida" ? "ac-overdue" : undefined}>{dueText(record, today)}</span>
                      </td>
                      <td>
                        {reading ? (
                          <span className={`badge ${VERDICT_TONE[reading.verdict]}`}>
                            {VERDICT_LABEL[reading.verdict]}
                            {reading.provisional ? " · provisional" : ""}
                          </span>
                        ) : (
                          <span className="rp-muted">Sin medir: «mide las acciones»</span>
                        )}
                        {record.metric ? (
                          <span className="rp-sub">
                            {record.metric.label}: {formatMetricValue(record.baseline.value, unit)} ({shortDate(record.baseline.cutoff)})
                            {record.result ? ` → ${formatMetricValue(record.result.value, unit)} (${shortDate(record.result.cutoff)})` : ""}
                          </span>
                        ) : null}
                        {reading?.provisional ? <span className="rp-sub">{reading.provisional}</span> : null}
                        {record.learning ? <span className="rp-sub">Aprendizaje: {record.learning}</span> : null}
                      </td>
                      <td>
                        {pendingIds.has(id) ? (
                          <span className="badge badge-warn">{pending.added.includes(id) ? "Nueva, sin subir" : "Cambios sin subir"}</span>
                        ) : (
                          <span className="badge badge-good">En el último commit</span>
                        )}
                      </td>
                      <td>
                        <a className="button button-small button-ghost" href={`${VIEWER_URL}/projects/${record.brand}?tab=acciones`} target="_blank" rel="noopener">
                          <ExternalLink size={14} aria-hidden /> Ver<span className="sr-only"> las acciones de {brand}</span>
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollRegion>
        ) : (
          <p className="tool-note">
            Ninguna acción en seguimiento todavía. Las acciones propuestas están en la pestaña «Acciones» de cada marca del visor (
            {PILOT_PROJECTS.map((project, index) => (
              <span key={project.slug}>
                {index ? ", " : ""}
                <a href={`${VIEWER_URL}/projects/${project.slug}?tab=acciones`} target="_blank" rel="noopener">
                  {project.name}
                </a>
              </span>
            ))}
            ); pide en el chat cuál seguir.
          </p>
        )}
      </section>

      <section className="wb-card panel rp-sync" aria-labelledby="ac-chat">
        <div className="panel-head">
          <div>
            <p className="eyebrow">Desde el chat</p>
            <h2 id="ac-chat">Cómo se sigue, se mide y se sube una acción</h2>
          </div>
        </div>
        <ul className="rp-howto">
          <li>
            <strong>«¿Qué acciones propone {findBrand(example)?.name}?»</strong>
            <code>pnpm action:track -- --project {example}</code>
            <span>Repasa los apartados con datos reales (últimos 90 días, todos los mercados) y lista cada acción con su clave, cifra, criterio de éxito y seguimiento.</span>
          </li>
          <li>
            <strong>«Sigue la acción de los sitemaps de {findBrand(example)?.name}: responsable Marta, plazo 31 de octubre»</strong>
            <code>pnpm action:track -- --project {example} --action paginas:fuera-sitemaps --owner &quot;Marta&quot; --due 2026-10-31</code>
            <span>
              Guarda el punto de partida con GA4, Search Console y el crawl publicado. Sin <code>--due</code>, el plazo es el SLA de su prioridad: urgente {ACTION_SLA_DAYS.urgente}, alta {ACTION_SLA_DAYS.alta}, media {ACTION_SLA_DAYS.media} y baja {ACTION_SLA_DAYS.baja} días.
            </span>
          </li>
          <li>
            <strong>«Marca como completada la acción … y anota lo aprendido»</strong>
            <code>pnpm action:track -- --project {example} --action &lt;clave&gt; --status completada --learning &quot;…&quot;</code>
            <span>Estados: planificada, en curso, bloqueada, completada y descartada. Cada cambio queda en el historial con autor y fecha. <code>--remove</code> retira el seguimiento.</span>
          </li>
          <li>
            <strong>Enlazar una pieza del plan a una acción</strong>
            <code>Editorial › Curación · Enlaces: action:{example}:&lt;clave&gt;</code>
            <span>
              La relación vive en la pieza (D-015). La acción muestra entonces la pieza con su estado y su medición de 28, 90 y 180 días: el recorrido oportunidad → pieza → acción → resultado.
            </span>
          </li>
          <li>
            <strong>«Mide las acciones»</strong>
            <code>pnpm action:measure</code>
            <span>Recalcula la cifra de cada acción con la misma ventana y el último corte. Es provisional mientras el periodo incluya días anteriores a la acción o no haya un crawl posterior.</span>
          </li>
          <li>
            <strong>«Sube las acciones»</strong>
            <code>git commit · vercel deploy --prod</code>
            <span>
              Se revisa el diff de <code>packages/reports/data/tracking/</code> y se confirma contigo antes del commit y del despliegue. En el visor se ven en la pestaña «Acciones» de cada marca, en <code>/actions</code> y en la cronología.
            </span>
          </li>
        </ul>
      </section>
    </WorkbenchFrame>
  );
}
