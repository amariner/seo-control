import Link from "next/link";
import { Badge, Card } from "@seo/ui";
import { Download, FileText } from "lucide-react";
import { PageFrame } from "@/components/page-frame";
import { getDashboard, parseFilters } from "@/lib/data";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const data = await getDashboard(parseFilters(await searchParams));
  return <PageFrame eyebrow="Publicaciones" title="Informes aprobados" description="Cierres mensuales, revisiones trimestrales e informes especiales. Las versiones publicadas son inmutables y cualquier corrección genera una nueva versión con fe de erratas." generatedAt={data.generatedAt}>
    <div className="two-col">{data.reports.map((report) => <Card className="subpage-card" key={report.id}><div className="insight-detail-head"><FileText size={21} aria-hidden /><Badge tone={report.status === "publicado" ? "good" : "warn"}>{report.status}</Badge></div><p className="eyebrow" style={{ marginTop: 22 }}>{report.type} · {report.period}</p><h2>{report.title}</h2><p className="lede">{report.executiveSummary}</p><div className="insight-grid"><div className="info-box"><small>Versión</small><strong>v{report.version}</strong></div><div className="info-box"><small>Autor</small><strong>{report.author}</strong></div><div className="info-box"><small>Revisor</small><strong>{report.reviewer ?? "Pendiente"}</strong></div></div><div style={{ display: "flex", gap: 8, marginTop: 18 }}><Link className="button" href={`/reports/${report.id}`}>Leer informe</Link>{report.status === "publicado" ? <Link className="button" href={`/api/v1/exports/${report.id}.csv`}><Download size={13} style={{ verticalAlign: -2, marginRight: 5 }} />CSV</Link> : null}</div></Card>)}</div>
  </PageFrame>;
}
