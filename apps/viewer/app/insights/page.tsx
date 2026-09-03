import Link from "next/link";
import { Badge, Card } from "@seo/ui";
import { rankInsight } from "@seo/contracts";
import { PageFrame } from "@/components/page-frame";
import { getDashboard, parseFilters } from "@/lib/data";

const tones = { resultado: "good", riesgo: "bad", oportunidad: "info", diagnostico: "neutral", calidad: "warn" } as const;

export default async function InsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboard(parseFilters(await searchParams));
  return <PageFrame eyebrow="Decisiones" title="Conclusiones y evidencias" description="Las señales cambian con cada sincronización; aquí solo aparecen conclusiones aprobadas. La causalidad se declara únicamente cuando existe evidencia directa." generatedAt={data.generatedAt}>
    {data.executiveInsights.map((insight) => <Card className="insight-detail" id={insight.id} key={insight.id}><div className="insight-detail-head"><div><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 10 }}><Badge tone={tones[insight.category]}>{insight.category}</Badge><Badge tone={insight.confidence === "alta" ? "good" : "warn"}>confianza {insight.confidence}</Badge><Badge>prioridad {rankInsight(insight)}</Badge></div><h2>{insight.title}</h2></div><span className="cell-secondary">{insight.project ?? "Conjunto"}<br />{insight.updatedAt}</span></div><p><strong>{insight.executiveSummary}</strong></p><details><summary className="section-link">Explicación técnica y límites</summary><p>{insight.technicalExplanation}</p><p><strong>{insight.causeType === "demostrada" ? "Causa demostrada" : insight.causeType === "hipotesis" ? "Hipótesis" : "Causa no determinada"}:</strong> {insight.cause}</p><p><strong>Confianza:</strong> {insight.confidenceReason}</p></details><div className="insight-grid"><div className="info-box"><small>Recomendación</small><strong>{insight.recommendation}</strong></div><div className="info-box"><small>Responsable sugerido</small><strong>{insight.suggestedOwner}</strong></div><div className="info-box"><small>Criterio de éxito</small><strong>{insight.successCriterion}</strong></div></div><div className="evidence-list">{insight.evidence.map((item) => <Link className="evidence-chip" href={item.href} key={item.id}><b>{item.source.toUpperCase()}</b> · {item.label}: {item.value}</Link>)}</div></Card>)}
  </PageFrame>;
}
