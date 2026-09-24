import { Badge, Card } from "@seo/ui";
import { ReportDataTable } from "@seo/ui/data-table";
import { PageFrame } from "@/components/page-frame";
import { getDashboard, parseFilters } from "@/lib/data";

const number = (value: number | null | undefined) =>
  value?.toLocaleString("es-ES", {
    useGrouping: "always" as unknown as boolean,
  }) ?? "—";

export default async function DataPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const data = await getDashboard(parseFilters(await searchParams));
  return (
    <PageFrame
      eyebrow="Trazabilidad"
      title="Fuentes y calidad"
      description="Cobertura, fechas de corte y disponibilidad de los datos."
      generatedAt={data.generatedAt}
    >
      <section aria-labelledby="fuentes">
        <div className="section-heading">
          <h2 id="fuentes">Fuentes</h2>
          <span className="result-count">{data.sources.length} fuentes</span>
        </div>
        <div className="source-grid">
          {data.sources.map((source) => (
            <Card className="source-card" key={source.source}>
              <div className="source-head">
                <h3>{source.label}</h3>
                <Badge
                  tone={
                    source.status === "correcto"
                      ? "good"
                      : source.status === "parcial"
                        ? "warn"
                        : "bad"
                  }
                >
                  {source.status}
                </Badge>
              </div>
              <div className="geo-score" style={{ margin: "24px 0 16px" }}>
                <strong style={{ fontSize: 32 }}>
                  {Math.round(source.coverage * 100)}%
                </strong>
                <span>
                  cobertura
                  <br />
                  corte {source.cutoff ?? "—"}
                </span>
              </div>
              <p>{source.note}</p>
              <div className="source-meta">
                <span>Último dato válido</span>
                <span>
                  {source.lastValidSnapshot
                    ? new Date(source.lastValidSnapshot).toLocaleString(
                        "es-ES",
                        { dateStyle: "short", timeStyle: "short" },
                      )
                    : "—"}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="serie-sesiones">
        <div className="section-heading">
          <h2 id="serie-sesiones">Sesiones por día</h2>
        </div>
        <ReportDataTable
          id="daily-sessions"
          caption="Sesiones orgánicas por día"
          searchPlaceholder="Buscar fecha…"
          columns={[
            { key: "date", label: "Fecha" },
            { key: "current", label: "Sesiones", numeric: true },
            { key: "year", label: "Año anterior", numeric: true },
            { key: "lower", label: "Banda inferior", numeric: true },
            { key: "upper", label: "Banda superior", numeric: true },
          ]}
          rows={(data.series.organic_sessions ?? []).map((point) => ({
            id: point.date,
            searchText: point.date,
            values: {
              date: point.date,
              current: point.value,
              year: point.previousYear ?? null,
              lower: point.lowerBand ?? null,
              upper: point.upperBand ?? null,
            },
            cells: {
              current: number(point.value),
              year: number(point.previousYear),
              lower: number(point.lowerBand),
              upper: number(point.upperBand),
            },
          }))}
        />
      </section>
      <details className="section">
        <summary className="section-link">Metodología y conservación</summary>
        <div className="chapter-grid" style={{ marginTop: 20 }}>
          <Card className="chapter-card">
            <h2>Retención</h2>
            <ul className="bullet-list">
              <li>Series diarias: 24 meses.</li>
              <li>Detalle semanal: hasta 500 filas por segmento.</li>
              <li>Respuestas de API: sin persistencia.</li>
              <li>Crawls: 12 meses, solo en local.</li>
            </ul>
          </Card>
          <Card className="chapter-card">
            <h2>Score global</h2>
            <ul className="bullet-list">
              <li>Negocio: 40%.</li>
              <li>Visibilidad: 30%.</li>
              <li>Técnica: 30%.</li>
              <li>Sin las tres dimensiones, no se calcula.</li>
            </ul>
          </Card>
        </div>
      </details>
    </PageFrame>
  );
}
