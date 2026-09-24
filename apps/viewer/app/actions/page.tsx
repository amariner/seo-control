import type { Metadata } from "next";
import Link from "next/link";
import {
  actionTrackingSummary,
  rankAction,
  trackAction,
  type TrackedAction,
} from "@seo/contracts";
import { Badge, Notice } from "@seo/ui";
import { ReportDataTable, type ReportDataRow } from "@seo/ui/data-table";
import { backlinksFor } from "@seo/editorial";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinkList } from "@/components/editorial/backlinks";
import { getDashboard, parseFilters } from "@/lib/data";
import { editorialBacklinkIndex } from "@/lib/editorial";

export const metadata: Metadata = { title: "Plan de acción y seguimiento" };

const statusTone = {
  propuesta: "neutral",
  planificada: "neutral",
  en_curso: "info",
  bloqueada: "bad",
  completada: "good",
} as const;
const trackingTone = {
  vencida: "bad",
  "en-plazo": "info",
  "sin-fecha": "warn",
  cerrada: "good",
} as const;
const trackingLabel = {
  vencida: "vencida",
  "en-plazo": "en plazo",
  "sin-fecha": "sin fecha",
  cerrada: "cerrada",
} as const;

/** Plazos relativos al corte del dato, no al reloj del servidor. */
function due(action: TrackedAction) {
  if (action.tracking === "cerrada") return "Cerrada";
  if (action.daysToDue === null) return "Sin fecha";
  if (action.daysToDue < 0)
    return `${Math.abs(action.daysToDue)} días de retraso`;
  if (action.daysToDue === 0) return "Vence en el corte";
  return `${action.daysToDue} días restantes`;
}

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getDashboard(parseFilters(await searchParams));
  const asOf = data.generatedAt.slice(0, 10);
  const actions = data.actions
    .map((action) => trackAction(action, asOf))
    .sort((a, b) => rankAction(b) - rankAction(a));
  const summary = actionTrackingSummary(actions);
  const backlinks = editorialBacklinkIndex();
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
            Impacto {action.impact}/5 · Confianza {action.confidence}/5 ·
            Esfuerzo {action.effort}/5 · Urgencia {action.urgency}/5
          </span>
        </>
      ),
      status: (
        <Badge tone={statusTone[action.status]}>
          {action.status.replaceAll("_", " ")}
        </Badge>
      ),
      due: (
        <>
          <Badge tone={trackingTone[action.tracking]}>
            {trackingLabel[action.tracking]}
          </Badge>
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
            <Link href={`/insights#${action.sourceInsightId}`}>
              Evidencia de origen
            </Link>
          </p>
          {backlinksFor(backlinks, "action", action.id).length ? (
            <EditorialBacklinkList
              pieces={backlinksFor(backlinks, "action", action.id)}
            />
          ) : (
            <span className="cell-secondary">
              Sin pieza editorial vinculada
            </span>
          )}
        </details>
      ),
    },
  }));

  return (
    <PageFrame
      eyebrow="Seguimiento"
      title="Plan de acción"
      description="Acciones, responsables y fechas. Consulta de solo lectura."
      generatedAt={data.generatedAt}
      aside={
        <div className="date-context">
          <strong>{summary.total} acciones</strong>
          <br />
          Corte {asOf}
        </div>
      }
    >
      {summary.vencidas > 0 ? (
        <Notice tone="warn">
          {summary.vencidas} acciones vencidas al {asOf}
          {summary.bloqueadas > 0 ? ` · ${summary.bloqueadas} bloqueadas` : ""}.
        </Notice>
      ) : null}
      <div className="kpi-grid" style={{ marginBottom: 28 }}>
        <div className="info-box">
          <small>En plazo</small>
          <strong>{summary.enPlazo}</strong>
        </div>
        <div className="info-box">
          <small>Vencidas</small>
          <strong>{summary.vencidas}</strong>
        </div>
        <div className="info-box">
          <small>Sin fecha</small>
          <strong>{summary.sinFecha}</strong>
        </div>
        <div className="info-box">
          <small>Bloqueadas</small>
          <strong>{summary.bloqueadas}</strong>
        </div>
        <div className="info-box">
          <small>Cerradas</small>
          <strong>{summary.cerradas}</strong>
        </div>
      </div>
      <ReportDataTable
        id="actions"
        caption="Plan de acción"
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
      <p className="provenance" style={{ marginTop: 24 }}>
        <span>Plazos calculados al {asOf}</span>
        <span>Resultados: pendientes de medición</span>
        <Link className="ds-evidence" href="/cronologia?lane=accion">
          Ver cronología
        </Link>
      </p>
    </PageFrame>
  );
}
