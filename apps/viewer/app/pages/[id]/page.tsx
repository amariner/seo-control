import { notFound } from "next/navigation";
import { Badge, Card, Notice } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getDashboard } from "@/lib/data";

export default async function PageDetail({
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
  const page = data.opportunities.find((item) => item.id === id);
  if (!page) notFound();
  const number = (value: number) =>
    value.toLocaleString("es-ES", {
      useGrouping: "always" as unknown as boolean,
    });
  return (
    <PageFrame
      eyebrow={`${page.project} · ${page.type}`}
      title={page.title}
      description={page.url}
      generatedAt={data.generatedAt}
      aside={
        <Badge tone={page.status === "decay" ? "warn" : "info"}>
          {page.status}
        </Badge>
      }
    >
      {data.mode === "synthetic" ? (
        <Notice tone="info">Datos sintéticos de validación.</Notice>
      ) : null}
      <div className="kpi-grid">
        {[
          ["Clics", number(page.clicks)],
          ["Impresiones", number(page.impressions)],
          ["Posición", number(page.position)],
          ["CTR", `${number(page.ctr)}%`],
          ["CTR de referencia", `${number(page.expectedCtr)}%`],
          ["Conversiones", number(page.conversions)],
        ].map(([label, value]) => (
          <Card className="metric-card" key={label}>
            <span className="eyebrow">{label}</span>
            <strong className="metric-value">{value}</strong>
          </Card>
        ))}
      </div>
      <section className="section" aria-labelledby="fuentes-url">
        <div className="section-heading">
          <h2 id="fuentes-url">Fuentes y alcance</h2>
        </div>
        <Card className="chapter-card">
          <ul className="bullet-list">
            <li>
              {data.mode === "synthetic"
                ? "Muestra sintética de 28 días."
                : "Search Console: clics, impresiones, posición y CTR de 28 días."}
            </li>
            <li>
              CTR de referencia: curva del sitio para la posición de la URL.
            </li>
            <li>
              {data.mode === "synthetic"
                ? "Conversiones de ejemplo, sin medición real."
                : "Conversiones: eventos clave de GA4 con esta URL como entrada orgánica."}
            </li>
          </ul>
        </Card>
      </section>
      <EditorialBacklinks kind="page" id={page.id} />
    </PageFrame>
  );
}
