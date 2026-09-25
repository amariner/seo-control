import Link from "next/link";
import { Badge, Card, EmptyState, Notice } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { LegacyNotice } from "@/components/legacy-notice";
import { getDashboard, parseFilters } from "@/lib/data";

const tones = {
  resultado: "good",
  riesgo: "bad",
  oportunidad: "info",
  diagnostico: "neutral",
  calidad: "warn",
} as const;

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const input = await searchParams;
  const data = await getDashboard(parseFilters(input));
  return (
    <PageFrame
      eyebrow="Análisis archivados"
      title="Evidencias"
      description="Fuentes vinculadas y análisis archivados."
      generatedAt={data.generatedAt}
    >
      <LegacyNotice from={input.from} />
      {data.mode === "synthetic" ? (
        <Notice tone="info">
          Evidencias de ejemplo. Datos sintéticos de validación.
        </Notice>
      ) : null}
      {data.executiveInsights.length === 0 ? (
        <EmptyState title="Sin evidencias archivadas para estos filtros">
          <Link className="ds-evidence" href="/projects">
            Consultar los datos de un proyecto
          </Link>
        </EmptyState>
      ) : null}
      {data.executiveInsights.map((insight) => (
        <Card className="insight-detail" id={insight.id} key={insight.id}>
          <div className="insight-detail-head">
            <div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <Badge tone={tones[insight.category]}>{insight.category}</Badge>
                <Badge tone={insight.confidence === "alta" ? "good" : "warn"}>
                  confianza {insight.confidence}
                </Badge>
                <Badge>{insight.status}</Badge>
              </div>
              <h2>{insight.title}</h2>
            </div>
            <span className="cell-secondary">
              {insight.project ?? "Conjunto"}
              <br />
              {insight.updatedAt}
            </span>
          </div>
          <div className="evidence-list">
            {insight.evidence.map((item) => (
              <Link className="evidence-chip" href={item.href} key={item.id}>
                <b>{item.source.toUpperCase()}</b> · {item.label}: {item.value}
              </Link>
            ))}
          </div>
          <details style={{ marginTop: 20 }}>
            <summary className="section-link">
              Consultar análisis archivado
            </summary>
            <p style={{ marginTop: 16 }}>{insight.executiveSummary}</p>
            <p>{insight.technicalExplanation}</p>
            <p>
              <strong>
                {insight.causeType === "demostrada"
                  ? "Causa demostrada"
                  : insight.causeType === "hipotesis"
                    ? "Hipótesis"
                    : "Causa no determinada"}
                :
              </strong>{" "}
              {insight.cause}
            </p>
            <p>
              <strong>Confianza:</strong> {insight.confidenceReason}
            </p>
            <div className="insight-grid">
              <div className="info-box">
                <small>Recomendación archivada</small>
                <strong>{insight.recommendation}</strong>
              </div>
              <div className="info-box">
                <small>Responsable sugerido</small>
                <strong>{insight.suggestedOwner}</strong>
              </div>
              <div className="info-box">
                <small>Criterio de éxito</small>
                <strong>{insight.successCriterion}</strong>
              </div>
            </div>
          </details>
          <EditorialBacklinks kind="insight" id={insight.id} level="detail" />
        </Card>
      ))}
    </PageFrame>
  );
}
