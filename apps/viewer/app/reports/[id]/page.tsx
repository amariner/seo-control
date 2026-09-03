import { notFound } from "next/navigation";
import { Badge, Card } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { getDashboard } from "@/lib/data";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const report = data.reports.find((item) => item.id === id);
  if (!report) notFound();
  return <PageFrame eyebrow={`${report.type} · versión ${report.version}`} title={report.title} description={report.executiveSummary} generatedAt={data.generatedAt} aside={<div className="date-context"><Badge tone={report.status === "publicado" ? "good" : "warn"}>{report.status}</Badge><br /><br />{report.period}<br />{report.publishedAt ?? "Pendiente de promoción"}</div>}>
    <div className="executive-layout"><div><Card className="subpage-card"><p className="eyebrow">01 · Resumen ejecutivo</p><h2>El crecimiento continúa, con una corrección técnica prioritaria</h2><p className="lede">Noken impulsa el avance non-branded en Reino Unido. Porcelanosa mantiene crecimiento de negocio, pero la incidencia de canonical en Francia condiciona el siguiente ciclo.</p></Card>{data.executiveInsights.slice(0, 3).map((insight, index) => <Card className="subpage-card" style={{ marginTop: 12 }} key={insight.id}><p className="eyebrow">{String(index + 2).padStart(2, "0")} · {insight.category}</p><h2>{insight.title}</h2><p className="lede">{insight.executiveSummary}</p><div className="info-box" style={{ marginTop: 18 }}><small>Decisión propuesta</small><strong>{insight.recommendation}</strong></div></Card>)}</div><Card className="subpage-card" style={{ height: "fit-content", position: "sticky", top: 150 }}><p className="eyebrow">Ficha editorial</p><ul className="bullet-list"><li>Autor: {report.author}</li><li>Revisor: {report.reviewer ?? "Pendiente"}</li><li>{report.blocks} bloques estructurados</li><li>Artefacto inmutable al publicar</li><li>Confidencial · uso interno</li></ul></Card></div>
  </PageFrame>;
}
