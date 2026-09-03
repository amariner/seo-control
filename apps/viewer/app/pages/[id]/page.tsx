import { notFound } from "next/navigation";
import { Badge, Card } from "@seo/ui";
import { PageFrame } from "@/components/page-frame";
import { EditorialBacklinks } from "@/components/editorial/backlinks";
import { getDashboard } from "@/lib/data";

export default async function PageDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getDashboard({ project: "all", market: "all", period: "28d" });
  const page = data.opportunities.find((item) => item.id === id);
  if (!page) notFound();
  return <PageFrame eyebrow={`${page.project} · ${page.type}`} title={page.title} description={page.url} generatedAt={data.generatedAt} aside={<Badge tone={page.status === "decay" ? "warn" : "info"}>{page.status}</Badge>}>
    <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>{[["Clics", page.clicks.toLocaleString("es-ES")], ["Impresiones", page.impressions.toLocaleString("es-ES")], ["Posición", page.position], ["CTR", `${page.ctr}%`], ["CTR esperado", `${page.expectedCtr}%`], ["Conversiones", page.conversions]].map(([label, value]) => <Card className="metric-card" key={String(label)}><span className="eyebrow">{label}</span><strong className="metric-value">{value}</strong></Card>)}</div>
    <section className="section chapter-grid"><Card className="chapter-card"><p className="eyebrow">Diagnóstico</p><h2>Margen de captación</h2><p>La URL combina volumen suficiente, posición accionable y un CTR por debajo de la curva esperada de su segmento. La oportunidad no equivale a una previsión garantizada.</p></Card><Card className="chapter-card"><p className="eyebrow">Relaciones</p><h2>Evidencia conectada</h2><ul className="bullet-list"><li>Cluster comercial principal.</li><li>Queries non-branded en posiciones 2–6.</li><li>Acción editorial o de snippet asociada.</li><li>Histórico de cambios y anotaciones.</li></ul></Card></section>
    <EditorialBacklinks kind="page" id={page.id} />
  </PageFrame>;
}
