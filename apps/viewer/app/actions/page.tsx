import type { Metadata } from "next";
import Link from "next/link";
import {
  PILOT_PROJECTS,
  actionTrackingSummary,
  findBrand,
  rankAction,
  trackAction,
  type TrackedAction as SyntheticTrackedAction,
} from "@seo/contracts";
import {
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
  type TrackedAction,
} from "@seo/reports";
import { actionPieces, type ActionPiece } from "@seo/reports/action-journey";
import { getPublishedTracking } from "@seo/reports/tracking-published";
import { Badge, Notice } from "@seo/ui";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";
import { backlinksFor } from "@seo/editorial";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinkList } from "@/components/editorial/backlinks";
import { describeDataSource, getDashboard, parseFilters } from "@/lib/data";
import { editorialBacklinkIndex } from "@/lib/editorial";

export const metadata: Metadata = { title: "Plan de acción y seguimiento" };

/**
 * Plan de acción (D-090): la bandeja de las acciones que el equipo sigue en
 * las marcas del piloto, con estado, responsable, plazo (SLA), criterio de
 * éxito y último resultado medido. Las propone cada pestaña «Acciones» del
 * proyecto (reglas de D-088); el seguimiento se escribe desde el chat del
 * workbench (`pnpm action:track`) y llega aquí con «sube las acciones».
 *
 * Con el origen sintético (validación de P1/P2) se muestra además, debajo y
 * rotulado, su plan de ejemplo; con el origen real el repositorio no tiene
 * acciones propias y esa sección no aparece.
 */

const STATUS_TONE = {
  planificada: "neutral",
  en_curso: "info",
  bloqueada: "bad",
  completada: "good",
  descartada: "neutral",
} as const;
const VERDICT_TONE = {
  cumplido: "good",
  mejora: "good",
  igual: "neutral",
  empeora: "bad",
  "sin-dato": "warn",
} as const;

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // Se lee en cada petición: los plazos se cuentan contra el día de hoy, no
  // contra el del build.
  const params = await searchParams;
  const tracking = getPublishedTracking();
  const today = new Date().toISOString().slice(0, 10);
  const records = Object.values(tracking.actions).sort(
    (a, b) =>
      Number(dueState(b, today).state === "vencida") - Number(dueState(a, today).state === "vencida") ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
      a.due.localeCompare(b.due),
  );
  const summary = trackingSummary(records, today);
  const backlinks = editorialBacklinkIndex();
  const source = describeDataSource();
  const data = source.realData ? null : await getDashboard(parseFilters(params));

  return (
    <PageFrame
      eyebrow="Seguimiento"
      title="Plan de acción"
      description="Acciones que el equipo SEO sigue en cada marca: responsable, plazo, criterio de éxito y resultado medido. Consulta de solo lectura."
      generatedAt={tracking.updatedAt === new Date(0).toISOString() ? new Date().toISOString() : tracking.updatedAt}
      // Proyecto, mercado y periodo de la cabecera solo filtran el plan de ejemplo del sintético.
      showGlobalFilters={!source.realData}
      aside={
        <div className="date-context">
          <strong>{summary.open} abiertas</strong>
          <br />
          Plazos al {shortDate(today)}
        </div>
      }
    >
      {tracking.invalid ? <Notice tone="danger">El seguimiento publicado no cumple el contrato y no se muestra ({tracking.invalid}).</Notice> : null}
      {summary.overdue > 0 ? (
        <Notice tone="warn">
          {summary.overdue} {summary.overdue === 1 ? "acción vencida" : "acciones vencidas"}
          {summary.blocked > 0 ? ` · ${summary.blocked} ${summary.blocked === 1 ? "bloqueada" : "bloqueadas"}` : ""}.
        </Notice>
      ) : null}
      <div className="ds-metric-strip action-strip" data-count="5">
        <Metric label="Abiertas" value={summary.open} />
        <Metric label="Vencidas" value={summary.overdue} />
        <Metric label="Sin responsable" value={summary.unassigned} />
        <Metric label="Completadas" value={summary.completed} />
        <Metric label="Cumplen el criterio" value={summary.met} />
      </div>
      {records.length ? (
        <ReportDataTable
          id="seguimiento"
          caption="Acciones en seguimiento"
          rows={records.map((record) => trackedRow(record, today, actionPieces(backlinks, record.brand, record.key)))}
          searchPlaceholder="Buscar acción, marca o responsable…"
          filters={[
            {
              key: "brand",
              label: "Marca",
              allLabel: "Todas las marcas",
              options: [...new Set(records.map((record) => record.brand))].map((brand) => ({ value: findBrand(brand)?.name ?? brand, label: findBrand(brand)?.name ?? brand })),
            },
            {
              key: "status",
              label: "Estado",
              allLabel: "Todos los estados",
              options: Object.entries(TRACKED_STATUS_LABEL).map(([, label]) => ({ value: label, label })),
            },
          ]}
          columns={[
            { key: "title", label: "Acción" },
            { key: "brand", label: "Marca" },
            { key: "priority", label: "Prioridad", numeric: true },
            { key: "owner", label: "Responsable" },
            { key: "status", label: "Estado" },
            { key: "due", label: "Plazo" },
            { key: "result", label: "Resultado", sortable: false },
          ]}
        />
      ) : (
        <Notice tone="info">
          Ninguna acción en seguimiento todavía. Las proponen los datos en la pestaña «Acciones» de cada marca del piloto (
          {PILOT_PROJECTS.map((project, index) => (
            <span key={project.slug}>
              {index ? ", " : ""}
              <Link href={`/projects/${project.slug}?tab=acciones`}>{project.name}</Link>
            </span>
          ))}
          ); el equipo SEO las asigna desde el chat del workbench.
        </Notice>
      )}
      <p className="provenance" style={{ marginTop: 24 }}>
        <span>Plazos al {shortDate(today)}: el del equipo o, si no lo fija, el SLA de la prioridad</span>
        <span>Resultados con GA4, Search Console y crawls publicados, medidos con la misma ventana que el punto de partida</span>
        <Link className="ds-evidence" href="/cronologia?lane=accion">
          Ver cronología
        </Link>
      </p>
      {data?.actions.length ? <SyntheticPlan data={data} disclosure={source.disclosure} /> : null}
    </PageFrame>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span className="metric-heading">{label}</span>
      <strong className="metric-value">{value}</strong>
    </div>
  );
}

function trackedRow(record: TrackedAction, today: string, pieces: ActionPiece[]): ReportDataRow {
  const brand = findBrand(record.brand)?.name ?? record.brand;
  const due = dueState(record, today);
  const reading = resultOf(record);
  const unit = record.metric?.unit ?? "";
  return {
    id: trackedIdOf(record.brand, record.key),
    // El ancla es el id de la acción: el mismo que resuelve `linkTargetHref` para los enlaces de las piezas (D-015).
    anchorId: trackedIdOf(record.brand, record.key),
    searchText: `${record.title} ${brand} ${record.owner ?? ""} ${record.criterion} ${record.key} ${pieces.map((piece) => piece.title).join(" ")}`,
    values: {
      title: record.title,
      brand,
      priority: 4 - PRIORITY_ORDER[record.priority],
      owner: record.owner ?? "",
      status: TRACKED_STATUS_LABEL[record.status],
      due: record.due,
      result: reading ? VERDICT_LABEL[reading.verdict] : null,
    },
    cells: {
      title: (
        <>
          <span className="cell-primary">{record.title}</span>
          <span className="cell-secondary">
            {record.area} · {record.source}
          </span>
          {pieces.map((piece) => (
            <span key={piece.id} className="cell-secondary">
              Pieza: <Link href={piece.href}>{piece.title}</Link> · {piece.status}
              {piece.result ? ` · ${piece.result}` : ""}
            </span>
          ))}
        </>
      ),
      brand: <Link href={`/projects/${record.brand}?tab=acciones`}>{brand}</Link>,
      priority: PRIORITY_LABEL[record.priority],
      owner: record.owner ?? <span className="cell-secondary">Sin responsable</span>,
      status: <Badge tone={STATUS_TONE[record.status]}>{TRACKED_STATUS_LABEL[record.status]}</Badge>,
      due: (
        <>
          <Badge tone={due.state === "vencida" ? "bad" : due.state === "cerrada" ? "good" : "info"}>
            {due.state === "vencida" ? "vencida" : due.state === "cerrada" ? "cerrada" : "en plazo"}
          </Badge>
          <span className="cell-secondary">{dueText(record, today)}</span>
        </>
      ),
      result: (
        <>
          <span className="cell-secondary">Criterio: {record.criterion}</span>
          {reading ? (
            <Badge tone={VERDICT_TONE[reading.verdict]}>
              {VERDICT_LABEL[reading.verdict]}
              {reading.provisional ? " · provisional" : ""}
            </Badge>
          ) : (
            <span className="cell-secondary">Sin medir</span>
          )}
          {record.metric ? (
            <span className="cell-secondary">
              {record.metric.label}: {formatMetricValue(record.baseline.value, unit)}
              {record.result ? ` → ${formatMetricValue(record.result.value, unit)} (${shortDate(record.result.cutoff)})` : ""}
            </span>
          ) : null}
          {reading?.provisional ? <span className="cell-secondary">{reading.provisional}</span> : null}
          {record.learning ? <span className="cell-secondary">Aprendizaje: {record.learning}</span> : null}
        </>
      ),
    },
  };
}

/** Plan del conector sintético (P1/P2), rotulado: no es dato real. */
function SyntheticPlan({ data, disclosure }: { data: Awaited<ReturnType<typeof getDashboard>>; disclosure: string }) {
  const asOf = data.generatedAt.slice(0, 10);
  const actions = data.actions.map((action) => trackAction(action, asOf)).sort((a, b) => rankAction(b) - rankAction(a));
  const summary = actionTrackingSummary(actions);
  const backlinks = editorialBacklinkIndex();
  const statusTone = { propuesta: "neutral", planificada: "neutral", en_curso: "info", bloqueada: "bad", completada: "good" } as const;
  const trackingTone = { vencida: "bad", "en-plazo": "info", "sin-fecha": "warn", cerrada: "good" } as const;
  const trackingLabel = { vencida: "vencida", "en-plazo": "en plazo", "sin-fecha": "sin fecha", cerrada: "cerrada" } as const;
  /** Plazos relativos al corte del dato, no al reloj del servidor. */
  const due = (action: SyntheticTrackedAction) => {
    if (action.tracking === "cerrada") return "Cerrada";
    if (action.daysToDue === null) return "Sin fecha";
    if (action.daysToDue < 0) return `${Math.abs(action.daysToDue)} días de retraso`;
    if (action.daysToDue === 0) return "Vence en el corte";
    return `${action.daysToDue} días restantes`;
  };
  const rows: ReportDataRow[] = actions.map((action) => ({
    id: action.id,
    anchorId: action.id,
    searchText: `${action.title} ${action.project} ${action.owner} ${action.successCriterion}`,
    values: {
      priority: rankAction(action),
      title: action.title,
      project: action.project,
      owner: action.owner,
      status: action.status,
      due: action.dueDate,
      criterion: action.successCriterion,
    },
    cells: {
      title: (
        <>
          <span className="cell-primary">{action.title}</span>
          <span className="cell-secondary">
            Impacto {action.impact}/5 · Confianza {action.confidence}/5 · Esfuerzo {action.effort}/5 · Urgencia {action.urgency}/5
          </span>
        </>
      ),
      status: <Badge tone={statusTone[action.status]}>{action.status.replaceAll("_", " ")}</Badge>,
      due: (
        <>
          <Badge tone={trackingTone[action.tracking]}>{trackingLabel[action.tracking]}</Badge>
          <span className="cell-secondary">
            {action.dueDate ?? "—"} · {due(action)}
          </span>
        </>
      ),
      criterion: (
        <details>
          <summary className="section-link">Ver detalle</summary>
          <p>{action.successCriterion}</p>
          <p>
            <Link href={`/insights#${action.sourceInsightId}`}>Evidencia de origen</Link>
          </p>
          {backlinksFor(backlinks, "action", action.id).length ? (
            <EditorialBacklinkList pieces={backlinksFor(backlinks, "action", action.id)} />
          ) : (
            <span className="cell-secondary">Sin pieza editorial vinculada</span>
          )}
        </details>
      ),
    },
  }));
  return (
    <section className="section" aria-labelledby="ejemplo-sintetico">
      <h2 id="ejemplo-sintetico">Plan de ejemplo</h2>
      <Notice tone="info">
        {disclosure} {summary.total} acciones de ejemplo para validar la pantalla, no del equipo ({summary.vencidas} vencidas al {asOf}).
      </Notice>
      <ReportDataTable
        id="actions"
        caption="Plan de ejemplo"
        rows={rows}
        searchPlaceholder="Buscar acción, proyecto o responsable…"
        columns={[
          { key: "title", label: "Acción" },
          { key: "priority", label: "Prioridad", numeric: true },
          { key: "project", label: "Proyecto" },
          { key: "owner", label: "Responsable" },
          { key: "status", label: "Estado" },
          { key: "due", label: "Fecha" },
          { key: "criterion", label: "Seguimiento", sortable: false },
        ]}
      />
    </section>
  );
}
