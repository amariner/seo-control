import { Badge, Card } from "@seo/ui";
import { rankAction } from "@seo/contracts";
import { PageFrame } from "@/components/page-frame";
import { getDashboard, parseFilters } from "@/lib/data";

export default async function ActionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboard(parseFilters(await searchParams));
  const actions = [...data.actions].sort((a, b) => rankAction(b) - rankAction(a));
  return <PageFrame eyebrow="Ejecución" title="Acciones recomendadas" description="Foto de seguimiento de solo lectura. La prioridad combina impacto, confianza, esfuerzo, urgencia y dependencias; la gestión operativa permanece en las herramientas corporativas." generatedAt={data.generatedAt}>
    <Card className="matrix"><table className="data-table"><thead><tr><th>Prioridad</th><th>Acción</th><th>Proyecto</th><th>Responsable</th><th>Estado</th><th>Fecha</th><th>Criterio de éxito</th></tr></thead><tbody>{actions.map((action) => <tr key={action.id}><td className="score">{rankAction(action)}</td><td><span className="cell-primary">{action.title}</span><span className="cell-secondary">Impacto {action.impact}/5 · Confianza {action.confidence}/5 · Esfuerzo {action.effort}/5</span></td><td>{action.project}</td><td>{action.owner}</td><td><Badge tone={action.status === "en_curso" ? "info" : action.status === "bloqueada" ? "bad" : action.status === "completada" ? "good" : "neutral"}>{action.status.replace("_", " ")}</Badge></td><td>{action.dueDate ?? "Sin fecha"}</td><td>{action.successCriterion}</td></tr>)}</tbody></table></Card>
  </PageFrame>;
}
