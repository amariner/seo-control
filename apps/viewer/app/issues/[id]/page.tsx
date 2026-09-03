import { notFound } from "next/navigation";
import { Badge, Card } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { getDashboard } from "@/lib/data";

export default async function IssueDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const issue = data.technicalIssues.find((item) => item.id === id);
  if (!issue) notFound();
  return <PageFrame eyebrow={`${issue.project} · ${issue.category}`} title={issue.title} description={`Incidencia persistente durante ${issue.persistenceRuns} crawls aprobados. La prioridad pondera alcance, tráfico, template y esfuerzo.`} generatedAt={data.generatedAt} aside={<Badge tone={issue.severity === "critica" ? "bad" : "warn"}>{issue.severity}</Badge>}>
    <div className="chapter-grid"><Card className="chapter-card"><p className="eyebrow">Impacto</p><div className="geo-score"><strong>{issue.priorityScore}</strong><span>prioridad<br />sobre 100</span></div><ul className="bullet-list"><li>{issue.affectedUrls} URLs afectadas.</li><li>{issue.trafficAtRisk.toLocaleString("es-ES")} impresiones o sesiones en riesgo.</li><li>Template principal: {issue.template}.</li><li>Esfuerzo estimado: {issue.effort}.</li></ul></Card><Card className="chapter-card"><p className="eyebrow">Muestra verificable</p><h2>URL representativa</h2><p style={{ overflowWrap: "anywhere" }}>{issue.sampleUrl}</p><div className="info-box" style={{ marginTop: 18 }}><small>Criterio de cierre</small><strong>La incidencia desaparece del crawl y la muestra priorizada confirma el comportamiento esperado en dos comprobaciones.</strong></div></Card></div>
  </PageFrame>;
}
