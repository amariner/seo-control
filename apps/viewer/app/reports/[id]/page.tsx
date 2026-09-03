import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, DecisionThread } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getDashboard } from "@/lib/data";
import { editorialBacklinks } from "@/lib/editorial";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const report = data.reports.find((item) => item.id === id);
  if (!report) notFound();
  const chapters = data.executiveInsights.slice(0, 3);
  const backlinks = editorialBacklinks("report", report.id);

  /**
   * Índice del informe conectado por el hilo de decisión (P1.5): cada bloque del
   * artefacto es un paso navegable con su procedencia visible.
   *
   * El estado refleja el bloque, no la posición de lectura: los bloques del
   * informe publicado están cerrados (`done`) y la reciprocidad editorial queda
   * `pending` mientras nadie haya curado el vínculo. Marcar varios pasos como
   * `current` a la vez sería mentir sobre dónde está la decisión.
   */
  const published = report.status === "publicado";
  const steps = [
    { id: "bloque-01", label: "Resumen ejecutivo", meta: `${report.period} · ${report.author}`, href: "#bloque-01", state: published ? ("done" as const) : ("current" as const) },
    ...chapters.map((insight, index) => ({
      id: `bloque-${String(index + 2).padStart(2, "0")}`,
      label: insight.title,
      meta: `${insight.category} · confianza ${insight.confidence}`,
      href: `#bloque-${String(index + 2).padStart(2, "0")}`,
      state: published ? ("done" as const) : ("pending" as const),
    })),
    { id: "bloque-editorial", label: "Piezas editoriales vinculadas", meta: backlinks.length ? `${backlinks.length} pieza(s) curada(s)` : "Sin vínculo curado todavía", href: "#bloque-editorial", state: backlinks.length ? ("done" as const) : ("pending" as const) },
  ];

  return <PageFrame eyebrow={`${report.type} · versión ${report.version}`} title={report.title} description={report.executiveSummary} generatedAt={data.generatedAt} aside={<div className="date-context"><Badge tone={report.status === "publicado" ? "good" : "warn"}>{report.status}</Badge><br /><br />{report.period}<br />{report.publishedAt ?? "Pendiente de promoción"}</div>}>
    <div className="executive-layout">
      <div>
        <Card className="subpage-card" id="bloque-01"><p className="eyebrow">01 · Resumen ejecutivo</p><h2>El crecimiento continúa, con una corrección técnica prioritaria</h2><p className="lede">Noken impulsa el avance non-branded en Reino Unido. Porcelanosa mantiene crecimiento de negocio, pero la incidencia de canonical en Francia condiciona el siguiente ciclo.</p></Card>
        {chapters.map((insight, index) => <Card className="subpage-card" style={{ marginTop: 12 }} key={insight.id} id={`bloque-${String(index + 2).padStart(2, "0")}`}><p className="eyebrow">{String(index + 2).padStart(2, "0")} · {insight.category}</p><h2>{insight.title}</h2><p className="lede">{insight.executiveSummary}</p><div className="info-box" style={{ marginTop: 18 }}><small>Decisión propuesta</small><strong>{insight.recommendation}</strong></div><p style={{ marginTop: 12 }}><Link className="section-link" href={`/insights#${insight.id}`}>Evidencia y límites de esta conclusión</Link></p></Card>)}
      </div>
      <div className="report-aside">
        <DecisionThread steps={steps} label="Índice del informe" />
        <Card className="subpage-card"><p className="eyebrow">Ficha editorial</p><ul className="bullet-list"><li>Autor: {report.author}</li><li>Revisor: {report.reviewer ?? "Pendiente"}</li><li>{report.blocks} bloques estructurados</li><li>Artefacto inmutable al publicar</li><li>Confidencial · uso interno</li></ul></Card>
      </div>
    </div>
    <div id="bloque-editorial"><EditorialBacklinks kind="report" id={report.id} /></div>
  </PageFrame>;
}
