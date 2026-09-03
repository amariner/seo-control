import { Badge, DataTablePanel } from "@seo/ui";
import { rankAction } from "@seo/contracts";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinkList } from "@/components/editorial/backlinks";
import { getDashboard, parseFilters } from "@/lib/data";
import { editorialBacklinkIndex } from "@/lib/editorial";
import { backlinksFor } from "@seo/editorial";

export default async function ActionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboard(parseFilters(await searchParams));
  const actions = [...data.actions].sort((a, b) => rankAction(b) - rankAction(a));
  // La reciprocidad de `links` (P1.4, D-015) se resuelve con un solo índice para
  // toda la tabla: la acción es la ficha destino y la pieza editorial la origen.
  const backlinks = editorialBacklinkIndex();
  return <PageFrame eyebrow="Ejecución" title="Acciones recomendadas" description="Foto de seguimiento de solo lectura. La prioridad combina impacto, confianza, esfuerzo, urgencia y dependencias; la gestión operativa permanece en las herramientas corporativas." generatedAt={data.generatedAt}>
    <DataTablePanel label="Acciones recomendadas, ordenadas por prioridad"><table className="data-table"><thead><tr><th>Prioridad</th><th>Acción</th><th>Proyecto</th><th>Responsable</th><th>Estado</th><th>Fecha</th><th>Criterio de éxito</th><th>Piezas editoriales</th></tr></thead><tbody>{actions.map((action) => <tr key={action.id} id={action.id}><td className="score">{rankAction(action)}</td><td><span className="cell-primary">{action.title}</span><span className="cell-secondary">Impacto {action.impact}/5 · Confianza {action.confidence}/5 · Esfuerzo {action.effort}/5</span></td><td>{action.project}</td><td>{action.owner}</td><td><Badge tone={action.status === "en_curso" ? "info" : action.status === "bloqueada" ? "bad" : action.status === "completada" ? "good" : "neutral"}>{action.status.replace("_", " ")}</Badge></td><td>{action.dueDate ?? "Sin fecha"}</td><td>{action.successCriterion}</td><td>{backlinksFor(backlinks, "action", action.id).length ? <EditorialBacklinkList pieces={backlinksFor(backlinks, "action", action.id)} /> : <span className="cell-secondary">Sin pieza vinculada</span>}</td></tr>)}</tbody></table></DataTablePanel>
  </PageFrame>;
}
