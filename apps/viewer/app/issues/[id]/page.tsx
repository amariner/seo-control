import { notFound } from "next/navigation";
import { Badge, Card, Notice } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { getDashboard } from "@/lib/data";

export default async function IssueDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getDashboard({
    project: "all",
    market: "all",
    period: "28d",
  });
  const issue = data.technicalIssues.find((item) => item.id === id);
  if (!issue) notFound();
  return (
    <PageFrame
      eyebrow={`${issue.project} · ${issue.category}`}
      title={issue.title}
      crumb={issue.title}
      description={`Detectada en ${issue.persistenceRuns} crawls.`}
      generatedAt={data.generatedAt}
      aside={
        <Badge tone={issue.severity === "critica" ? "bad" : "warn"}>
          {issue.severity}
        </Badge>
      }
    >
      {data.mode === "synthetic" ? (
        <Notice tone="info">Incidencia sintética de validación.</Notice>
      ) : null}
      <div className="kpi-grid">
        <Card className="metric-card">
          <span className="eyebrow">URLs afectadas</span>
          <strong className="metric-value">
            {issue.affectedUrls.toLocaleString("es-ES")}
          </strong>
        </Card>
        <Card className="metric-card">
          <span className="eyebrow">Prioridad / 100</span>
          <strong className="metric-value">{issue.priorityScore}</strong>
        </Card>
        <Card className="metric-card">
          <span className="eyebrow">Crawls con incidencia</span>
          <strong className="metric-value">{issue.persistenceRuns}</strong>
        </Card>
      </div>
      <section className="section chapter-grid">
        <Card className="chapter-card">
          <h2>Alcance</h2>
          <div className="info-box" style={{ marginTop: 20 }}>
            <small>Plantilla</small>
            <strong>{issue.template}</strong>
          </div>
          <div className="info-box" style={{ marginTop: 16 }}>
            <small>Tráfico potencialmente afectado</small>
            <strong>
              {issue.trafficAtRisk.toLocaleString("es-ES")} impresiones o
              sesiones
            </strong>
          </div>
          <div className="info-box" style={{ marginTop: 16 }}>
            <small>Esfuerzo estimado</small>
            <strong>{issue.effort}</strong>
          </div>
        </Card>
        <Card className="chapter-card">
          <h2>URL de muestra</h2>
          <p style={{ overflowWrap: "anywhere", marginTop: 20 }}>
            {issue.sampleUrl}
          </p>
          <details style={{ marginTop: 24 }}>
            <summary className="section-link">Criterio de cierre</summary>
            <p>
              Incidencia ausente del crawl y muestra validada en dos
              comprobaciones.
            </p>
          </details>
        </Card>
      </section>
    </PageFrame>
  );
}
