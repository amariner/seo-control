import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Notice } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getDashboard } from "@/lib/data";
import { editorialBacklinks } from "@/lib/editorial";

/**
 * Ficha de query (D-015). Existía la API y las evidencias de los insights ya
 * apuntaban aquí, pero la ruta no estaba publicada: el enlace devolvía 404.
 *
 * La query todavía no es una entidad del contrato: se reconstruye a partir de la
 * evidencia GSC del insight que la cita, así que no tiene serie propia hasta P3.
 * Lo que sí es real es la reciprocidad editorial: las piezas que el workbench ha
 * vinculado a esta query.
 */
export default async function QueryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const insight = data.executiveInsights.find((item) => item.evidence.some((evidence) => evidence.href.endsWith(`/queries/${id}`)));
  const pieces = editorialBacklinks("query", id);
  if (!insight && pieces.length === 0) notFound();

  const evidence = insight?.evidence.find((item) => item.href.endsWith(`/queries/${id}`)) ?? null;

  return <PageFrame eyebrow="Demanda" title={id.replaceAll("-", " ")} description="Ficha de query: evidencia que la cita, insight de origen y piezas editoriales que la trabajan." generatedAt={data.generatedAt} aside={<div className="date-context"><Badge tone="warn">Sin serie propia</Badge><br /><br />Query derivada de la evidencia<br />del insight que la cita</div>}>
    <Notice tone="info">La query aún no es una entidad con serie histórica propia: el contrato la modela en P3, cuando GSC entre como fuente real. Hasta entonces esta ficha muestra la evidencia declarada por el insight —dato sintético de validación— y la relación editorial, que sí es real y curada en el workbench.</Notice>

    {evidence ? <section className="section"><header className="section-heading"><div><p className="eyebrow">Evidencia declarada</p><h2>{evidence.label}</h2></div></header><Card className="backlinks-card"><div className="detail-grid" style={{ margin: 0 }}><div className="info-box"><small>Valor</small><strong>{evidence.value}</strong></div><div className="info-box"><small>Fuente</small><strong>{evidence.source.toUpperCase()}</strong></div><div className="info-box"><small>Identificador</small><strong><code>{id}</code></strong></div></div></Card></section> : null}

    {insight ? <section className="section"><header className="section-heading"><div><p className="eyebrow">Insight de origen</p><h2>{insight.title}</h2><p>{insight.executiveSummary}</p></div><Link className="section-link" href={`/insights#${insight.id}`}>Ver la conclusión completa</Link></header><Card className="backlinks-card"><div className="detail-grid" style={{ margin: 0 }}><div className="info-box"><small>Recomendación</small><strong>{insight.recommendation}</strong></div><div className="info-box"><small>Responsable sugerido</small><strong>{insight.suggestedOwner}</strong></div><div className="info-box"><small>Criterio de éxito</small><strong>{insight.successCriterion}</strong></div></div></Card></section> : null}

    <EditorialBacklinks kind="query" id={id} />
  </PageFrame>;
}
