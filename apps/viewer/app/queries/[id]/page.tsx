import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card, Notice } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getDashboard } from "@/lib/data";
import { editorialBacklinks } from "@/lib/editorial";

export default async function QueryDetail({
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
  const insight = data.executiveInsights.find((item) =>
    item.evidence.some((evidence) => evidence.href.endsWith(`/queries/${id}`)),
  );
  const pieces = editorialBacklinks("query", id);
  if (!insight && pieces.length === 0) notFound();
  const evidence =
    insight?.evidence.find((item) => item.href.endsWith(`/queries/${id}`)) ??
    null;

  return (
    <PageFrame
      eyebrow="Keyword"
      title={id.replaceAll("-", " ")}
      description="Evidencia de origen y piezas editoriales vinculadas."
      generatedAt={data.generatedAt}
      aside={<Badge tone="warn">Sin serie propia</Badge>}
    >
      <Notice tone="info">
        Esta ficha no incorpora una serie histórica.
        {data.mode === "synthetic" && evidence
          ? " La evidencia analítica es sintética; los vínculos editoriales son curados."
          : " Consulta la medición en el informe del proyecto."}
      </Notice>
      {evidence ? (
        <section className="section">
          <div className="section-heading">
            <h2>{evidence.label}</h2>
          </div>
          <Card className="backlinks-card">
            <div className="detail-grid" style={{ margin: 0 }}>
              <div className="info-box">
                <small>Valor</small>
                <strong>{evidence.value}</strong>
              </div>
              <div className="info-box">
                <small>Fuente</small>
                <strong>{evidence.source.toUpperCase()}</strong>
              </div>
              <div className="info-box">
                <small>Identificador</small>
                <strong>
                  <code>{id}</code>
                </strong>
              </div>
            </div>
          </Card>
        </section>
      ) : null}
      {insight ? (
        <p className="provenance" style={{ marginTop: 24 }}>
          <span>Evidencia registrada el {insight.updatedAt}</span>
          <Link className="ds-evidence" href={`/insights#${insight.id}`}>
            Ver registro de origen
          </Link>
        </p>
      ) : null}
      <EditorialBacklinks kind="query" id={id} />
    </PageFrame>
  );
}
